import fitz  # PyMuPDF
import uuid
from app.services import (
    openai_client,
    search_client,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT
)


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    text = ""

    for page in doc:
        text += page.get_text()

    return text


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - overlap

    return chunks


def generate_embedding(text: str):
    response = openai_client.embeddings.create(
        model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        input=text
    )
    return response.data[0].embedding


def upload_chunks(chunks, source_name: str):
    docs = []

    for chunk in chunks:
        embedding = generate_embedding(chunk)

        docs.append({
            "id": str(uuid.uuid4()),
            "content": chunk,
            "source": source_name,
            "embedding": embedding,
        })

    search_client.upload_documents(documents=docs)


def ingest_pdf(file_path: str, source_name: str):
    print("📄 Extracting text...")
    text = extract_text_from_pdf(file_path)
    print("📏 Extracted text length:", len(text))

    print("✂️ Chunking...")
    chunks = chunk_text(text)
    print("🧩 Number of chunks:", len(chunks))

    if not chunks:
        raise Exception("No readable text found in PDF. It may be image-based, encrypted, or empty.")

    print("🧠 Uploading to Azure AI Search...")
    upload_chunks(chunks, source_name=source_name)

    print("✅ Done!")