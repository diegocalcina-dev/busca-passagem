from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Opportunity, Baseline
from schemas import OpportunityResponse

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


def _enrich(opp: Opportunity, db: Session) -> dict:
    """Add baseline_price to the opportunity dict."""
    route_key = f"{opp.origin}-{opp.destination}-{opp.cabin}"
    baseline = db.query(Baseline).filter(Baseline.route_key == route_key).first()
    data = {
        "id": opp.id,
        "observation_id": opp.observation_id,
        "target_id": opp.target_id,
        "origin": opp.origin,
        "destination": opp.destination,
        "price": opp.price,
        "currency": opp.currency,
        "cabin": opp.cabin,
        "airline": opp.airline,
        "departure_at": opp.departure_at,
        "return_at": opp.return_at,
        "pct_below_baseline": opp.pct_below_baseline,
        "strength": opp.strength,
        "confirmed_live": opp.confirmed_live,
        "expiry_status": opp.expiry_status,
        "buy_link": opp.buy_link,
        "detected_at": opp.detected_at,
        "is_dismissed": opp.is_dismissed,
        "baseline_price": baseline.median if baseline else None,
    }
    return data


@router.get("", response_model=List[OpportunityResponse])
def list_opportunities(
    strength: Optional[str] = Query(None, description="Filter by strength: good, great, mistake_fare"),
    confirmed_live: Optional[bool] = Query(None),
    dismissed: Optional[bool] = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Opportunity)

    if dismissed is not None:
        query = query.filter(Opportunity.is_dismissed == dismissed)
    if strength:
        query = query.filter(Opportunity.strength == strength)
    if confirmed_live is not None:
        query = query.filter(Opportunity.confirmed_live == confirmed_live)

    opportunities = query.order_by(Opportunity.pct_below_baseline.desc()).all()
    return [_enrich(o, db) for o in opportunities]


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return _enrich(opp, db)


@router.post("/{opportunity_id}/dismiss", response_model=OpportunityResponse)
def dismiss_opportunity(opportunity_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp.is_dismissed = True
    db.commit()
    db.refresh(opp)
    return _enrich(opp, db)
