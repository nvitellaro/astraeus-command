import os
from datetime import datetime, timedelta, timezone

import requests
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import NeoEvent


NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
NEOWS_FEED_URL = "https://api.nasa.gov/neo/rest/v1/feed"


def parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def fetch_neows_feed():
    start_date = datetime.now(timezone.utc).date()
    end_date = start_date + timedelta(days=7)

    response = requests.get(
        NEOWS_FEED_URL,
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "api_key": NASA_API_KEY,
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


def upsert_neo_event(db: Session, neo: dict, approach: dict, fetched_at: datetime):
    neo_reference_id = neo.get("neo_reference_id")
    close_approach_datetime_raw = approach.get("close_approach_date_full")
    close_approach_datetime = parse_datetime(close_approach_datetime_raw)

    existing = (
        db.query(NeoEvent)
        .filter(
            NeoEvent.neo_reference_id == neo_reference_id,
            NeoEvent.close_approach_datetime == close_approach_datetime,
        )
        .first()
    )

    diameter = neo.get("estimated_diameter", {}).get("feet", {})
    velocity = approach.get("relative_velocity", {})
    miss_distance = approach.get("miss_distance", {})

    payload = {
        "neo_reference_id": neo_reference_id,
        "name": neo.get("name"),
        "nasa_jpl_url": neo.get("nasa_jpl_url"),
        "is_hazardous": neo.get("is_potentially_hazardous_asteroid", False),
        "close_approach_datetime": close_approach_datetime,
        "close_approach_date": approach.get("close_approach_date"),
        "relative_velocity_mph": parse_float(velocity.get("miles_per_hour")),
        "miss_distance_miles": parse_float(miss_distance.get("miles")),
        "estimated_diameter_min_ft": parse_float(diameter.get("estimated_diameter_min")),
        "estimated_diameter_max_ft": parse_float(diameter.get("estimated_diameter_max")),
        "fetched_at": fetched_at,
    }

    if existing:
        for key, value in payload.items():
            setattr(existing, key, value)
    else:
        db.add(NeoEvent(**payload))


def run():
    fetched_at = datetime.now(timezone.utc)
    data = fetch_neows_feed()

    near_earth_objects = data.get("near_earth_objects", {})

    db = SessionLocal()

    inserted_or_updated = 0

    try:
        for date_key, neos in near_earth_objects.items():
            for neo in neos:
                approaches = neo.get("close_approach_data", [])

                for approach in approaches:
                    upsert_neo_event(db, neo, approach, fetched_at)
                    inserted_or_updated += 1

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    print(f"NeoWs ETL complete. Rows inserted/updated: {inserted_or_updated}")


if __name__ == "__main__":
    run()