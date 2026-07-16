"""
Verificador de oportunidades usando Travelpayouts /v1/prices/latest.
Dados do endpoint têm até 48h — confirma se o preço ainda está disponível.
Sem dependência de RapidAPI ou qualquer API paga.
"""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Opportunity
from providers.travelpayouts import TravelpayoutsProvider

logger = logging.getLogger("verifier")
_provider = TravelpayoutsProvider()

MAX_PER_CYCLE = int(__import__("os").getenv("VERIFY_MAX_PER_CYCLE", "10"))


def verify_opportunities(opportunity_ids: list = None, max_count: int = MAX_PER_CYCLE) -> dict:
    """
    Verifica oportunidades usando Travelpayouts /latest (até 48h de frescor).
    - Se `opportunity_ids` for passado, verifica apenas essas.
    - Caso contrário, pega as top N não verificadas ordenadas por desconto.
    """
    if not _provider.is_available():
        return {"skipped": True, "reason": "TRAVELPAYOUTS_TOKEN não configurado"}

    db: Session = SessionLocal()
    summary = {
        "started_at": datetime.utcnow().isoformat(),
        "verified": 0,
        "confirmed": 0,
        "expired": 0,
        "errors": 0,
    }

    try:
        if opportunity_ids:
            candidates = (
                db.query(Opportunity)
                .filter(Opportunity.id.in_(opportunity_ids))
                .all()
            )
        else:
            candidates = (
                db.query(Opportunity)
                .filter(
                    Opportunity.confirmed_live == False,
                    Opportunity.is_dismissed == False,
                    Opportunity.expiry_status != "expired",
                )
                .order_by(Opportunity.pct_below_baseline.desc())
                .limit(max_count)
                .all()
            )

        _route_cache: dict = {}  # evita chamadas duplicadas por rota+moeda no mesmo ciclo

        for opp in candidates:
            route_key = f"{opp.origin}-{opp.destination}-{opp.currency}"
            if route_key not in _route_cache:
                logger.info(
                    f"[verifier] verificando {opp.origin}→{opp.destination} "
                    f"{opp.currency} {opp.price:.0f}"
                )
                _route_cache[route_key] = _provider.verify_route(
                    origin=opp.origin,
                    destination=opp.destination,
                    opportunity_price=opp.price,
                    currency=opp.currency,
                )
            result = dict(_route_cache[route_key])  # cópia para não mudar o cache
            # reavalia confirmed com o preço específico desta oportunidade
            if result.get("best_price") is not None:
                threshold = opp.price * 1.20
                result["confirmed"] = result["best_price"] <= threshold
            summary["verified"] += 1

            if result.get("error"):
                summary["errors"] += 1
                logger.info(
                    f"[verifier] sem resultado {opp.origin}→{opp.destination}: {result['error']}"
                )
                continue  # não marca como expirada — pode ser falta de dados

            if result.get("confirmed"):
                opp.confirmed_live = True
                opp.expiry_status = "valid"
                opp.buy_link = (
                    f"https://www.aviasales.com/search"
                    f"/{opp.origin}{opp.departure_at[:7].replace('-', '')}"
                    f"{opp.destination}1"
                )
                logger.info(
                    f"[verifier] CONFIRMADO {opp.origin}→{opp.destination} "
                    f"melhor: {result.get('best_price'):.0f}"
                )
                summary["confirmed"] += 1
            else:
                opp.expiry_status = "expired"
                logger.info(
                    f"[verifier] EXPIRADO {opp.origin}→{opp.destination} "
                    f"melhor ao vivo: {result.get('best_price')} > limite"
                )
                summary["expired"] += 1

        db.commit()

    except Exception as e:
        logger.exception(f"[verifier] erro: {e}")
        summary["error"] = str(e)
    finally:
        db.close()

    return summary
