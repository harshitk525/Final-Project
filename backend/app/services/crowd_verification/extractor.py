import json
import re
import os
import logging
from typing import Optional, Dict, Any, List, Callable
from app.services.crowd_verification.config import STATIONS_PATH, LINES_PATH
from app.services.crowd_verification.models import StructuredReport

logger = logging.getLogger("vektor.crowd_verification.extractor")

_STATIONS_CACHE: Optional[List[Dict[str, Any]]] = None
_LINES_CACHE: Optional[Dict[str, List[str]]] = None

def get_stations() -> List[Dict[str, Any]]:
    global _STATIONS_CACHE
    if _STATIONS_CACHE is None:
        if STATIONS_PATH.exists():
            with open(STATIONS_PATH, "r", encoding="utf-8") as f:
                _STATIONS_CACHE = json.load(f)
        else:
            _STATIONS_CACHE = []
    return _STATIONS_CACHE

def get_lines() -> Dict[str, List[str]]:
    global _LINES_CACHE
    if _LINES_CACHE is None:
        if LINES_PATH.exists():
            with open(LINES_PATH, "r", encoding="utf-8") as f:
                _LINES_CACHE = json.load(f)
        else:
            _LINES_CACHE = {}
    return _LINES_CACHE

def extract_with_regex_fallback(text: str, reported_time: Optional[str] = None) -> StructuredReport:
    """
    Deterministic regex and keyword extractor.
    Uses stations.json aliases and transit line patterns.
    Hard rule: Fields that cannot be found must be null. Never guess.
    """
    stations = get_stations()
    text_lower = text.lower()

    # 1. Match station using aliases (longest alias first to prevent sub-string overlap)
    detected_station: Optional[str] = None
    all_alias_matches = []

    for stn in stations:
        aliases = stn.get("aliases", [stn["name"]])
        for alias in aliases:
            # Word boundary regex matching
            escaped_alias = re.escape(alias.lower())
            pattern = rf"(?:\b|\s|^){escaped_alias}(?:\b|\s|$)"
            if re.search(pattern, text_lower):
                all_alias_matches.append((len(alias), stn["name"]))

    if all_alias_matches:
        # Sort by longest alias matched
        all_alias_matches.sort(key=lambda x: x[0], reverse=True)
        detected_station = all_alias_matches[0][1]

    # 2. Match Transit Line
    detected_line: Optional[str] = None
    line_patterns = [
        (r"\bmetro\s*(?:line\s*1|1)?\b", "Metro Line 1"),
        (r"\bwestern\s*(?:line)?\b|\bwr\b", "Western Line"),
        (r"\bcentral\s*(?:line)?\b|\bcr\b", "Central Line"),
        (r"\bharbour\s*(?:line)?\b|\bhr\b", "Harbour Line"),
    ]

    for pat, canonical_line in line_patterns:
        if re.search(pat, text_lower):
            detected_line = canonical_line
            break

    # 3. Match Severity (low | medium | high)
    detected_severity: Optional[str] = None
    high_pat = r"\b(huge|stampede|fully packed|jammed|cancelled|cancel|broken|blast|emergency|danger|halted|stalled|severe)\b"
    med_pat = r"\b(slow|delay|delayed|delays|bheed|rush|crowd|waterlogging|pani|stuck|escalator off|lift bandh|10 min|15 min|20 min|packing)\b"
    low_pat = r"\b(minor|normal|on time|clear|smooth|running smoothly)\b"

    if re.search(high_pat, text_lower):
        detected_severity = "high"
    elif re.search(med_pat, text_lower):
        detected_severity = "medium"
    elif re.search(low_pat, text_lower):
        detected_severity = "low"

    # 4. Match Issue Type
    detected_issue: Optional[str] = None
    if re.search(r"\b(lift|elevator|escalator|wheelchair|ramp)\b", text_lower):
        detected_issue = "Elevator / Accessibility Outage"
    elif re.search(r"\b(signal|wire|pantograph|spark)\b", text_lower):
        detected_issue = "Signal / Power Failure"
    elif re.search(r"\b(waterlogging|pani|water)\b", text_lower):
        detected_issue = "Waterlogging"
    elif re.search(r"\b(track|packing|crossover|derail)\b", text_lower):
        detected_issue = "Track Maintenance"
    elif re.search(r"\b(cancel|cancelled)\b", text_lower):
        detected_issue = "Trip Cancellation"
    elif re.search(r"\b(bheed|rush|crowd|jammed|stampede|packed)\b", text_lower):
        detected_issue = "Platform Overcrowding"
    elif detected_severity:
        detected_issue = "Transit Delay"

    return StructuredReport(
        station=detected_station,
        line=detected_line,
        severity=detected_severity,
        issue_type=detected_issue,
        reported_time=reported_time,
    )

def call_gemini_json_extractor(text: str) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini 1.5 Flash in structured JSON mode if GEMINI_API_KEY is configured.
    Falls back gracefully to None if key is absent or request fails.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key or len(gemini_key.strip()) < 10 or gemini_key.startswith("AQ."):
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key.strip()}"
        prompt = (
            "You are a transit extraction system for Mumbai. Extract structured JSON from this raw commuter report:\n"
            f"\"{text}\"\n\n"
            "Output strictly a JSON object with these exact keys:\n"
            "{\n"
            "  \"station\": \"Exact canonical Mumbai Station Name or null\",\n"
            "  \"line\": \"Western Line\" | \"Central Line\" | \"Harbour Line\" | \"Metro Line 1\" | null,\n"
            "  \"severity\": \"low\" | \"medium\" | \"high\" | null,\n"
            "  \"issue_type\": \"Brief issue description or null\"\n"
            "}\n"
            "Never guess fields. If absent or uncertain, return null. Return only JSON."
        )
        import urllib.request
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            candidate = res_data.get("candidates", [])[0]["content"]["parts"][0]["text"]
            return json.loads(candidate)
    except Exception as exc:
        logger.debug(f"Gemini API call failed: {exc}")
        return None

def extract_report(
    text: str,
    reported_time: Optional[str] = None,
    llm_callable: Optional[Callable[[str], Dict[str, Any]]] = None,
) -> StructuredReport:
    """
    Pipeline Step 1: STRUCTURE (LLM + Pydantic)
    - If LLM callable is provided, call LLM with exact schema:
      {station, line, severity (low|medium|high), issue_type, reported_time}
    - Validate with Pydantic model. Reject values outside enums or outside known lines.
    - Fields LLM cannot find must be null. Never let it guess.
    - If no callable provided, attempts live Gemini API if GEMINI_API_KEY is configured.
    - On any failure, uses the regex fallback extractor with station aliases.
    """
    # 1. User-provided LLM callable
    if llm_callable is not None:
        try:
            raw_dict = llm_callable(text)
            if isinstance(raw_dict, dict):
                if not raw_dict.get("reported_time") and reported_time:
                    raw_dict["reported_time"] = reported_time
                return StructuredReport(**raw_dict)
        except Exception as exc:
            logger.warning(f"LLM extraction failed or returned invalid schema ({exc}). Falling back to regex.")

    # 2. Live Gemini API extraction (if active key present)
    gemini_dict = call_gemini_json_extractor(text)
    if gemini_dict and isinstance(gemini_dict, dict):
        try:
            if not gemini_dict.get("reported_time") and reported_time:
                gemini_dict["reported_time"] = reported_time
            return StructuredReport(**gemini_dict)
        except Exception as exc:
            logger.warning(f"Gemini returned invalid schema ({exc}). Falling back to regex.")

    # 3. Deterministic Regex fallback extractor
    return extract_with_regex_fallback(text, reported_time)

