from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import embed, health, ocr, detect_card, contacts_ocr, contacts_cards


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Flow API", version="1.0.0", lifespan=lifespan)

# CORS — allow all origins without credentials (wildcard + credentials is invalid)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ocr.router, prefix="/api/v1")
app.include_router(embed.router, prefix="/api/v1")
app.include_router(detect_card.router, prefix="/api/v1")
app.include_router(contacts_ocr.router, prefix="/api")
app.include_router(contacts_cards.router, prefix="/api")
