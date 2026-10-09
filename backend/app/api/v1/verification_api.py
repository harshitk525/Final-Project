import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException
from app.services.crowd_verification.models import (
    RawReportInput,
    VerifiedClusterResult,
    VerificationBatchResponse,
)
from app.services.crowd_verification.pipeline import pipeline
from app.services.crowd_verification.config import REPORTS_PATH
from app.services.crowd_verification.database import get_reporter_reliability, is_spammer

router = APIRouter(prefix="/api/v1/crowd", tags=["Crowd Report Verification Pipeline"])

@router.post("/verify-report", response_model=VerifiedClusterResult, summary="Verify a single crowd report")
def verify_single_report(report: RawReportInput):
    """
    Executes the 4-step pipeline:
    1. Structure (LLM schema + Pydantic validation with regex fallback)
    2. Plausibility check against stations.json / lines.json
    3. Reliability weighting and duplicate/spam clustering
    4. Deterministic confidence scoring
    """
    return pipeline.verify_report(report)

@router.post("/verify-batch", response_model=VerificationBatchResponse, summary="Verify a batch of raw reports with clustering")
def verify_batch_reports(reports: List[RawReportInput]):
    """
    Verifies and clusters an arbitrary list of reports.
    """
    return pipeline.verify_batch(reports)

@router.get("/run-simulated-batch", response_model=VerificationBatchResponse, summary="Run the ~40 simulated Mumbai reports from reports.json")
def run_simulated_batch():
    """
    Processes all 40 messy simulated reports from backend/data/reports.json:
    Filters factually impossible reports, drops spammers, clusters by same line <= 500m <= 15m,
    and returns cluster confidence scores with reasons for dropped reports.
    """
    if not REPORTS_PATH.exists():
        raise HTTPException(status_code=404, detail="reports.json not found in backend/data")

    with open(REPORTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_inputs = [
        RawReportInput(
            id=item.get("id"),
            text=item.get("text", ""),
            reporter_id=item.get("reporter_id", "anon"),
            timestamp=item.get("timestamp"),
        )
        for item in data
    ]

    # Reference evaluation time (set to 11:45 AM of that day so reports are fresh)
    ref_time = datetime.fromisoformat("2026-10-09T11:45:00+05:30")
    return pipeline.verify_batch(raw_inputs, ref_time=ref_time)

@router.get("/reporters/{reporter_id}", summary="Get reporter reliability stats from SQLite")
def get_reporter_info(reporter_id: str):
    """
    Returns reporter reliability from SQLite table reporters:
    reliability = (confirmed + 1) / (total + 2)
    """
    rel = get_reporter_reliability(reporter_id)
    spammer_flag, _, total = is_spammer(reporter_id)
    return {
        "reporter_id": reporter_id,
        "reliability": round(rel, 4),
        "is_spammer": spammer_flag,
        "total_reports": total,
    }
