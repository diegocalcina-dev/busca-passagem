"""
Travelpayouts Data API (Aviasales cache data).
Docs: https://support.travelpayouts.com/hc/en-us/articles/203956073
Auth: X-Access-Token header (free affiliate program).
"""

import os
import httpx
from datetime import datetime, timedelta
from typing import List, Optional

from providers.base import PriceProvider, FlightResult

BASE_URL = "https://api.travelpayouts.com"
AFFILIATE_BASE = "https://www.aviasales.com"

AIRLINE_NAMES = {
    "LA": "LATAM Airlines", "JJ": "LATAM Brasil", "AD": "Azul", "G3": "GOL",
    "TP": "TAP Air Portugal", "AA": "American Airlines", "UA": "United Airlines",
    "DL": "Delta Air Lines", "AF": "Air France", "LH": "Lufthansa", "IB": "Iberia",
    "KL": "KLM", "NH": "ANA", "JL": "Japan Airlines", "KE": "Korean Air",
    "EK": "Emirates", "CM": "Copa Airlines", "AV": "Avianca",
    "AR": "Aerolíneas Argentinas", "AM": "Aeromexico", "AC": "Air Canada",
    "BA": "British Airways", "QR": "Qatar Airways", "TK": "Turkish Airlines",
    "ET": "Ethiopian Airlines", "MS": "EgyptAir", "SV": "Saudi Arabian Airlines",
}


def _make_link(origin: str, destination: str, departure_at: str, one_way: bool = False) -> str:
    try:
        d = datetime.strptime(departure_at[:10], "%Y-%m-%d")
        date_part = d.strftime("%d%m")
    except Exception:
        date_part = ""
    pax = "1"
    trip = "1" if one_way else "2"
    return f"{AFFILIATE_BASE}/search/{origin}{date_part}{destination}{pax}"


class TravelpayoutsProvider(PriceProvider):
    name = "travelpayouts"
    # D1: rota fixa, D2: datas flexíveis (calendar), D3: destino flexível (ANY)
    supported_dimensions = ["D1", "D2", "D3"]

    def __init__(self):
        self.token = os.getenv("TRAVELPAYOUTS_TOKEN", "")

    def is_available(self) -> bool:
        return bool(self.token)

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

        results: List[FlightResult] = []

        # Endpoint 1: preços mais baratos por mês (D1, D3)
        results.extend(self._fetch_cheap(origin, destination, currency, cabin, one_way))

        # Endpoint 2: calendário de preços por dia (D2) — requer mês específico
        if depart_month:
            results.extend(self._fetch_calendar(origin, destination, currency, depart_month))

        return results

    def _fetch_cheap(self, origin, destination, currency, cabin, one_way) -> List[FlightResult]:
        params = {
            "origin": origin,
            "destination": destination if destination != "ANY" else "",
            "currency": currency,
            "one_way": "true" if one_way else "false",
        }
        try:
            r = httpx.get(
                f"{BASE_URL}/v1/prices/cheap",
                params=params,
                headers={"X-Access-Token": self.token},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json().get("data", {})
        except httpx.HTTPStatusError as e:
            print(f"[travelpayouts] cheap HTTP {e.response.status_code}: {e}")
            return []
        except Exception as e:
            print(f"[travelpayouts] cheap error: {e}")
            return []

        results = []
        for _month, info in data.items():
            code = info.get("airline", "??")
            dep = info.get("departure_at", "")
            link = AFFILIATE_BASE + info.get("link", "") if info.get("link") else _make_link(origin, destination, dep, one_way)
            results.append(FlightResult(
                origin=origin,
                destination=destination,
                price=float(info.get("price", 0)),
                currency=currency,
                cabin=cabin,
                airline=AIRLINE_NAMES.get(code, code),
                stops=int(info.get("transfers", 0)),
                departure_at=dep or f"{_month}-01T00:00:00",
                return_at=info.get("return_at"),
                source=self.name,
                buy_link=link,
            ))
        return results

    def _fetch_calendar(self, origin, destination, currency, depart_month) -> List[FlightResult]:
        """Prices per day in a given month — supports D2 (flexible dates)."""
        params = {
            "origin": origin,
            "destination": destination,
            "currency": currency,
            "depart_date": depart_month,
            "calendar_type": "departure_date",
            "one_way": "false",
        }
        try:
            r = httpx.get(
                f"{BASE_URL}/v1/prices/calendar",
                params=params,
                headers={"X-Access-Token": self.token},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json().get("data", {})
        except httpx.HTTPStatusError as e:
            print(f"[travelpayouts] calendar HTTP {e.response.status_code}: {e}")
            return []
        except Exception as e:
            print(f"[travelpayouts] calendar error: {e}")
            return []

        results = []
        for date_key, info in data.items():
            code = info.get("airline", "??")
            dep = info.get("departure_at", f"{date_key}T00:00:00")
            link = AFFILIATE_BASE + info.get("link", "") if info.get("link") else _make_link(origin, destination, dep)
            results.append(FlightResult(
                origin=origin,
                destination=destination,
                price=float(info.get("price", 0)),
                currency=currency,
                cabin="economy",  # calendar endpoint always returns economy
                airline=AIRLINE_NAMES.get(code, code),
                stops=int(info.get("transfers", 0)),
                departure_at=dep,
                return_at=info.get("return_at"),
                source=self.name,
                buy_link=link,
            ))
        return results

    def verify_route(
        self,
        origin: str,
        destination: str,
        opportunity_price: float,
        currency: str = "BRL",
        tolerance_pct: float = 20.0,
    ) -> dict:
        """
        Verifica se uma oportunidade ainda é válida usando /aviasales/v3/prices_for_dates.
        Retorna dict com: confirmed (bool), best_price (float|None), error (str|None).
        """
        if not self.is_available():
            return {"confirmed": False, "best_price": None, "error": "not_configured"}
        try:
            r = httpx.get(
                f"{BASE_URL}/aviasales/v3/prices_for_dates",
                params={
                    "origin": origin,
                    "destination": destination,
                    "currency": currency.lower(),
                    "token": self.token,
                },
                timeout=15,
            )
            r.raise_for_status()
            entries = r.json().get("data", [])
        except Exception as e:
            return {"confirmed": False, "best_price": None, "error": str(e)}

        if not entries:
            return {"confirmed": False, "best_price": None, "error": "no_results"}

        prices = [float(e.get("price", 0)) for e in entries if e.get("price")]
        if not prices:
            return {"confirmed": False, "best_price": None, "error": "no_prices"}

        threshold = opportunity_price * (1 + tolerance_pct / 100)
        best = min(prices)
        return {
            "confirmed": best <= threshold,
            "best_price": best,
            "error": None,
        }

    def fetch_months_in_range(
        self,
        origin: str,
        destination: str,
        date_from: str,
        date_to: str,
        currency: str = "BRL",
    ) -> List[FlightResult]:
        """Expand D2: call calendar for each month in [date_from, date_to]."""
        results = []
        try:
            start = datetime.strptime(date_from[:7], "%Y-%m")
            end = datetime.strptime(date_to[:7], "%Y-%m")
        except ValueError:
            return results

        current = start
        while current <= end:
            month_str = current.strftime("%Y-%m")
            results.extend(self._fetch_calendar(origin, destination, currency, month_str))
            # Advance one month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        return results
