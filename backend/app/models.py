from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from app.db import Base


class NeoEvent(Base):
    __tablename__ = "neo_events"

    id = Column(Integer, primary_key=True, index=True)

    neo_reference_id = Column(String, index=True)
    name = Column(String, index=True)
    nasa_jpl_url = Column(String)
    is_hazardous = Column(Boolean, default=False, index=True)

    close_approach_datetime = Column(DateTime, index=True)
    close_approach_date = Column(String, index=True)

    relative_velocity_mph = Column(Float)
    miss_distance_miles = Column(Float)

    estimated_diameter_min_ft = Column(Float)
    estimated_diameter_max_ft = Column(Float)

    fetched_at = Column(DateTime, index=True)