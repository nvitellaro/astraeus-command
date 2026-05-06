from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import SolarFlareEvent

router = APIRouter()


@router.get("/recent")
def get_recent_solar_flares(db: Session = Depends(get_db)):
    rows = (
        db.query(SolarFlareEvent)
        .order_by(desc(SolarFlareEvent.begin_time))
        .limit(100)
        .all()
    )

    return {
        "rows": [
            {
                "id": row.id,
                "flr_id": row.flr_id,
                "begin_time": row.begin_time.isoformat() if row.begin_time else None,
                "peak_time": row.peak_time.isoformat() if row.peak_time else None,
                "end_time": row.end_time.isoformat() if row.end_time else None,
                "class_type": row.class_type,
                "source_location": row.source_location,
                "active_region_num": row.active_region_num,
                "linked_events": row.linked_events,
                "link": row.link,
                "fetched_at": row.fetched_at.isoformat() if row.fetched_at else None,
            }
            for row in rows
        ]
    }


@router.get("/last-refresh")
def get_solar_flare_last_refresh(db: Session = Depends(get_db)):
    latest = db.query(func.max(SolarFlareEvent.fetched_at)).scalar()

    return {
        "last_refresh": latest.isoformat() if latest else None
    }


@router.get("/summary")
def get_solar_flare_summary(db: Session = Depends(get_db)):
    rows = db.query(SolarFlareEvent).all()

    latest_refresh = db.query(func.max(SolarFlareEvent.fetched_at)).scalar()

    class_counts = {}

    for row in rows:
        flare_class = row.class_type[0] if row.class_type else "Unknown"
        class_counts[flare_class] = class_counts.get(flare_class, 0) + 1

    strongest = None

    if rows:
        strongest = sorted(
            rows,
            key=lambda row: row.class_type or "",
            reverse=True,
        )[0]

    return {
        "total_flares": len(rows),
        "class_counts": class_counts,
        "last_refresh": latest_refresh.isoformat() if latest_refresh else None,
        "strongest_flare": {
            "flr_id": strongest.flr_id,
            "class_type": strongest.class_type,
            "begin_time": strongest.begin_time.isoformat()
            if strongest.begin_time
            else None,
            "peak_time": strongest.peak_time.isoformat()
            if strongest.peak_time
            else None,
            "source_location": strongest.source_location,
            "active_region_num": strongest.active_region_num,
            "link": strongest.link,
        }
        if strongest
        else None,
    }