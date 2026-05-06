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
                "fetched_at": row.fetched_at.isoformat()
                if row.fetched_at
                else None,
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


@router.get("/summary")
def get_neows_summary(db: Session = Depends(get_db)):
    rows = db.query(NeoEvent).all()

    total_objects = len(rows)

    hazardous_objects = [
        row for row in rows if row.is_hazardous
    ]

    closest_object = None
    fastest_object = None

    if rows:
        closest_object = min(
            rows,
            key=lambda row: float(row.miss_distance_miles or 999999999)
        )

        fastest_object = max(
            rows,
            key=lambda row: float(row.relative_velocity_mph or 0)
        )

    avg_velocity = (
        sum(float(r.relative_velocity_mph or 0) for r in rows) / total_objects
        if total_objects
        else 0
    )

    avg_distance = (
        sum(float(r.miss_distance_miles or 0) for r in rows) / total_objects
        if total_objects
        else 0
    )

    latest_refresh = db.query(func.max(NeoEvent.fetched_at)).scalar()

    return {
        "total_objects": total_objects,
        "hazardous_objects": len(hazardous_objects),

        "average_velocity_mph": round(avg_velocity, 2),
        "average_miss_distance_miles": round(avg_distance, 2),

        "last_refresh": (
            latest_refresh.isoformat()
            if latest_refresh
            else None
        ),

        "closest_object": {
            "name": closest_object.name,
            "neo_reference_id": closest_object.neo_reference_id,
            "miss_distance_miles": closest_object.miss_distance_miles,
            "close_approach_date": closest_object.close_approach_date,
        } if closest_object else None,

        "fastest_object": {
            "name": fastest_object.name,
            "neo_reference_id": fastest_object.neo_reference_id,
            "relative_velocity_mph": fastest_object.relative_velocity_mph,
            "close_approach_date": fastest_object.close_approach_date,
        } if fastest_object else None,
    }