from sqlalchemy import Column, String, Integer, Float, Boolean, Text, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DisruptionReport(Base):
    __tablename__ = "disruption_reports"

    id = Column(String(64), primary_key=True, index=True) # e.g. 'P-04'
    title = Column(String(255), nullable=False)          # e.g. 'CIVIC RAIL ALERT'
    line = Column(String(128), nullable=False)           # 'Blue Line'
    station = Column(String(128), nullable=False)        # 'Central Station'
    severity = Column(String(32), nullable=False)        # 'Severe', 'Moderate', 'Minor'
    headline = Column(Text, nullable=False)              # 'Crowding at Central Station'
    reported_relative = Column(String(64), default="Just now") # '4 min ago'
    
    # Confidence Engine Metrics (computed via signal heuristics or LLM)
    confidence_score = Column(Float, nullable=False)     # 0.82
    confidence_label = Column(String(64), nullable=False)# 'HIGH CONFIDENCE'
    recommendation = Column(String(64), default="REROUTE RECOMMENDED")
    tone = Column(String(16), default="bad")             # 'bad', 'warn', 'ok'

    # Multi-signal verification details
    signals = Column(JSON, nullable=False) # {"reportCount": 8, "reliability": 0.8, "freshness": 0.75, "official": 0.24}
    sources = Column(JSON, nullable=False) # [{"name": "Crowd reports", "detail": "..."}, ...]

    # Geographic location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    is_active = Column(Boolean, default=True, index=True, nullable=False)
    
    # User who submitted the report (optional)
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter = relationship("User", back_populates="reported_disruptions")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_frontend_format(self):
        """Matches the shape expected by Vektor ActiveJourney and DisruptionDetails."""
        return {
            "id": self.id,
            "title": self.title,
            "line": self.line,
            "station": self.station,
            "severity": self.severity,
            "headline": self.headline,
            "reported": self.reported_relative,
            "signals": self.signals,
            "sources": self.sources,
            "confidence": {
                "score": self.confidence_score,
                "label": self.confidence_label,
                "note": self.recommendation,
                "tone": self.tone,
            },
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
