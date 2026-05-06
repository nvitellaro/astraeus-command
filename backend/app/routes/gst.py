from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import GstEvent

router = APIRouter()


@router.get("/recent")
def get_recent_gst(db: Session = Depends(get_db)):
    rows = (
        db.query(GstEvent)
        .order_by(desc(GstEvent.start_time))
        .limit(100)
        .all()
    )

    return {
        "rows": [
            {
                "id": row.id,
                "gst_id": row.gst_id,
                "start_time": row.start_time.isoformat()
                if row.start_time
                else None,
                "kp_index": row.kp_index,
                "linked_events": row.linked_events,
                "link": row.link,
                "fetched_at": row.fetched_at.isoformat()
                if row.fetched_at
                else None,
            }
            for row in rows
        ]
    }


@router.get("/last-refresh")
def get_gst_last_refresh(db: Session = Depends(get_db)):
    latest = db.query(func.max(GstEvent.fetched_at)).scalar()

    return {
        "last_refresh": latest.isoformat() if latest else None
    }


@router.get("/summary")
def get_gst_summary(db: Session = Depends(get_db)):
    rows = db.query(GstEvent).all()

    latest_refresh = db.query(func.max(GstEvent.fetched_at)).scalar()

    strongest_storm = None

    if rows:
        strongest_storm = sorted(
            rows,
            key=lambda row: float(row.kp_index or 0),
            reverse=True,
        )[0]

    severe_count = 0

    for row in rows:
        try:
            if float(row.kp_index or 0) >= 5:
                severe_count += 1
        except Exception:
            pass

    return {
        "total_gst": len(rows),

        "severe_storms": severe_count,

        "last_refresh": (
            latest_refresh.isoformat()
            if latest_refresh
            else None
        ),

        "strongest_storm": {
            "gst_id": strongest_storm.gst_id,
            "kp_index": strongest_storm.kp_index,
            "start_time": strongest_storm.start_time.isoformat()
            if strongest_storm.start_time
            else None,
            "link": strongest_storm.link,
        }
        if strongest_storm
        else None,
    }