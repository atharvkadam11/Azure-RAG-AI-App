from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import shutil
import os

from app.services import (
    answer_question,
    set_latest_uploaded_source,
    stream_answer,
)
from app.ingest import ingest_pdf

app = FastAPI(
    title="Azure RAG API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(default=3)


@app.get("/")
def root():
    return {"message": "RAG API running"}


@app.post("/ask")
def ask(request: AskRequest):
    try:
        result = answer_question(request.question, request.top_k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask-stream")
def ask_stream(request: AskRequest):
    try:
        generator = stream_answer(request.question, request.top_k)
        return StreamingResponse(generator, media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    print("🔥 UPLOAD API CALLED")

    try:
        file_location = f"temp_{file.filename}"
        print("📁 Saving file:", file_location)

        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print("📄 Calling ingest_pdf...")
        ingest_pdf(file_location, source_name=file.filename)

        set_latest_uploaded_source(file.filename)

        print("🧹 Cleaning temp file")
        os.remove(file_location)

        return {"message": f"{file.filename} uploaded and indexed successfully"}

    except Exception as e:
        print("❌ ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))