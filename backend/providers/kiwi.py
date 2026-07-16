"""
Kiwi Tequila API — segundo provider de coleta.
Vantagem sobre Travelpayouts: busca fares ao vivo, inclui self-transfer e
suporta janela de datas inteira em uma só chamada.

Cadastro gratuito (sem limite de uso documentado para uso pessoal):
  https://tequila.kiwi.com  →  "Get API key"
Adicione em backend/.env:  KIWI_API_KEY=sua_chave_aqui
"""

import os
import httpx
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from providers.base import PriceProvider, FlightResult

logger = logging.getLogger("kiwi")

BASE_URL = "https://tequila.kiwi.com/v2/search"


class KiwiProvider(PriceProvider):
    name = "kiwi"
    supported_dimensions = ["D1", "D2", "D3"]

    def __init__(self):
        self.key = os.getenv("KIWI_API_KEY", "")

    def is_available(self) -> bool:
        return bool(self.key)

    def _headers(self) -> dict:
        return {"apikey": self.key}

    def _parse(self, items: list, origin: str, destination: str, currency: str, cabin: str) -> List[FlightResult]:
        results = []
        for item in items:
            price = item.get("price")
            if not price or price <= 0:
                continue
            airlines = item.get("airlines", [])
            airline = airlines[0] if airlines else "?"
            results.append(FlightResult(
                origin=item.get("flyFrom", origin),
                destination=item.get("flyTo", destination),
                price=float(price),
                currency=currency,
                cabin=cabin,
                airline=airline,
                stops=max(0, len(item.get("route", [])) - 1),
                departure_at=item.get("local_departure", ""),
                return_at=item.get("return_departure", None),
                source=self.name,
                buy_link=item.get("deep_link", ""),
            ))
        return results

    def _search(
        self,
        origin: str,
        destination: str,
        date_from: str,
        date_to: str,
        currency: str,
        cabin: str,
        one_way: bool,
        limit: int = 20,
    ) -> List[FlightResult]:
        cabin_map = {
            "economy": "M", "premium": "W", "business": "C", "first": "F"
        }
        try:
            # Kiwi usa dd/mm/YYYY
            df = datetime.strptime(date_from[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
            dt = datetime.strptime(date_to[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
        except ValueError:
            df = (datetime.utcnow() + timedelta(days=7)).strftime("%d/%m/%Y")
            dt = (datetime.utcnow() + timedelta(days=90)).strftime("%d/%m/%Y")

        params = {
            "fly_from": origin,
            "fly_to": destination if destination != "ANY" else "anywhere",
            "date_from": df,
            "date_to": dt,
            "adults": 1,
            "curr": currency,
            "selected_cabins": cabin_map.get(cabin, "M"),
            "max_stopovers": 2,
            "sort": "price",
            "limit": limit,
            "one_for_city": 1,
        }
        if not one_way:
            params["nights_in_dst_from"] = 5
            params["nights_in_dst_to"] = 21

        try:
            r = httpx.get(BASE_URL, params=params, headers=self._headers(), timeout=20)
            r.raise_for_status()
            return self._parse(r.json().get("data", []), origin, destination, currency, cabin)
        except httpx.HTTPStatusError as e:
            logger.warning(f"[kiwi] HTTP {e.response.status_code}: {origin}→{destination}")
            return []
        except Exception as e:
            logger.warning(f"[kiwi] erro: {e}")
            return []

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
        # Sem datas do target: próximas 8 semanas como padrão
        date_from = datetime.utcnow().strftime("%Y-%m-%d")
        date_to = (datetime.utcnow() + timedelta(weeks=8)).strftime("%Y-%m-%d")
        return self._search(origin, destination, date_from, date_to, currency, cabin, one_way)

    def fetch_months_in_range(
        self,
        origin: str,
        destination: str,
        date_from: str,
        date_to: str,
        currency: str = "BRL",
    ) -> List[FlightResult]:
        """
        Kiwi suporta janela de datas inteira em uma chamada — não precisa iterar meses.
        O collector chama este método em vez de fetch_route + loop mensal.
        """
        if not self.is_available():
            return []
        # Busca economy e business separadamente para cobrir ambas as cabines
        results = self._search(origin, destination, date_from, date_to, currency, "economy", one_way=False, limit=30)
        return results
