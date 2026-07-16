from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import engine, get_db, Base
from models import Target, Opportunity
from schemas import DashboardStats
import models  # noqa: F401 – ensure all models are registered before create_all
from routers import targets, opportunities, observations
import seed_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_data.seed(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(
    title="CacaPassagem API",
    description="Flight Deal Hunter — mock data backend",
    version="0.1.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(targets.router)
app.include_router(opportunities.router)
app.include_router(observations.router)

# ─── Dashboard stats ──────────────────────────────────────────────────────────


@app.get("/api/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total_targets = db.query(Target).filter(Target.active == True).count()

    active_opps = (
        db.query(Opportunity)
        .filter(Opportunity.is_dismissed == False, Opportunity.expiry_status != "expired")
        .all()
    )
    active_count = len(active_opps)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    mistake_fares_today = (
        db.query(Opportunity)
        .filter(
            Opportunity.strength == "mistake_fare",
            Opportunity.detected_at >= today_start,
            Opportunity.is_dismissed == False,
        )
        .count()
    )

    best_opp = (
        db.query(Opportunity)
        .filter(Opportunity.is_dismissed == False, Opportunity.expiry_status != "expired")
        .order_by(Opportunity.pct_below_baseline.desc())
        .first()
    )

    best_deal = None
    best_deal_pct = None
    if best_opp:
        cabin_label = {"economy": "Economy", "business": "Business", "first": "Primeira", "premium": "Premium"}.get(
            best_opp.cabin, best_opp.cabin.capitalize()
        )
        best_deal = f"{best_opp.origin}→{best_opp.destination} {cabin_label} -{best_opp.pct_below_baseline:.0f}%"
        best_deal_pct = best_opp.pct_below_baseline

    return DashboardStats(
        total_targets=total_targets,
        active_opportunities=active_count,
        mistake_fares_today=mistake_fares_today,
        best_deal=best_deal,
        best_deal_pct=best_deal_pct,
    )


# ─── Health check ─────────────────────────────────────────────────────────────


@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
