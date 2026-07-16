from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import Target, Opportunity
from schemas import DashboardStats, CollectionResult
import models  # noqa: F401 – registra todos os modelos antes do create_all
from routers import targets, opportunities, observations
import seed_data
from engine.scheduler import start_scheduler, stop_scheduler, get_next_run
from engine.collector import run_collection_cycle
from engine.verifier import verify_opportunities


def _migrate(db: Session):
    """Adiciona colunas novas sem quebrar DBs existentes."""
    try:
        db.execute(__import__("sqlalchemy").text(
            "ALTER TABLE price_observations ADD COLUMN buy_link TEXT"
        ))
        db.commit()
    except Exception:
        db.rollback()  # coluna já existe — ok


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        _migrate(db)
        seed_data.seed(db)
    finally:
        db.close()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Caça Passagem da Dani — API",
    description="Motor de detecção de promoções e mistake fares.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        cabin_label = {
            "economy": "Economy", "business": "Business",
            "first": "Primeira", "premium": "Premium",
        }.get(best_opp.cabin, best_opp.cabin.capitalize())
        best_deal = f"{best_opp.origin}→{best_opp.destination} {cabin_label} -{best_opp.pct_below_baseline:.0f}%"
        best_deal_pct = best_opp.pct_below_baseline

    return DashboardStats(
        total_targets=total_targets,
        active_opportunities=len(active_opps),
        mistake_fares_today=mistake_fares_today,
        best_deal=best_deal,
        best_deal_pct=best_deal_pct,
    )


# ─── Coleta manual ────────────────────────────────────────────────────────────

@app.post("/api/collect", response_model=CollectionResult)
def trigger_collection(background_tasks: BackgroundTasks):
    """Dispara um ciclo de coleta manualmente (roda em background)."""
    background_tasks.add_task(run_collection_cycle)
    return CollectionResult(
        started_at=datetime.utcnow().isoformat(),
        sources_used=[],
        observations_saved=0,
        opportunities_detected=0,
        errors=[],
        status="running",
    )


@app.get("/api/collect/status")
def collection_status():
    return {
        "scheduler_running": True,
        "next_run": get_next_run(),
    }


# ─── Verificação ao vivo ──────────────────────────────────────────────────────

@app.post("/api/verify")
def trigger_verify(background_tasks: BackgroundTasks):
    """Verifica oportunidades pendentes via Travelpayouts /latest (gratuito)."""
    background_tasks.add_task(verify_opportunities)
    return {"status": "running", "started_at": datetime.utcnow().isoformat()}


# ─── Integrations status ──────────────────────────────────────────────────────

@app.get("/api/integrations")
def integrations_status(db: Session = Depends(get_db)):
    import os
    from models import PriceObservation
    from sqlalchemy import func

    # Contagens por fonte
    counts = dict(
        db.query(PriceObservation.source, func.count(PriceObservation.id))
        .group_by(PriceObservation.source)
        .all()
    )

    # Última coleta real
    last_real = (
        db.query(PriceObservation.collected_at)
        .filter(PriceObservation.source != "mock")
        .order_by(PriceObservation.collected_at.desc())
        .first()
    )

    return {
        "providers": {
            "travelpayouts": {
                "label": "Travelpayouts API",
                "description": "Fonte principal — dados Aviasales + verificação via /latest",
                "configured": bool(os.getenv("TRAVELPAYOUTS_TOKEN")),
                "observations": counts.get("travelpayouts", 0),
            },
            "kiwi": {
                "label": "Kiwi Tequila API",
                "description": "Segunda fonte — fares ao vivo, self-transfer, destinos globais",
                "configured": bool(os.getenv("KIWI_API_KEY")),
                "observations": counts.get("kiwi", 0),
            },
        },
        "alerts": {
            "telegram": {
                "label": "Telegram",
                "configured": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
            },
            "email": {
                "label": "E-mail (Gmail)",
                "configured": bool(os.getenv("SMTP_USER")),
            },
        },
        "database": {
            "total_observations": sum(counts.values()),
            "mock_observations": counts.get("mock", 0),
            "real_observations": sum(v for k, v in counts.items() if k != "mock"),
            "last_collection": last_real[0].isoformat() if last_real else None,
            "next_collection": get_next_run(),
        },
    }


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
