"""
Seed data for CaçaPassagem — generates realistic mock data for local testing.
Idempotent: checks if data already exists before inserting.
"""

import json
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Target, PriceObservation, Baseline, Opportunity

random.seed(42)  # Fixed seed for reproducibility

# ─── Airlines by route ────────────────────────────────────────────────────────

AIRLINES = {
    "GRU-LIS": ["TAP Air Portugal", "LATAM Airlines", "Azul", "Air France", "Iberia"],
    "GRU-MIA": ["LATAM Airlines", "American Airlines", "Azul", "Copa Airlines", "United Airlines"],
    "GIG-CDG": ["Air France", "LATAM Airlines", "TAP Air Portugal", "Lufthansa", "Iberia"],
    "GRU-NRT": ["Japan Airlines", "ANA", "Korean Air", "LATAM Airlines", "Emirates"],
    "CGH-SCL": ["LATAM Airlines", "Gol", "Sky Airline", "Aerolinas Argentinas"],
    "GRU-ANY": ["LATAM Airlines", "Azul", "Gol", "American Airlines", "Air France"],
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def jdump(lst):
    return json.dumps(lst)


def random_date_str(start: datetime, end: datetime) -> str:
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")


def make_buy_link(origin: str, destination: str, departure: str, airline: str) -> str:
    airline_slug = airline.lower().replace(" ", "-")
    return f"https://www.google.com/travel/flights?q={origin}+to+{destination}+on+{departure}+{airline_slug}"


# ─── Seed targets ─────────────────────────────────────────────────────────────

TARGETS_DATA = [
    {
        "name": "GRU → Lisboa",
        "origins": ["GRU", "CGH"],
        "destination": "LIS",
        "one_way": False,
        "date_from": "2026-08-01",
        "date_to": "2026-12-31",
        "stay_min": 7,
        "stay_max": 21,
        "cabins": ["economy", "business"],
        "max_stops": 1,
        "passengers": 1,
        "currencies": ["BRL", "EUR"],
        "price_ceiling": None,
        "active": True,
    },
    {
        "name": "GRU → Miami",
        "origins": ["GRU"],
        "destination": "MIA",
        "one_way": False,
        "date_from": "2026-09-01",
        "date_to": "2026-11-30",
        "stay_min": 5,
        "stay_max": 14,
        "cabins": ["economy"],
        "max_stops": 1,
        "passengers": 1,
        "currencies": ["BRL", "USD"],
        "price_ceiling": 2500.0,
        "active": True,
    },
    {
        "name": "GIG → Paris CDG",
        "origins": ["GIG"],
        "destination": "CDG",
        "one_way": False,
        "date_from": "2026-10-01",
        "date_to": "2027-01-31",
        "stay_min": 7,
        "stay_max": 21,
        "cabins": ["economy", "business"],
        "max_stops": 1,
        "passengers": 2,
        "currencies": ["BRL", "EUR"],
        "price_ceiling": None,
        "active": True,
    },
    {
        "name": "GRU → Tóquio",
        "origins": ["GRU"],
        "destination": "NRT",
        "one_way": False,
        "date_from": "2026-11-01",
        "date_to": "2027-02-28",
        "stay_min": 10,
        "stay_max": 21,
        "cabins": ["economy"],
        "max_stops": 2,
        "passengers": 1,
        "currencies": ["BRL", "USD"],
        "price_ceiling": 4500.0,
        "active": True,
    },
    {
        "name": "CGH → Santiago",
        "origins": ["CGH"],
        "destination": "SCL",
        "one_way": False,
        "date_from": "2026-08-01",
        "date_to": "2026-10-31",
        "stay_min": 3,
        "stay_max": 10,
        "cabins": ["economy"],
        "max_stops": 0,
        "passengers": 1,
        "currencies": ["BRL", "USD"],
        "price_ceiling": 1500.0,
        "active": True,
    },
    {
        "name": "GRU → Destino Flexível",
        "origins": ["GRU"],
        "destination": "ANY",
        "one_way": False,
        "date_from": "2026-09-01",
        "date_to": "2026-12-31",
        "stay_min": 5,
        "stay_max": 14,
        "cabins": ["economy"],
        "max_stops": 2,
        "passengers": 1,
        "currencies": ["BRL"],
        "price_ceiling": 3000.0,
        "active": True,
    },
]

# ─── Seed baselines ───────────────────────────────────────────────────────────

BASELINES_DATA = [
    {
        "route_key": "GRU-LIS-economy",
        "window_days": 90,
        "median": 3200.0,
        "p25": 2600.0,
        "p10": 2100.0,
        "min_price": 1650.0,
        "median_price_per_km": 0.34,
    },
    {
        "route_key": "GRU-LIS-business",
        "window_days": 90,
        "median": 12500.0,
        "p25": 9800.0,
        "p10": 7200.0,
        "min_price": 5800.0,
        "median_price_per_km": 1.32,
    },
    {
        "route_key": "GRU-MIA-economy",
        "window_days": 90,
        "median": 2800.0,
        "p25": 2300.0,
        "p10": 1900.0,
        "min_price": 1450.0,
        "median_price_per_km": 0.31,
    },
    {
        "route_key": "GIG-CDG-economy",
        "window_days": 90,
        "median": 4100.0,
        "p25": 3300.0,
        "p10": 2800.0,
        "min_price": 2200.0,
        "median_price_per_km": 0.44,
    },
    {
        "route_key": "GRU-NRT-economy",
        "window_days": 90,
        "median": 5600.0,
        "p25": 4500.0,
        "p10": 3800.0,
        "min_price": 3100.0,
        "median_price_per_km": 0.46,
    },
    {
        "route_key": "CGH-SCL-economy",
        "window_days": 90,
        "median": 1200.0,
        "p25": 980.0,
        "p10": 780.0,
        "min_price": 620.0,
        "median_price_per_km": 0.27,
    },
]

# ─── Route configs for generating observations ────────────────────────────────

ROUTE_CONFIGS = [
    {
        "target_idx": 0,  # GRU → LIS
        "origin": "GRU",
        "destination": "LIS",
        "cabin": "economy",
        "route_key": "GRU-LIS",
        "median": 3200.0,
        "std_factor": 0.18,
        "airlines": AIRLINES["GRU-LIS"],
        "count": 40,
    },
    {
        "target_idx": 0,  # GRU → LIS business
        "origin": "GRU",
        "destination": "LIS",
        "cabin": "business",
        "route_key": "GRU-LIS",
        "median": 12500.0,
        "std_factor": 0.20,
        "airlines": AIRLINES["GRU-LIS"],
        "count": 25,
    },
    {
        "target_idx": 1,  # GRU → MIA
        "origin": "GRU",
        "destination": "MIA",
        "cabin": "economy",
        "route_key": "GRU-MIA",
        "median": 2800.0,
        "std_factor": 0.17,
        "airlines": AIRLINES["GRU-MIA"],
        "count": 35,
    },
    {
        "target_idx": 2,  # GIG → CDG
        "origin": "GIG",
        "destination": "CDG",
        "cabin": "economy",
        "route_key": "GIG-CDG",
        "median": 4100.0,
        "std_factor": 0.16,
        "airlines": AIRLINES["GIG-CDG"],
        "count": 35,
    },
    {
        "target_idx": 3,  # GRU → NRT
        "origin": "GRU",
        "destination": "NRT",
        "cabin": "economy",
        "route_key": "GRU-NRT",
        "median": 5600.0,
        "std_factor": 0.15,
        "airlines": AIRLINES["GRU-NRT"],
        "count": 35,
    },
    {
        "target_idx": 4,  # CGH → SCL
        "origin": "CGH",
        "destination": "SCL",
        "cabin": "economy",
        "route_key": "CGH-SCL",
        "median": 1200.0,
        "std_factor": 0.20,
        "airlines": AIRLINES["CGH-SCL"],
        "count": 30,
    },
]


def generate_price(median: float, std_factor: float) -> float:
    """Generate a realistic price using log-normal distribution."""
    price = median * random.lognormvariate(0, std_factor)
    # Clamp to reasonable range
    price = max(median * 0.4, min(median * 2.0, price))
    return round(price, 2)


def generate_observations(db: Session, targets: list[Target]) -> list[PriceObservation]:
    """Generate ~200 price observations over 60 days for all routes."""
    observations = []
    now = datetime.utcnow()

    for cfg in ROUTE_CONFIGS:
        target = targets[cfg["target_idx"]]
        airlines = cfg["airlines"]
        count = cfg["count"]

        for i in range(count):
            # Spread collection time over the last 60 days
            days_ago = random.uniform(0, 60)
            collected_at = now - timedelta(days=days_ago)

            # Generate a price with slight downward trend over time (more recent = slightly cheaper on average)
            trend_factor = 1.0 - (days_ago / 60) * 0.05
            median_adjusted = cfg["median"] * trend_factor
            price = generate_price(median_adjusted, cfg["std_factor"])

            airline = random.choice(airlines)
            stops = random.choices([0, 1, 2], weights=[0.3, 0.55, 0.15])[0]

            departure_base = datetime(2026, 9, 1) + timedelta(days=random.randint(0, 180))
            departure_at = departure_base.strftime("%Y-%m-%d")

            stay_days = random.randint(7, 21)
            return_at = (departure_base + timedelta(days=stay_days)).strftime("%Y-%m-%d")

            obs = PriceObservation(
                target_id=target.id,
                origin=cfg["origin"],
                destination=cfg["destination"],
                price=price,
                currency="BRL",
                cabin=cfg["cabin"],
                airline=airline,
                stops=stops,
                departure_at=departure_at,
                return_at=return_at,
                source="mock",
                expires_at=(now + timedelta(hours=random.randint(1, 48))).strftime("%Y-%m-%dT%H:%M:%S"),
                price_per_km=round(price / (cfg["median"] * 300 / price), 4),
                collected_at=collected_at,
            )
            db.add(obs)
            observations.append(obs)

    db.flush()
    return observations


# ─── Opportunity specs ────────────────────────────────────────────────────────

OPPORTUNITIES_SPECS = [
    {
        "target_idx": 0,
        "observation_offset": 0,  # will be assigned to the first obs of this target
        "origin": "GRU",
        "destination": "LIS",
        "price": 3890.0,
        "currency": "BRL",
        "cabin": "business",
        "airline": "TAP Air Portugal",
        "departure_at": "2026-09-15",
        "return_at": "2026-09-30",
        "pct_below_baseline": 68.8,
        "strength": "mistake_fare",
        "confirmed_live": True,
        "expiry_status": "valid",
        "days_ago": 0.5,
    },
    {
        "target_idx": 1,
        "origin": "GRU",
        "destination": "MIA",
        "price": 980.0,
        "currency": "BRL",
        "cabin": "economy",
        "airline": "American Airlines",
        "departure_at": "2026-10-05",
        "return_at": "2026-10-19",
        "pct_below_baseline": 65.0,
        "strength": "mistake_fare",
        "confirmed_live": False,
        "expiry_status": "valid",
        "days_ago": 1.0,
    },
    {
        "target_idx": 2,
        "origin": "GIG",
        "destination": "CDG",
        "price": 2180.0,
        "currency": "BRL",
        "cabin": "economy",
        "airline": "Air France",
        "departure_at": "2026-11-10",
        "return_at": "2026-11-24",
        "pct_below_baseline": 46.8,
        "strength": "great",
        "confirmed_live": True,
        "expiry_status": "valid",
        "days_ago": 0.2,
    },
    {
        "target_idx": 4,
        "origin": "CGH",
        "destination": "SCL",
        "price": 590.0,
        "currency": "BRL",
        "cabin": "economy",
        "airline": "LATAM Airlines",
        "departure_at": "2026-09-01",
        "return_at": "2026-09-08",
        "pct_below_baseline": 50.8,
        "strength": "great",
        "confirmed_live": True,
        "expiry_status": "valid",
        "days_ago": 0.8,
    },
    {
        "target_idx": 3,
        "origin": "GRU",
        "destination": "NRT",
        "price": 3200.0,
        "currency": "BRL",
        "cabin": "economy",
        "airline": "Japan Airlines",
        "departure_at": "2026-12-05",
        "return_at": "2026-12-19",
        "pct_below_baseline": 42.8,
        "strength": "good",
        "confirmed_live": True,
        "expiry_status": "valid",
        "days_ago": 2.0,
    },
    {
        "target_idx": 0,
        "origin": "GRU",
        "destination": "LIS",
        "price": 1890.0,
        "currency": "BRL",
        "cabin": "economy",
        "airline": "LATAM Airlines",
        "departure_at": "2026-08-20",
        "return_at": "2026-09-05",
        "pct_below_baseline": 40.9,
        "strength": "good",
        "confirmed_live": False,
        "expiry_status": "expired",
        "days_ago": 5.0,
    },
]


def seed(db: Session):
    """Run seed if the database is empty."""
    if db.query(Target).count() > 0:
        print("Database already seeded — skipping.")
        return

    print("Seeding database with mock data...")

    # ── Targets ──────────────────────────────────────────────────────────────
    targets = []
    for t in TARGETS_DATA:
        target = Target(
            name=t["name"],
            origins=jdump(t["origins"]),
            destination=t["destination"],
            one_way=t["one_way"],
            date_from=t["date_from"],
            date_to=t["date_to"],
            stay_min=t["stay_min"],
            stay_max=t["stay_max"],
            cabins=jdump(t["cabins"]),
            max_stops=t["max_stops"],
            passengers=t["passengers"],
            currencies=jdump(t["currencies"]),
            price_ceiling=t["price_ceiling"],
            active=t["active"],
            created_at=datetime.utcnow() - timedelta(days=random.randint(7, 30)),
        )
        db.add(target)
        targets.append(target)

    db.flush()  # Assign IDs

    # ── Baselines ─────────────────────────────────────────────────────────────
    for b in BASELINES_DATA:
        baseline = Baseline(
            route_key=b["route_key"],
            window_days=b["window_days"],
            median=b["median"],
            p25=b["p25"],
            p10=b["p10"],
            min_price=b["min_price"],
            median_price_per_km=b.get("median_price_per_km"),
            updated_at=datetime.utcnow(),
        )
        db.add(baseline)

    # ── Price Observations ────────────────────────────────────────────────────
    observations = generate_observations(db, targets)

    # ── Opportunities ─────────────────────────────────────────────────────────
    now = datetime.utcnow()

    # We need observations to link to — create dedicated low-price observations for each opportunity
    for spec in OPPORTUNITIES_SPECS:
        target = targets[spec["target_idx"]]

        # Create a dedicated observation for this opportunity
        obs = PriceObservation(
            target_id=target.id,
            origin=spec["origin"],
            destination=spec["destination"],
            price=spec["price"],
            currency=spec["currency"],
            cabin=spec["cabin"],
            airline=spec["airline"],
            stops=0 if spec["cabin"] == "business" else 1,
            departure_at=spec["departure_at"],
            return_at=spec.get("return_at"),
            source="mock",
            expires_at=(now + timedelta(hours=6)).strftime("%Y-%m-%dT%H:%M:%S") if spec["expiry_status"] == "valid" else (now - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
            price_per_km=round(spec["price"] / 9500, 4),
            collected_at=now - timedelta(days=spec["days_ago"]),
        )
        db.add(obs)
        db.flush()

        buy_link = make_buy_link(spec["origin"], spec["destination"], spec["departure_at"], spec["airline"])

        opportunity = Opportunity(
            observation_id=obs.id,
            target_id=target.id,
            origin=spec["origin"],
            destination=spec["destination"],
            price=spec["price"],
            currency=spec["currency"],
            cabin=spec["cabin"],
            airline=spec["airline"],
            departure_at=spec["departure_at"],
            return_at=spec.get("return_at"),
            pct_below_baseline=spec["pct_below_baseline"],
            strength=spec["strength"],
            confirmed_live=spec["confirmed_live"],
            expiry_status=spec["expiry_status"],
            buy_link=buy_link,
            detected_at=now - timedelta(days=spec["days_ago"]),
            is_dismissed=False,
        )
        db.add(opportunity)

    db.commit()
    print(f"Seeding complete: {len(targets)} targets, {len(BASELINES_DATA)} baselines, {len(OPPORTUNITIES_SPECS)} opportunities, ~{len(observations)} observations.")
