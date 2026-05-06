import os
from datetime import datetime, timedelta

import requests

from app.db import SessionLocal
from app.models import GstEvent


NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")
DONKI_GST_URL = "https://api.nasa.gov/DONKI/GST"


def parse_donki_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def fetch_gst_data():
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=30)
    end_date = today

    params = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "api_key": NASA_API_KEY,
    }

    response = requests.get(DONKI_GST_URL, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def upsert_gst(db, gst):
    gst_id = gst.get("gstID")
    fetched_at = datetime.utcnow()

    existing = db.query(GstEvent).filter(GstEvent.gst_id == gst_id).first()

    all_kp = gst.get("allKpIndex", [])
    linked_events = gst.get("linkedEvents")

    highest_kp = None

    if all_kp:
        highest_kp = max(
            [
                kp.get("kpIndex", 0)
                for kp in all_kp
                if kp.get("kpIndex") is not None
            ],
            default=None,
        )

    if existing:
        existing.start_time = parse_donki_datetime(gst.get("startTime"))
        existing.kp_index = str(highest_kp) if highest_kp is not None else None
        existing.linked_events = (
            str(linked_events) if linked_events else None
        )
        existing.link = gst.get("link")
        existing.fetched_at = fetched_at
        return existing

    event = GstEvent(
        gst_id=gst_id,
        start_time=parse_donki_datetime(gst.get("startTime")),
        kp_index=str(highest_kp) if highest_kp is not None else None,
        linked_events=str(linked_events) if linked_events else None,
        link=gst.get("link"),
        fetched_at=fetched_at,
    )

    db.add(event)
    return event


def run_etl():
    data = fetch_gst_data()
    db = SessionLocal()

    try:
        count = 0

        for gst in data:
            if not gst.get("gstID"):
                continue

            upsert_gst(db, gst)
            count += 1

        db.commit()
        print(f"GST ETL complete. Upserted {count} records.")

    except Exception as exc:
        db.rollback()
        print(f"GST ETL failed: {exc}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    run_etl()