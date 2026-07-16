from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class FlightResult:
    origin: str
    destination: str
    price: float
    currency: str
    cabin: str
    airline: str
    stops: int
    departure_at: str
    source: str
    buy_link: str
    return_at: Optional[str] = None
    expires_at: Optional[str] = None
    price_per_km: Optional[float] = None


class PriceProvider(ABC):
    name: str = "base"
    supported_dimensions: List[str] = []

    @abstractmethod
    def fetch_route(
        self,
        origin: str,
        destination: str,
        currency: str = "BRL",
        cabin: str = "economy",
        one_way: bool = False,
        depart_month: Optional[str] = None,
    ) -> List[FlightResult]:
        pass

    def is_available(self) -> bool:
        return True
