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


class SolarFlareEvent(Base):
    __tablename__ = "solar_flare_events"

    id = Column(Integer, primary_key=True, index=True)

    flr_id = Column(String, unique=True, index=True)

    begin_time = Column(DateTime, index=True)
    peak_time = Column(DateTime, index=True)
    end_time = Column(DateTime, index=True)

    class_type = Column(String, index=True)
    source_location = Column(String)

    active_region_num = Column(Integer)

    linked_events = Column(String)

    link = Column(String)

    fetched_at = Column(DateTime, index=True)


class CmeEvent(Base):
    __tablename__ = "cme_events"

    id = Column(Integer, primary_key=True, index=True)

    cme_id = Column(String, unique=True, index=True)

    start_time = Column(DateTime, index=True)

    source_location = Column(String)
    active_region_num = Column(Integer)

    instruments = Column(String)

    linked_events = Column(String)

    note = Column(String)

    link = Column(String)

    fetched_at = Column(DateTime, index=True)