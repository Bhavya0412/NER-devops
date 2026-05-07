import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ner import extract_entities
from .schemas import AnalyzeRequest, AnalyzeResponse

load_dotenv()

app = FastAPI(title="NER AI Service", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest):
    entities = extract_entities(payload.text)
    return {"entities": entities}


@app.post("/analyze-hindi")
def analyze_hindi(payload: dict):
    raise HTTPException(
        status_code=501,
        detail="Hindi NER disabled in this deployment to optimize container size."
    )
