import os
from datetime import datetime, timedelta

import requests

from app.db import SessionLocal
from app.models import CmeEvent


NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
DONKI_CME_URL = "https://api.nasa.gov/DONKI/CME"


def parse_donki_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def fetch_cme_data():
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=7)
    end_date = today

    params = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "api_key": NASA_API_KEY,
    }

    response = requests.get(DONKI_CME_URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def upsert_cme(db, cme):
    cme_id = cme.get("activityID")
    fetched_at = datetime.utcnow()

    existing = db.query(CmeEvent).filter(CmeEvent.cme_id == cme_id).first()

    instruments = cme.get("instruments")
    linked_events = cme.get("linkedEvents")

    if existing:
        existing.start_time = parse_donki_datetime(cme.get("startTime"))
        existing.source_location = cme.get("sourceLocation")
        existing.active_region_num = cme.get("activeRegionNum")
        existing.instruments = str(instruments) if instruments else None
        existing.linked_events = str(linked_events) if linked_events else None
        existing.note = cme.get("note")
        existing.link = cme.get("link")
        existing.fetched_at = fetched_at
        return existing

    event = CmeEvent(
        cme_id=cme_id,
        start_time=parse_donki_datetime(cme.get("startTime")),
        source_location=cme.get("sourceLocation"),
        active_region_num=cme.get("activeRegionNum"),
        instruments=str(instruments) if instruments else None,
        linked_events=str(linked_events) if linked_events else None,
        note=cme.get("note"),
        link=cme.get("link"),
        fetched_at=fetched_at,
    )

    db.add(event)
    return event


def run_etl():
    data = fetch_cme_data()
    db = SessionLocal()

    try:
        count = 0

        for cme in data:
            if not cme.get("activityID"):
                continue

            upsert_cme(db, cme)
            count += 1

        db.commit()
        print(f"CME ETL complete. Upserted {count} records.")

    except Exception as exc:
        db.rollback()
        print(f"CME ETL failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    run_etl()