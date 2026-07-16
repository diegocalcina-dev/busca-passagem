from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Target schemas ───────────────────────────────────────────────────────────

class TargetCreate(BaseModel):
    name: str
    origins: List[str]
    destination: str
    one_way: bool = False
    date_from: str
    date_to: str
    stay_min: int = 3
    stay_max: int = 21
    cabins: List[str] = ["economy"]
    max_stops: int = 1
    passengers: int = 1
    currencies: List[str] = ["BRL"]
    price_ceiling: Optional[float] = None
    active: bool = True


class TargetUpdate(BaseModel):
    name: Optional[str] = None
    origins: Optional[List[str]] = None
    destination: Optional[str] = None
    one_way: Optional[bool] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    stay_min: Optional[int] = None
    stay_max: Optional[int] = None
    cabins: Optional[List[str]] = None
    max_stops: Optional[int] = None
    passengers: Optional[int] = None
    currencies: Optional[List[str]] = None
    price_ceiling: Optional[float] = None
    active: Optional[bool] = None


class TargetResponse(BaseModel):
    id: int
    name: str
    origins: str
    destination: str
    one_way: bool
    date_from: str
    date_to: str
    stay_min: int
    stay_max: int
    cabins: str
    max_stops: int
    passengers: int
    currencies: str
    price_ceiling: Optional[float]
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── PriceObservation schemas ─────────────────────────────────────────────────

class PriceObservationResponse(BaseModel):
    id: int
    target_id: int
    origin: str
    destination: str
    price: float
    currency: str
    cabin: str
    airline: str
    stops: int
    departure_at: str
    return_at: Optional[str]
    source: str
    expires_at: Optional[str]
    price_per_km: Optional[float]
    collected_at: datetime

    model_config = {"from_attributes": True}


class PriceHistoryPoint(BaseModel):
    date: str
    price: float
    airline: str
    cabin: str


# ─── Baseline schemas ─────────────────────────────────────────────────────────

class BaselineResponse(BaseModel):
    id: int
    route_key: str
    window_days: int
    median: float
    p25: float
    p10: float
    min_price: float
    median_price_per_km: Optional[float]
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Opportunity schemas ──────────────────────────────────────────────────────

class OpportunityResponse(BaseModel):
    id: int
    observation_id: int
    target_id: int
    origin: str
    destination: str
    price: float
    currency: str
    cabin: str
    airline: str
    departure_at: str
    return_at: Optional[str]
    pct_below_baseline: float
    strength: str
    confirmed_live: bool
    expiry_status: str
    buy_link: str
    detected_at: datetime
    is_dismissed: bool
    baseline_price: Optional[float] = None

    model_config = {"from_attributes": True}


# ─── Dashboard schemas ────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_targets: int
    active_opportunities: int
    mistake_fares_today: int
    best_deal: Optional[str]
    best_deal_pct: Optional[float]
