import pytest
import math
from datetime import datetime, timezone
from app.services.crowd_verification.engine import compute_confidence
from app.services.crowd_verification.pipeline import pipeline
from app.services.crowd_verification.models import RawReportInput, StructuredReport
from app.services.crowd_verification.extractor import extract_report, extract_with_regex_fallback
from app.services.crowd_verification.plausibility import check_plausibility
from app.services.crowd_verification.database import get_reporter_reliability, set_reporter_stats

def test_1_report_reliability_03_fresh_no_official():
    """
    Test 1:
    1 report, reliability 0.3, fresh, no official alert -> action = ignore (score about 0.38)
    """
    # Mathematical calculation:
    # count = min(1/3, 1) = 0.333333 -> count_term = 0.30 * (1/3) = 0.10
    # reliability = 0.30 -> rel_term = 0.25 * 0.3 = 0.075
    # freshness = exp(-0/30) = 1.0 -> fresh_term = 0.20 * 1.0 = 0.20
    # official = 0 -> off_term = 0.0
    # score = 0.10 + 0.075 + 0.20 + 0 = 0.375 (~ 0.38)
    res = compute_confidence(
        independent_reporters=1,
        avg_reliability=0.3,
        age_minutes=0.0,
        has_official_match=0,
    )
    assert res["action"] == "ignore"
    assert round(res["score"], 2) == 0.38
    assert res["breakdown"].independent_sources == 1
    assert res["breakdown"].official_match == 0

def test_3_independent_reports_reliability_08_age_5min_no_official():
    """
    Test 2:
    3 independent reports, reliability 0.8, 5 min old, no official alert -> warn_only (about 0.67)
    """
    # count = min(3/3, 1) = 1.0 -> count_term = 0.30 * 1.0 = 0.30
    # reliability = 0.8 -> rel_term = 0.25 * 0.8 = 0.20
    # freshness = exp(-5/30) = 0.84648 -> fresh_term = 0.20 * 0.84648 = 0.1693
    # official = 0 -> off_term = 0.0
    # score = 0.30 + 0.20 + 0.1693 + 0 = 0.6693 (~ 0.67)
    res = compute_confidence(
        independent_reporters=3,
        avg_reliability=0.8,
        age_minutes=5.0,
        has_official_match=0,
    )
    assert res["action"] == "warn_only"
    assert round(res["score"], 2) == 0.67
    assert res["breakdown"].independent_sources == 3
    assert res["breakdown"].official_match == 0

def test_same_plus_matching_official_alert():
    """
    Test 3:
    Same plus matching official alert -> offer_reroute (about 0.92)
    """
    # score = 0.6693 + 0.25 * 1 = 0.9193 (~ 0.92)
    res = compute_confidence(
        independent_reporters=3,
        avg_reliability=0.8,
        age_minutes=5.0,
        has_official_match=1,
    )
    assert res["action"] == "offer_reroute"
    assert round(res["score"], 2) == 0.92
    assert res["breakdown"].official_match == 1

def test_same_reporter_sending_5_reports_counts_as_one():
    """
    Test 4:
    Same reporter sending 5 reports -> independent_sources = 1
    """
    # Seed 5 reports from the SAME reporter within 10 minutes at Dadar on Western Line
    raw_reports = [
        RawReportInput(
            id=f"DUP-{i}",
            reporter_id="commuter_ramesh",
            text="Dadar station platform full jammed on Western Line",
            timestamp=f"2026-10-09T11:0{i}:00+05:30",
        )
        for i in range(1, 6)
    ]
    ref_time = datetime.fromisoformat("2026-10-09T11:15:00+05:30")
    batch_res = pipeline.verify_batch(raw_reports, ref_time=ref_time)

    assert len(batch_res.clusters) == 1
    cluster = batch_res.clusters[0]
    # Despite 5 reports submitted, independent_sources must strictly be 1
    assert cluster.breakdown.independent_sources == 1

def test_station_not_on_stated_line_dropped_with_reason():
    """
    Test 5:
    Station not on the stated line -> report dropped with a reason
    e.g. Churchgate is strictly on Western Line, claiming it's on Central Line must be dropped.
    """
    report = RawReportInput(
        id="IMP-01",
        reporter_id="commuter_test",
        text="Churchgate pe Central Line train cancelled ho gayi",
        timestamp="2026-10-09T11:30:00+05:30",
    )
    res = pipeline.verify_report(report)
    assert len(res.dropped_reports) == 1
    drop = res.dropped_reports[0]
    assert drop.id == "IMP-01"
    assert "not on the 'Central Line'" in drop.reason

def test_llm_failure_falls_back_to_regex_extractor():
    """
    Test 6:
    LLM failure -> regex fallback still returns a valid structured report
    """
    def failing_llm(prompt: str):
        raise RuntimeError("LLM API connection timeout or quota exceeded")

    text = "Bhai Dadar platform 3 pe severe crowd rush hai Western Line local late hai"
    structured = extract_report(text, reported_time="2026-10-09T11:30:00+05:30", llm_callable=failing_llm)

    assert structured.station == "Dadar"
    assert structured.line == "Western Line"
    assert structured.severity in ["medium", "high"]
    assert structured.issue_type is not None

def test_deterministic_scoring_same_input_same_output():
    """
    Test 7:
    Same input always gives the same score (pure deterministic Python).
    """
    scores = []
    for _ in range(50):
        res = compute_confidence(
            independent_reporters=2,
            avg_reliability=0.75,
            age_minutes=12.5,
            has_official_match=1,
        )
        scores.append(res["score"])

    # All 50 runs must yield the identical score
    assert len(set(scores)) == 1
    assert scores[0] == round(
        0.30 * (2 / 3) + 0.25 * 0.75 + 0.20 * math.exp(-12.5 / 30.0) + 0.25 * 1.0, 2
    )
