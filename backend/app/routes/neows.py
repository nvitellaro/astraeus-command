from fastapi import APIRouter, Depends
from sqlalchemy import asc, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import NeoEvent

router = APIRouter()


@router.get("/upcoming")
def get_upcoming_neos(db: Session = Depends(get_db)):
    rows = (
        db.query(NeoEvent)
        .order_by(asc(NeoEvent.close_approach_datetime))
        .limit(200)
        .all()
    )

    return {
        "rows": [
            {
                "id": row.id,
                "neo_reference_id": row.neo_reference_id,
                "name": row.name,
                "nasa_jpl_url": row.nasa_jpl_url,
                "is_hazardous": row.is_hazardous,
                "close_approach_datetime": row.close_approach_datetime.isoformat()
                if row.close_approach_datetime
                else None,
                "close_approach_date": row.close_approach_date,
                "relative_velocity_mph": row.relative_velocity_mph,
                "miss_distance_miles": row.miss_distance_miles,
                "estimated_diameter_min_ft": row.estimated_diameter_min_ft,
                "estimated_diameter_max_ft": row.estimated_diameter_max_ft,
                "fetched_at": row.fetched_at.isoformat() if row.fetched_at else None,
            }
            for row in rows
        ]
    }


@router.get("/last-refresh")
def get_last_refresh(db: Session = Depends(get_db)):
    latest = db.query(func.max(NeoEvent.fetched_at)).scalar()

    return {
        "last_refresh": latest.isoformat() if latest else None
    }