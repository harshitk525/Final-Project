import uuid
from typing import List, Dict, Any, Optional, Tuple, Callable
from datetime import datetime, timezone

from app.services.crowd_verification.models import (
    RawReportInput,
    StructuredReport,
    DroppedReport,
    ScoreBreakdown,
    VerifiedClusterResult,
    VerificationBatchResponse,
)
from app.services.crowd_verification.extractor import extract_report
from app.services.crowd_verification.plausibility import check_plausibility
from app.services.crowd_verification.database import (
    get_reporter_reliability,
    is_spammer,
    init_reporters_db,
)
from app.services.crowd_verification.clustering import (
    ClusterItem,
    cluster_reports,
    parse_iso_datetime,
)
from app.services.crowd_verification.engine import (
    compute_confidence,
    check_official_alert_match,
)

class VerificationPipeline:
    """
    Executes the 4-step crowd-report verification pipeline in strict order:
    1. STRUCTURE (LLM in JSON mode + Pydantic validation, regex fallback)
    2. PLAUSIBILITY (stations.json / lines.json only)
    3. RELIABILITY AND DUPLICATES (SQLite reporters table, clustering, spammer drop)
    4. CONFIDENCE ENGINE (pure Python deterministic formula)
    """

    def __init__(self):
        init_reporters_db()

    def process_raw_report(
        self,
        raw_report: RawReportInput,
        llm_callable: Optional[Callable[[str], Dict[str, Any]]] = None,
    ) -> Tuple[Optional[ClusterItem], Optional[DroppedReport]]:
        """
        Runs Steps 1 to 3a (structure, plausibility, spam check) for a single raw report.
        """
        report_id = raw_report.id or f"REP-{uuid.uuid4().hex[:6].upper()}"

        # 1. STRUCTURE
        structured: StructuredReport = extract_report(
            text=raw_report.text,
            reported_time=raw_report.timestamp,
            llm_callable=llm_callable,
        )

        # 2. PLAUSIBILITY
        is_valid, drop_reason = check_plausibility(structured)
        if not is_valid:
            return None, DroppedReport(id=report_id, reason=drop_reason or "Plausibility check failed")

        # 3. RELIABILITY & SPAM CHECK
        # Hard rule: "Only drop reporters flagged as spammers (e.g. total >= 10 and reliability < 0.15)."
        spammer_flag, rel, total = is_spammer(raw_report.reporter_id)
        if spammer_flag:
            return None, DroppedReport(
                id=report_id,
                reason=f"Reporter '{raw_report.reporter_id}' dropped as spammer (reliability {rel:.2f} < 0.15 with {total} reports)",
            )

        item = ClusterItem(
            raw_id=report_id,
            reporter_id=raw_report.reporter_id,
            station=structured.station or "Unknown Station",
            line=structured.line or "Unknown Line",
            timestamp_str=raw_report.timestamp or datetime.now(timezone.utc).isoformat(),
            text=raw_report.text,
            issue_type=structured.issue_type,
        )
        return item, None

    def verify_report(
        self,
        raw_report: RawReportInput,
        ref_time: Optional[datetime] = None,
        llm_callable: Optional[Callable[[str], Dict[str, Any]]] = None,
        forced_reliability: Optional[float] = None,
        forced_official_match: Optional[int] = None,
        forced_age_minutes: Optional[float] = None,
    ) -> VerifiedClusterResult:
        """
        Verifies a single report through the full pipeline.
        Supports forced parameters for deterministic unit test validation.
        """
        item, dropped = self.process_raw_report(raw_report, llm_callable=llm_callable)
        
        dropped_list: List[DroppedReport] = []
        if dropped:
            dropped_list.append(dropped)
            # If report was dropped, return cluster result marked as ignored
            return VerifiedClusterResult(
                cluster_id=f"CLUSTER-DROPPED-{raw_report.id or 'X'}",
                line="Unknown",
                station="Unknown",
                action="ignore",
                score=0.0,
                breakdown=ScoreBreakdown(
                    independent_sources=0,
                    avg_reliability=0.0,
                    newest_report_age_min=0.0,
                    official_match=0,
                    count_term=0.0,
                    reliability_term=0.0,
                    freshness_term=0.0,
                    official_term=0.0,
                ),
                dropped_reports=dropped_list,
            )

        assert item is not None
        # 3. RELIABILITY AND DUPLICATES
        rel = forced_reliability if forced_reliability is not None else get_reporter_reliability(item.reporter_id)

        # 4. CONFIDENCE ENGINE
        eval_dt = ref_time or datetime.now(timezone.utc)
        age_min = forced_age_minutes if forced_age_minutes is not None else max((eval_dt - item.dt).total_seconds() / 60.0, 0.0)
        official_match = forced_official_match if forced_official_match is not None else check_official_alert_match(item.line, item.dt)

        conf_res = compute_confidence(
            independent_reporters=1,
            avg_reliability=rel,
            age_minutes=age_min,
            has_official_match=official_match,
        )

        return VerifiedClusterResult(
            cluster_id=f"CLUSTER-{item.line[:3].upper()}-{item.raw_id}",
            line=item.line,
            station=item.station,
            action=conf_res["action"],
            score=conf_res["score"],
            breakdown=conf_res["breakdown"],
            dropped_reports=[],
        )

    def verify_batch(
        self,
        raw_reports: List[RawReportInput],
        ref_time: Optional[datetime] = None,
        llm_callable: Optional[Callable[[str], Dict[str, Any]]] = None,
    ) -> VerificationBatchResponse:
        """
        Runs the full pipeline over a batch of reports:
        1. Structure each report
        2. Filter impossible reports (collect dropped reasons)
        3. Filter spammer reports (collect dropped reasons)
        4. Cluster by same line, <= 500m, <= 15m
        5. Deduplicate multiple reports from same reporter (independent sources = len(set(reporter_ids)))
        6. Compute deterministic confidence score for each cluster
        """
        valid_items: List[ClusterItem] = []
        dropped_reports: List[DroppedReport] = []

        for raw_rep in raw_reports:
            item, dropped = self.process_raw_report(raw_rep, llm_callable=llm_callable)
            if dropped:
                dropped_reports.append(dropped)
            elif item:
                valid_items.append(item)

        # Cluster valid reports
        clusters = cluster_reports(valid_items)
        cluster_results: List[VerifiedClusterResult] = []

        eval_dt = ref_time or datetime.now(timezone.utc)

        for idx, cluster in enumerate(clusters, 1):
            rep_ids: List[str] = [m.reporter_id for m in cluster]
            unique_rep_ids = set(rep_ids)
            independent_sources = len(unique_rep_ids)

            # Average reliability of independent reporters
            avg_rel = sum(get_reporter_reliability(r_id) for r_id in unique_rep_ids) / independent_sources

            # Newest report in cluster for freshness
            newest_item = max(cluster, key=lambda x: x.dt)
            age_min = max((eval_dt - newest_item.dt).total_seconds() / 60.0, 0.0)

            # Official alert match
            official_match = check_official_alert_match(newest_item.line, newest_item.dt)

            # 4. Confidence engine
            conf_res = compute_confidence(
                independent_reporters=independent_sources,
                avg_reliability=avg_rel,
                age_minutes=age_min,
                has_official_match=official_match,
            )

            cluster_id = f"CLUSTER-{newest_item.line[:3].upper()}-{idx:03d}"
            cluster_results.append(
                VerifiedClusterResult(
                    cluster_id=cluster_id,
                    line=newest_item.line,
                    station=newest_item.station,
                    action=conf_res["action"],
                    score=conf_res["score"],
                    breakdown=conf_res["breakdown"],
                    dropped_reports=[],
                )
            )

        return VerificationBatchResponse(
            clusters=cluster_results,
            dropped_reports=dropped_reports,
        )

# Pipeline singleton
pipeline = VerificationPipeline()
