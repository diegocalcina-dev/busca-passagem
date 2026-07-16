"""
Motor de detecção de oportunidades.
Calcula baseline (mediana, P10, mínimo) e classifica anomalias de preço.
"""

import os
import statistics
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from models import PriceObservation, Baseline, Opportunity

THRESHOLD_MISTAKE_FARE = float(os.getenv("THRESHOLD_MISTAKE_FARE", "60"))
THRESHOLD_GREAT = float(os.getenv("THRESHOLD_GREAT", "40"))
THRESHOLD_GOOD = float(os.getenv("THRESHOLD_GOOD", "20"))
BASELINE_WINDOW_DAYS = int(os.getenv("BASELINE_WINDOW_DAYS", "90"))


def _percentile(sorted_vals: list, pct: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = max(0, int(len(sorted_vals) * pct / 100) - 1)
    return sorted_vals[idx]


def classify_strength(pct_below: float) -> Optional[str]:
    if pct_below >= THRESHOLD_MISTAKE_FARE:
        return "mistake_fare"
    if pct_below >= THRESHOLD_GREAT:
        return "great"
    if pct_below >= THRESHOLD_GOOD:
        return "good"
    return None


def recalculate_baseline(db: Session, route_key: str) -> Optional[Baseline]:
    """Recalcula mediana, P25, P10 e mínimo para uma rota.
    route_key: "GRU-LIS-economy-BRL"
    """
    parts = route_key.split("-", 3)
    if len(parts) != 4:
        return None
    origin, destination, cabin, currency = parts

    since = datetime.utcnow() - timedelta(days=BASELINE_WINDOW_DAYS)
    prices = [
        row.price
        for row in db.query(PriceObservation.price)
        .filter(
            PriceObservation.origin == origin,
            PriceObservation.destination == destination,
            PriceObservation.cabin == cabin,
            PriceObservation.currency == currency,
            PriceObservation.collected_at >= since,
            PriceObservation.price > 0,
        )
        .all()
    ]

    if len(prices) < 5:
        return None

    prices.sort()
    median = statistics.median(prices)
    p25 = _percentile(prices, 25)
    p10 = _percentile(prices, 10)
    min_price = prices[0]

    baseline = db.query(Baseline).filter(Baseline.route_key == route_key).first()
    if not baseline:
        baseline = Baseline(route_key=route_key)
        db.add(baseline)

    baseline.window_days = BASELINE_WINDOW_DAYS
    baseline.median = median
    baseline.p25 = p25
    baseline.p10 = p10
    baseline.min_price = min_price
    baseline.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(baseline)
    return baseline


def _make_search_link(origin: str, destination: str, departure_at: str) -> str:
    try:
        d = datetime.strptime(departure_at[:10], "%Y-%m-%d")
        return f"https://www.aviasales.com/search/{origin}{d.strftime('%d%m')}{destination}1"
    except Exception:
        return f"https://www.skyscanner.com.br/transporte/passagens-aereas/{origin.lower()}/{destination.lower()}/"


def detect_opportunities(db: Session, observations: List[PriceObservation]) -> List[Opportunity]:
    """Compara observações contra baseline e cria oportunidades quando há anomalia.
    Deduplica por (origin, destination, cabin, currency, price, departure_date).
    Só compara preços na mesma moeda do baseline.
    """
    new_opps = []
    baseline_cache: dict = {}

    # Conjunto de combinações já registradas nesta sessão para evitar duplicatas em batch
    seen: set = set()

    for obs in observations:
        if obs.price <= 0:
            continue

        # route_key inclui moeda para não misturar BRL com EUR
        route_key = f"{obs.origin}-{obs.destination}-{obs.cabin}-{obs.currency}"
        if route_key not in baseline_cache:
            baseline_cache[route_key] = (
                db.query(Baseline).filter(Baseline.route_key == route_key).first()
            )
        baseline = baseline_cache[route_key]

        if not baseline or baseline.median <= 0:
            continue

        pct_below = (baseline.median - obs.price) / baseline.median * 100
        strength = classify_strength(pct_below)
        if not strength:
            continue

        # Dedup por observation_id
        if db.query(Opportunity).filter(Opportunity.observation_id == obs.id).first():
            continue

        # Dedup em batch: mesma rota + preço + data de partida
        dedup_key = (obs.origin, obs.destination, obs.cabin, obs.currency,
                     round(obs.price), obs.departure_at[:10])
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        # Dedup no banco: já existe oportunidade ativa com mesmo preço e data?
        existing = db.query(Opportunity).filter(
            Opportunity.origin == obs.origin,
            Opportunity.destination == obs.destination,
            Opportunity.cabin == obs.cabin,
            Opportunity.currency == obs.currency,
            Opportunity.price == obs.price,
            Opportunity.is_dismissed == False,
        ).first()
        if existing:
            continue

        buy_link = getattr(obs, "buy_link", None) or _make_search_link(
            obs.origin, obs.destination, obs.departure_at
        )

        opp = Opportunity(
            observation_id=obs.id,
            target_id=obs.target_id,
            origin=obs.origin,
            destination=obs.destination,
            price=obs.price,
            currency=obs.currency,
            cabin=obs.cabin,
            airline=obs.airline,
            departure_at=obs.departure_at,
            return_at=obs.return_at,
            pct_below_baseline=round(pct_below, 1),
            strength=strength,
            confirmed_live=False,
            expiry_status="unknown",
            buy_link=buy_link,
            detected_at=datetime.utcnow(),
            is_dismissed=False,
        )
        db.add(opp)
        new_opps.append(opp)

    if new_opps:
        db.commit()

    return new_opps
