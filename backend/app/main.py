from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.models import NeoEvent, SolarFlareEvent
from app.routes.neows import router as neows_router
from app.routes.solar_flares import router as solar_flares_router

app = FastAPI(title="Astraeus Command API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(neows_router, prefix="/api/neows", tags=["NeoWs"])
app.include_router(
    solar_flares_router,
    prefix="/api/solar-flares",
    tags=["Solar Flares"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "app": "Astraeus Command",
        "message": "API online",
    }


@app.get("/api/health/db")
def health_db():
    return {
        "status": "ok",
        "database": "connected",
        "tables": ["neo_events", "solar_flare_events"],
    }