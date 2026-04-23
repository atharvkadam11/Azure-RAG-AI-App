import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

load_dotenv()

AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

AZURE_SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
AZURE_SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")
AZURE_SEARCH_INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX_NAME")

openai_client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    api_version="2024-02-15-preview",
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
)

search_client = SearchClient(
    endpoint=AZURE_SEARCH_ENDPOINT,
    index_name=AZURE_SEARCH_INDEX_NAME,
    credential=AzureKeyCredential(AZURE_SEARCH_KEY),
)

LATEST_UPLOADED_SOURCE = None


def set_latest_uploaded_source(source_name: str):
    global LATEST_UPLOADED_SOURCE
    LATEST_UPLOADED_SOURCE = source_name
    print("📌 Latest uploaded source set to:", LATEST_UPLOADED_SOURCE)


def get_latest_uploaded_source():
    return LATEST_UPLOADED_SOURCE


def retrieve_context_from_source(source_name: str, top_k: int = 5):
    source_name_safe = source_name.replace("'", "''")

    results = search_client.search(
        search_text="*",
        filter=f"source eq '{source_name_safe}'",
        select=["id", "content", "source"],
        top=top_k,
    )

    chunks = []
    for doc in results:
        chunks.append({
            "id": doc["id"],
            "content": doc["content"],
            "source": doc["source"],
            "score": doc.get("@search.score", 0),
        })

    return chunks


def retrieve_context(question: str, top_k: int = 3):
    embedding_response = openai_client.embeddings.create(
        model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        input=question
    )

    question_vector = embedding_response.data[0].embedding

    results = search_client.search(
        search_text=question,
        vector_queries=[
            VectorizedQuery(
                vector=question_vector,
                k_nearest_neighbors=top_k,
                fields="embedding"
            )
        ],
        select=["id", "content", "source"],
        top=top_k,
    )

    chunks = []
    for doc in results:
        chunks.append({
            "id": doc["id"],
            "content": doc["content"],
            "source": doc["source"],
            "score": doc.get("@search.score", 0),
        })

    return chunks


def build_context_text(chunks):
    if not chunks:
        return ""

    return "\n\n".join(
        [f"[Source: {item['source']}]\n{item['content']}" for item in chunks]
    )


def question_refers_to_uploaded_doc(question: str) -> bool:
    q = question.lower()
    triggers = [
        "uploaded document",
        "uploaded pdf",
        "this pdf",
        "this document",
        "the pdf",
        "the document",
        "summarize the document",
        "summarize the pdf",
        "what is this pdf about",
        "what is this document about",
        "give key points",
        "summarize the uploaded document",
    ]
    return any(t in q for t in triggers)


def get_chunks_for_question(question: str, top_k: int = 3):
    latest_source = get_latest_uploaded_source()

    if latest_source and question_refers_to_uploaded_doc(question):
        chunks = retrieve_context_from_source(latest_source, top_k=5)
    else:
        chunks = retrieve_context(question, top_k=top_k)

    return chunks


def build_prompts(question: str, top_k: int = 3):
    chunks = get_chunks_for_question(question, top_k=top_k)
    context = build_context_text(chunks)

    if chunks:
        system_prompt = (
            "You are a helpful assistant. "
            "First answer the user's question in a clear, direct, well-structured way. "
            "Use the provided context when relevant, and especially prioritize it for uploaded PDF/document questions. "
            "Do not just repeat raw retrieved chunks. "
            "Summarize, explain, and synthesize the information naturally."
        )
        user_prompt = f"Context:\n{context}\n\nQuestion:\n{question}"
    else:
        system_prompt = (
            "You are a helpful assistant. "
            "Answer the user's question clearly and accurately."
        )
        user_prompt = question

    return system_prompt, user_prompt, chunks


def answer_question(question: str, top_k: int = 3):
    system_prompt, user_prompt, chunks = build_prompts(question, top_k=top_k)

    response = openai_client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )

    return {
        "question": question,
        "answer": response.choices[0].message.content,
        "sources": chunks,
    }


def stream_answer(question: str, top_k: int = 3):
    system_prompt, user_prompt, chunks = build_prompts(question, top_k=top_k)

    stream = openai_client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        stream=True,
    )

    def generate():
        yield json.dumps({"type": "sources", "sources": chunks}) + "\n"

        full_text = ""

        for chunk in stream:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            if not delta:
                continue

            content = getattr(delta, "content", None)
            if content:
                full_text += content
                yield json.dumps({"type": "token", "content": content}) + "\n"

        if not full_text.strip():
            # fallback answer if stream yields no visible text
            fallback = answer_question(question, top_k=top_k)["answer"]
            yield json.dumps({"type": "token", "content": fallback}) + "\n"

        yield json.dumps({"type": "done"}) + "\n"

    return generate()