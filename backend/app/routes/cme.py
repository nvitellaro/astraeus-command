from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import CmeEvent

router = APIRouter()


@router.get("/recent")
def get_recent_cmes(db: Session = Depends(get_db)):
    rows = (
        db.query(CmeEvent)
        .order_by(desc(CmeEvent.start_time))
        .limit(100)
        .all()
    )

    return {
        "rows": [
            {
                "id": row.id,
                "cme_id": row.cme_id,
                "start_time": row.start_time.isoformat()
                if row.start_time
                else None,
                "source_location": row.source_location,
                "active_region_num": row.active_region_num,
                "instruments": row.instruments,
                "linked_events": row.linked_events,
                "note": row.note,
                "link": row.link,
                "fetched_at": row.fetched_at.isoformat()
                if row.fetched_at
                else None,
            }
            for row in rows
        ]
    }


@router.get("/last-refresh")
def get_cme_last_refresh(db: Session = Depends(get_db)):
    latest = db.query(func.max(CmeEvent.fetched_at)).scalar()

    return {
        "last_refresh": latest.isoformat() if latest else None
    }


@router.get("/summary")
def get_cme_summary(db: Session = Depends(get_db)):
    rows = db.query(CmeEvent).all()

    latest_refresh = db.query(func.max(CmeEvent.fetched_at)).scalar()

    linked_event_count = 0

    for row in rows:
        if row.linked_events:
            linked_event_count += 1

    latest_cme = None

    if rows:
        latest_cme = sorted(
            rows,
            key=lambda row: row.start_time or "",
            reverse=True,
        )[0]

    return {
        "total_cmes": len(rows),

        "linked_event_count": linked_event_count,

        "last_refresh": (
            latest_refresh.isoformat()
            if latest_refresh
            else None
        ),

        "latest_cme": {
            "cme_id": latest_cme.cme_id,
            "start_time": latest_cme.start_time.isoformat()
            if latest_cme.start_time
            else None,
            "source_location": latest_cme.source_location,
            "active_region_num": latest_cme.active_region_num,
            "link": latest_cme.link,
        }
        if latest_cme
        else None,
    }