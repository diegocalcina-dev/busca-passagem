"""
Orquestrador de coleta.
Expande targets em combinações (origem × cabine × moeda), chama providers
e salva PriceObservations. Depois aciona o detector.
"""

import json
import logging
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Target, PriceObservation
from providers.travelpayouts import TravelpayoutsProvider
from providers.kiwi import KiwiProvider
from providers.base import FlightResult
from engine.detector import recalculate_baseline, detect_opportunities
from engine.verifier import verify_opportunities

logger = logging.getLogger("collector")

# Registre novos providers aqui
PROVIDERS = [TravelpayoutsProvider(), KiwiProvider()]


def _save_observations(db: Session, flights: List[FlightResult], target: Target) -> List[PriceObservation]:
    saved = []
    for f in flights:
        if f.price <= 0:
            continue
        obs = PriceObservation(
            target_id=target.id,
            origin=f.origin,
            destination=f.destination,
            price=f.price,
            currency=f.currency,
            cabin=f.cabin,
            airline=f.airline,
            stops=f.stops,
            departure_at=f.departure_at,
            return_at=f.return_at,
            source=f.source,
            expires_at=f.expires_at,
            price_per_km=f.price_per_km,
            buy_link=f.buy_link,
            collected_at=datetime.utcnow(),
        )
        db.add(obs)
        saved.append(obs)
    if saved:
        db.commit()
        for obs in saved:
            db.refresh(obs)
    return saved


def run_collection_cycle() -> dict:
    """
    Executa um ciclo completo de coleta e detecção.
    Seguro para chamar de threads (APScheduler) ou de endpoints FastAPI.
    Retorna sumário do ciclo.
    """
    started_at = datetime.utcnow().isoformat()
    summary = {
        "started_at": started_at,
        "sources_used": [],
        "observations_saved": 0,
        "opportunities_detected": 0,
        "errors": [],
    }

    db: Session = SessionLocal()
    try:
        targets = db.query(Target).filter(Target.active == True).all()
        logger.info(f"[collector] {len(targets)} targets ativos")

        all_new_obs: List[PriceObservation] = []

        for target in targets:
            origins: List[str] = json.loads(target.origins)
            cabins: List[str] = json.loads(target.cabins)
            currencies: List[str] = json.loads(target.currencies)

            for origin in origins:
                for cabin in cabins:
                    for currency in currencies:
                        for provider in PROVIDERS:
                            if not provider.is_available():
                                continue

                            try:
                                flights = provider.fetch_route(
                                    origin=origin,
                                    destination=target.destination,
                                    currency=currency,
                                    cabin=cabin,
                                    one_way=target.one_way,
                                )

                                # D2: também varrer cada mês da janela via calendar
                                if hasattr(provider, "fetch_months_in_range"):
                                    flights += provider.fetch_months_in_range(
                                        origin=origin,
                                        destination=target.destination,
                                        date_from=target.date_from,
                                        date_to=target.date_to,
                                        currency=currency,
                                    )

                                new_obs = _save_observations(db, flights, target)
                                all_new_obs.extend(new_obs)

                                if provider.name not in summary["sources_used"]:
                                    summary["sources_used"].append(provider.name)

                            except Exception as e:
                                msg = f"{provider.name}/{origin}→{target.destination}: {e}"
                                logger.error(f"[collector] {msg}")
                                summary["errors"].append(msg)

        summary["observations_saved"] = len(all_new_obs)

        # Recalcular baselines para rotas com novas observações (inclui moeda)
        route_keys = {f"{o.origin}-{o.destination}-{o.cabin}-{o.currency}" for o in all_new_obs}
        for rk in route_keys:
            recalculate_baseline(db, rk)

        # Detectar oportunidades nas novas observações
        new_opps = detect_opportunities(db, all_new_obs)
        summary["opportunities_detected"] = len(new_opps)

        if new_opps:
            logger.info(f"[collector] {len(new_opps)} oportunidade(s) detectada(s)")
            # Verificar via Travelpayouts /latest (gratuito, sem cota)
            new_ids = [o.id for o in new_opps]
            verify_result = verify_opportunities(opportunity_ids=new_ids)
            if not verify_result.get("skipped"):
                summary["verified"] = verify_result.get("verified", 0)
                summary["confirmed_live"] = verify_result.get("confirmed", 0)

    except Exception as e:
        msg = f"cycle error: {e}"
        logger.exception(f"[collector] {msg}")
        summary["errors"].append(msg)
    finally:
        db.close()

    return summary
