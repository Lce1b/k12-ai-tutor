"""
K12 AI Teaching Assistant — FastAPI Backend.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db, init_schema, close_db
from routers.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_schema()
    yield
    await close_db()


app = FastAPI(title="K12 AI Tutor", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "K12 AI Tutor"}
