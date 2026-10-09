from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, func
from app.core.database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(String(64), primary_key=True, index=True) # e.g. 'orig', 'alt', 'cab'
    label = Column(String(255), nullable=False)           # e.g. 'Green Line Bus (Recommended)'
    mode = Column(String(32), nullable=False)             # 'metro', 'bus', 'cab'
    duration = Column(Integer, nullable=False)            # in minutes
    fare = Column(Float, nullable=False)                  # in INR (₹)
    walk_m = Column(Integer, default=0, nullable=False)   # walking meters
    transfers = Column(Integer, default=0, nullable=False)# transfer count
    accessible = Column(Boolean, default=True, nullable=False)
    step_free = Column(Boolean, default=True, nullable=False)
    ramp = Column(Boolean, default=False, nullable=False)
    risk = Column(String(16), default="LOW", nullable=False) # 'LOW', 'MED', 'HIGH'
    co2 = Column(Float, default=0.0, nullable=False)         # kg CO2
    origin = Column(String(128), default="Parkway Interchange", nullable=False)
    destination = Column(String(128), default="Metro South", nullable=False)
    
    # Coordinates array: [[19.1197, 72.8468], [19.0990, 72.8600], ...]
    path = Column(JSON, nullable=False)
    # Disrupted coordinates (if any)
    disrupted_path = Column(JSON, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def to_frontend_format(self):
        """Matches the exact shape expected by Vektor React components."""
        return {
            "id": self.id,
            "label": self.label,
            "mode": self.mode,
            "duration": self.duration,
            "fare": self.fare,
            "walkM": self.walk_m,
            "transfers": self.transfers,
            "accessible": self.accessible,
            "stepFree": self.step_free,
            "ramp": self.ramp,
            "risk": self.risk,
            "co2": self.co2,
            "path": self.path,
            "disruptedPath": self.disrupted_path,
        }
