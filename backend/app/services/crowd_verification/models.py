from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from app.services.crowd_verification.config import CONFIDENCE_CONFIG

class RawReportInput(BaseModel):
    id: Optional[str] = None
    text: str
    reporter_id: str
    timestamp: Optional[str] = None

class StructuredReport(BaseModel):
    """
    Exact schema specified by prompt:
    {station, line, severity (low|medium|high), issue_type, reported_time}
    Fields that cannot be determined must be null. Never guess.
    Values outside the enums or outside known lines are rejected / set to null.
    """
    station: Optional[str] = None
    line: Optional[str] = None
    severity: Optional[Literal["low", "medium", "high"]] = None
    issue_type: Optional[str] = None
    reported_time: Optional[str] = None

    @field_validator("line")
    @classmethod
    def validate_known_line(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        allowed = CONFIDENCE_CONFIG["allowed_lines"]
        # Match case-insensitively to exact canonical line name
        for line_name in allowed:
            if v.strip().lower() == line_name.lower():
                return line_name
        # Reject values outside known lines
        return None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip().lower()
        if v_clean in CONFIDENCE_CONFIG["allowed_severities"]:
            return v_clean
        return None

class DroppedReport(BaseModel):
    id: str
    reason: str

class ScoreBreakdown(BaseModel):
    independent_sources: int
    avg_reliability: float
    newest_report_age_min: float
    official_match: int
    count_term: float
    reliability_term: float
    freshness_term: float
    official_term: float

class VerifiedClusterResult(BaseModel):
    cluster_id: str
    line: str
    station: str
    action: Literal["offer_reroute", "warn_only", "ignore"]
    score: float
    breakdown: ScoreBreakdown
    dropped_reports: List[DroppedReport] = []

class VerificationBatchResponse(BaseModel):
    clusters: List[VerifiedClusterResult]
    dropped_reports: List[DroppedReport]
