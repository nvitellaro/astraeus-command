import os
from datetime import datetime, timedelta

import requests

from app.db import SessionLocal
from app.models import NeoEvent


NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
NEOWS_FEED_URL = "https://api.nasa.gov/neo/rest/v1/feed"


def parse_close_approach_datetime(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%b-%d %H:%M")
    except Exception:
        return None


def fetch_neows_data():
    today = datetime.utcnow().date()
    end_date = today + timedelta(days=7)

    params = {
        "start_date": today.isoformat(),
        "end_date": end_date.isoformat(),
        "api_key": NASA_API_KEY,
    }

    response = requests.get(NEOWS_FEED_URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def upsert_neo_event(db, neo, approach):
    close_approach_date = approach.get("close_approach_date")
    close_approach_datetime = parse_close_approach_datetime(
        approach.get("close_approach_date_full")
    )

    miss_distance_miles = approach.get("miss_distance", {}).get("miles")
    relative_velocity_mph = approach.get("relative_velocity", {}).get(
        "miles_per_hour"
    )

    estimated_diameter_min_ft = (
        neo.get("estimated_diameter", {})
        .get("feet", {})
        .get("estimated_diameter_min")
    )

    estimated_diameter_max_ft = (
        neo.get("estimated_diameter", {})
        .get("feet", {})
        .get("estimated_diameter_max")
    )

    fetched_at = datetime.utcnow()

    existing = (
        db.query(NeoEvent)
        .filter(
            NeoEvent.neo_reference_id == neo.get("neo_reference_id"),
            NeoEvent.close_approach_date == close_approach_date,
        )
        .first()
    )

    if existing:
        existing.name = neo.get("name")
        existing.nasa_jpl_url = neo.get("nasa_jpl_url")
        existing.is_hazardous = neo.get("is_potentially_hazardous_asteroid")
        existing.close_approach_datetime = close_approach_datetime
        existing.miss_distance_miles = miss_distance_miles
        existing.relative_velocity_mph = relative_velocity_mph
        existing.estimated_diameter_min_ft = estimated_diameter_min_ft
        existing.estimated_diameter_max_ft = estimated_diameter_max_ft
        existing.fetched_at = fetched_at
        return existing

    event = NeoEvent(
        neo_reference_id=neo.get("neo_reference_id"),
        name=neo.get("name"),
        nasa_jpl_url=neo.get("nasa_jpl_url"),
        is_hazardous=neo.get("is_potentially_hazardous_asteroid"),
        close_approach_date=close_approach_date,
        close_approach_datetime=close_approach_datetime,
        miss_distance_miles=miss_distance_miles,
        relative_velocity_mph=relative_velocity_mph,
        estimated_diameter_min_ft=estimated_diameter_min_ft,
        estimated_diameter_max_ft=estimated_diameter_max_ft,
        fetched_at=fetched_at,
    )

    db.add(event)
    return event


def run_etl():
    data = fetch_neows_data()
    near_earth_objects = data.get("near_earth_objects", {})

    db = SessionLocal()

    try:
        count = 0

        for date_key, objects in near_earth_objects.items():
            for neo in objects:
                close_approach_data = neo.get("close_approach_data", [])

                if not close_approach_data:
                    continue

                approach = close_approach_data[0]
                upsert_neo_event(db, neo, approach)
                count += 1

        db.commit()
        print(f"NeoWs ETL complete. Upserted {count} records.")

    except Exception as exc:
        db.rollback()
        print(f"NeoWs ETL failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    run_etl()