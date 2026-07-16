from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    origins = Column(Text, nullable=False)       # JSON array: ["GRU", "CGH"]
    destination = Column(String, nullable=False)  # IATA or "ANY"
    one_way = Column(Boolean, default=False)
    date_from = Column(String, nullable=False)   # "2026-08-01"
    date_to = Column(String, nullable=False)     # "2026-12-31"
    stay_min = Column(Integer, default=3)
    stay_max = Column(Integer, default=21)
    cabins = Column(Text, nullable=False)        # JSON array: ["economy"]
    max_stops = Column(Integer, default=1)
    passengers = Column(Integer, default=1)
    currencies = Column(Text, nullable=False)    # JSON array: ["BRL"]
    price_ceiling = Column(Float, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    observations = relationship("PriceObservation", back_populates="target")
    opportunities = relationship("Opportunity", back_populates="target")


class PriceObservation(Base):
    __tablename__ = "price_observations"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("targets.id"), nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="BRL")
    cabin = Column(String, nullable=False)
    airline = Column(String, nullable=False)
    stops = Column(Integer, default=0)
    departure_at = Column(String, nullable=False)
    return_at = Column(String, nullable=True)
    source = Column(String, default="mock")
    expires_at = Column(String, nullable=True)
    price_per_km = Column(Float, nullable=True)
    buy_link = Column(Text, nullable=True)
    collected_at = Column(DateTime, default=datetime.utcnow)

    target = relationship("Target", back_populates="observations")
    opportunity = relationship("Opportunity", back_populates="observation", uselist=False)


class Baseline(Base):
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, index=True)
    route_key = Column(String, unique=True, nullable=False)  # "GRU-LIS-economy"
    window_days = Column(Integer, default=90)
    median = Column(Float, nullable=False)
    p25 = Column(Float, nullable=False)
    p10 = Column(Float, nullable=False)
    min_price = Column(Float, nullable=False)
    median_price_per_km = Column(Float, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("price_observations.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("targets.id"), nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="BRL")
    cabin = Column(String, nullable=False)
    airline = Column(String, nullable=False)
    departure_at = Column(String, nullable=False)
    return_at = Column(String, nullable=True)
    pct_below_baseline = Column(Float, nullable=False)
    strength = Column(String, nullable=False)  # "good", "great", "mistake_fare"
    confirmed_live = Column(Boolean, default=False)
    expiry_status = Column(String, default="unknown")  # "valid", "expired", "unknown"
    buy_link = Column(String, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    is_dismissed = Column(Boolean, default=False)

    observation = relationship("PriceObservation", back_populates="opportunity")
    target = relationship("Target", back_populates="opportunities")
