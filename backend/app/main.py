import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Base, engine
from app.routes.patients import router as patients_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create missing tables without deleting existing records.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Patient Admission Management API",
    description="API for managing hospital patient admissions.",
    version="1.1.0",
    lifespan=lifespan,
)

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
allowed_origins = list(dict.fromkeys(default_origins + configured_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Patient Admission Management API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}


app.include_router(patients_router)
