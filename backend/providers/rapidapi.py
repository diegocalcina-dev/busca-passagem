"""
RapidAPI — Sky-Scrapper (Skyscanner) provider.
Usado para verificação ao vivo de oportunidades detectadas pelo Travelpayouts.

Como obter a chave:
  1. Crie conta em https://rapidapi.com
  2. Busque "Sky Scrapper" e assine o plano Basic (gratuito, 50 req/mês)
  3. Copie a chave e coloque em backend/.env como RAPIDAPI_KEY=...
"""

import os
import httpx
import logging
from typing import Optional, List
from dataclasses import dataclass

from providers.base import PriceProvider, FlightResult

logger = logging.getLogger("rapidapi")

RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "sky-scrapper.p.rapidapi.com")
BASE_URL = f"https://{RAPIDAPI_HOST}"

# Cache de entity IDs (código interno do Skyscanner por aeroporto IATA).
# Valores confirmados via API em 16/07/2026 — economizam chamadas de lookup.
_ENTITY_CACHE: dict = {
    # Brasil (confirmados via API)
    "GRU": "95673332", "CGH": "95673330", "VCP": "95673333",
    "GIG": "95673329", "SDU": "95673328", "BSB": "95673320",
    "SSA": "95673347", "REC": "95673341", "FOR": "95673325",
    "CWB": "95673323", "POA": "95673339", "BEL": "95673317",
    "MAO": "95673334", "CNF": "95673322", "FLN": "95673324",
    # América do Norte
    "MIA": "95565040", "JFK": "95565059", "LAX": "95565049",
    "MCO": "95565050", "ORD": "95565045", "YYZ": "95565011",
    "CUN": "95565043",
    # América do Sul
    "EZE": "95673303", "SCL": "95673346", "LIM": "95673331",
    "BOG": "95673319", "MVD": "95673352",
    # Europa
    "LIS": "95565055", "MAD": "95565054", "CDG": "95565041",
    "LHR": "95565050", "FCO": "95565044", "AMS": "95565038",
    "FRA": "95565045", "BCN": "95565039", "MXP": "95565056",
    # Ásia & Oriente Médio
    "NRT": "95674402", "ICN": "95673971", "DXB": "95673506",
    "DOH": "95673510", "BKK": "95674436", "SIN": "95674518",
    # África
    "JNB": "95673783", "CPT": "95673744",
}


@dataclass
class VerifyResult:
    confirmed: bool
    best_price: Optional[float]
    airline: Optional[str]
    error: Optional[str] = None


class RapidAPIProvider(PriceProvider):
    name = "rapidapi"
    supported_dimensions = ["D1", "D5"]

    def __init__(self):
        self.key = os.getenv("RAPIDAPI_KEY", "")

    def is_available(self) -> bool:
        return bool(self.key)

    def _headers(self) -> dict:
        return {
            "x-rapidapi-host": RAPIDAPI_HOST,
            "x-rapidapi-key": self.key,
        }

    def _get_entity_id(self, iata: str) -> Optional[str]:
        if iata in _ENTITY_CACHE:
            return _ENTITY_CACHE[iata]
        try:
            r = httpx.get(
                f"{BASE_URL}/api/v1/flights/searchAirport",
                params={"query": iata, "locale": "pt-BR"},
                headers=self._headers(),
                timeout=10,
            )
            r.raise_for_status()
            for item in r.json().get("data", []):
                params = item.get("navigation", {}).get("relevantFlightParams", {})
                sky_id = params.get("skyId", "")
                entity_id = params.get("entityId")
                if sky_id.upper() == iata.upper() and entity_id:
                    _ENTITY_CACHE[iata] = str(entity_id)
                    logger.info(f"[rapidapi] entity_id {iata} → {entity_id}")
                    return str(entity_id)
        except Exception as e:
            logger.warning(f"[rapidapi] airport lookup {iata}: {e}")
        return None

    def _search(
        self,
        origin: str,
        destination: str,
        date: str,
        currency: str = "BRL",
        cabin: str = "economy",
    ) -> List[FlightResult]:
        origin_id = self._get_entity_id(origin)
        dest_id = self._get_entity_id(destination)
        if not origin_id or not dest_id:
            logger.warning(f"[rapidapi] entity_id não encontrado: {origin} ou {destination}")
            return []

        cabin_map = {"economy": "economy", "premium": "premiumeconomy", "business": "business", "first": "first"}

        try:
            r = httpx.get(
                f"{BASE_URL}/api/v2/flights/searchFlights",
                params={
                    "originSkyId": origin,
                    "destinationSkyId": destination,
                    "originEntityId": origin_id,
                    "destinationEntityId": dest_id,
                    "date": date[:10],
                    "adults": 1,
                    "currency": currency,
                    "countryCode": "BR",
                    "market": "pt-BR",
                    "cabinClass": cabin_map.get(cabin, "economy"),
                    "sortBy": "price_low",
                },
                headers=self._headers(),
                timeout=20,
            )
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"[rapidapi] HTTP {e.response.status_code} ao buscar {origin}→{destination}")
            return []
        except Exception as e:
            logger.error(f"[rapidapi] erro ao buscar {origin}→{destination}: {e}")
            return []

        results = []
        for item in data.get("data", {}).get("itineraries", [])[:15]:
            price = item.get("price", {}).get("raw", 0)
            if not price:
                continue
            legs = item.get("legs", [])
            if not legs:
                continue
            leg = legs[0]
            marketing = leg.get("carriers", {}).get("marketing", [{}])
            airline = marketing[0].get("name", "?") if marketing else "?"
            buy_link = (
                f"https://www.skyscanner.com.br/transporte/passagens-aereas"
                f"/{origin.lower()}/{destination.lower()}/{date[:10].replace('-', '')}/"
            )
            results.append(FlightResult(
                origin=origin,
                destination=destination,
                price=float(price),
                currency=currency,
                cabin=cabin,
                airline=airline,
                stops=leg.get("stopCount", 0),
                departure_at=leg.get("departure", f"{date}T00:00:00"),
                return_at=None,
                source=self.name,
                buy_link=buy_link,
            ))
        return results

    def fetch_route(
        self,
        origin: str,
        destination: str,
        currency: str = "BRL",
        cabin: str = "economy",
        one_way: bool = False,
        depart_month: Optional[str] = None,
    ) -> List[FlightResult]:
        if not self.is_available():
            return []
        from datetime import datetime, timedelta
        date = (datetime.utcnow() + timedelta(days=45)).strftime("%Y-%m-%d")
        return self._search(origin, destination, date, currency, cabin)

    def verify_opportunity(
        self,
        origin: str,
        destination: str,
        departure_at: str,
        opportunity_price: float,
        currency: str = "BRL",
        cabin: str = "economy",
        tolerance_pct: float = 15.0,
    ) -> VerifyResult:
        """
        Confirma ao vivo se o preço de uma oportunidade ainda existe.
        Considera confirmado se o melhor preço encontrado está dentro de
        `tolerance_pct`% do preço original da oportunidade.
        """
        if not self.is_available():
            return VerifyResult(confirmed=False, best_price=None, airline=None, error="not_configured")

        results = self._search(origin, destination, departure_at, currency, cabin)
        if not results:
            return VerifyResult(confirmed=False, best_price=None, airline=None, error="no_results")

        best = min(results, key=lambda r: r.price)
        threshold = opportunity_price * (1 + tolerance_pct / 100)
        confirmed = best.price <= threshold

        return VerifyResult(
            confirmed=confirmed,
            best_price=best.price,
            airline=best.airline,
        )
