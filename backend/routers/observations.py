from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models import PriceObservation
from schemas import PriceObservationResponse, PriceHistoryPoint

router = APIRouter(prefix="/api/observations", tags=["observations"])


@router.get("", response_model=List[PriceObservationResponse])
def list_observations(
    target_id: Optional[int] = Query(None),
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(PriceObservation)

    if target_id is not None:
        query = query.filter(PriceObservation.target_id == target_id)
    if origin:
        query = query.filter(PriceObservation.origin == origin.upper())
    if destination:
        query = query.filter(PriceObservation.destination == destination.upper())

    return query.order_by(PriceObservation.collected_at.desc()).limit(limit).all()


@router.get("/history", response_model=List[PriceHistoryPoint])
def get_price_history(
    origin: str = Query(...),
    destination: str = Query(...),
    cabin: str = Query("economy"),
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Return price history for charting. Sorted by date ascending."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(PriceObservation)
        .filter(
            PriceObservation.origin == origin.upper(),
            PriceObservation.destination == destination.upper(),
            PriceObservation.cabin == cabin.lower(),
            PriceObservation.collected_at >= cutoff,
        )
        .order_by(PriceObservation.collected_at.asc())
        .all()
    )

    return [
        PriceHistoryPoint(
            date=row.collected_at.strftime("%Y-%m-%d"),
            price=row.price,
            airline=row.airline,
            cabin=row.cabin,
        )
        for row in rows
    ]
