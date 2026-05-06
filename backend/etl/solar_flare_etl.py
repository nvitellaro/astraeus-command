import os
from datetime import datetime, timedelta

import requests

from app.db import SessionLocal
from app.models import SolarFlareEvent


NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
DONKI_FLR_URL = "https://api.nasa.gov/DONKI/FLR"


def parse_donki_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def fetch_solar_flare_data():
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=7)
    end_date = today

    params = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "api_key": NASA_API_KEY,
    }

    response = requests.get(DONKI_FLR_URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def upsert_solar_flare(db, flare):
    flr_id = flare.get("flrID")
    fetched_at = datetime.utcnow()

    existing = (
        db.query(SolarFlareEvent)
        .filter(SolarFlareEvent.flr_id == flr_id)
        .first()
    )

    linked_events = flare.get("linkedEvents")

    if existing:
        existing.begin_time = parse_donki_datetime(flare.get("beginTime"))
        existing.peak_time = parse_donki_datetime(flare.get("peakTime"))
        existing.end_time = parse_donki_datetime(flare.get("endTime"))
        existing.class_type = flare.get("classType")
        existing.source_location = flare.get("sourceLocation")
        existing.active_region_num = flare.get("activeRegionNum")
        existing.linked_events = str(linked_events) if linked_events else None
        existing.link = flare.get("link")
        existing.fetched_at = fetched_at
        return existing

    event = SolarFlareEvent(
        flr_id=flr_id,
        begin_time=parse_donki_datetime(flare.get("beginTime")),
        peak_time=parse_donki_datetime(flare.get("peakTime")),
        end_time=parse_donki_datetime(flare.get("endTime")),
        class_type=flare.get("classType"),
        source_location=flare.get("sourceLocation"),
        active_region_num=flare.get("activeRegionNum"),
        linked_events=str(linked_events) if linked_events else None,
        link=flare.get("link"),
        fetched_at=fetched_at,
    )

    db.add(event)
    return event


def run_etl():
    data = fetch_solar_flare_data()
    db = SessionLocal()

    try:
        count = 0

        for flare in data:
            if not flare.get("flrID"):
                continue

            upsert_solar_flare(db, flare)
            count += 1

        db.commit()
        print(f"Solar Flare ETL complete. Upserted {count} records.")

    except Exception as exc:
        db.rollback()
        print(f"Solar Flare ETL failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    run_etl()