🚀 Azure RAG AI App (ChatGPT-Style with PDF Intelligence)

A full-stack AI application that combines Azure OpenAI + Azure AI Search to build a ChatGPT-like experience with document intelligence (RAG).

Upload PDFs, ask questions, and get context-aware answers with real-time streaming.

🔥 Features
💬 ChatGPT-style UI with streaming responses
📄 Upload PDFs and ask questions (RAG)
🧠 Hybrid AI:
Uses your documents when relevant
Falls back to general AI knowledge
🔍 Vector search using Azure AI Search
⚡ FastAPI backend with real-time streaming
🎨 Premium UI (React + Tailwind)
🌙 Light / Dark mode
🧠 Architecture
Frontend (React)
      ↓
FastAPI Backend
      ↓
Azure OpenAI (LLM + Embeddings)
      ↓
Azure AI Search (Vector DB)
🛠️ Tech Stack
Frontend
React (Vite)
Tailwind CSS
React Markdown
Backend
FastAPI (Python)
Uvicorn
AI & Cloud
Azure OpenAI (GPT + embeddings)
Azure AI Search (vector search)
📂 Project Structure
azure-rag-app/
│
├── frontend/          # React UI
│   ├── src/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI entry
│   │   ├── services.py    # RAG logic
│   │   ├── ingest.py      # PDF ingestion
│   │   └── __init__.py
│   ├── venv/
│   └── requirements.txt
│
└── README.md
⚙️ Setup Instructions
1️⃣ Clone Repo
git clone https://github.com/your-username/azure-rag-app.git
cd azure-rag-app
2️⃣ Backend Setup
cd backend

python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
Create .env
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_DEPLOYMENT=your_gpt_deployment
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=your_embedding_model

AZURE_SEARCH_ENDPOINT=your_search_endpoint
AZURE_SEARCH_KEY=your_search_key
AZURE_SEARCH_INDEX_NAME=docs-index
Run Backend
python -m uvicorn app.main:app --reload

👉 Runs on:
http://127.0.0.1:8000

3️⃣ Frontend Setup
cd frontend

npm install
npm run dev

👉 Runs on:
http://localhost:5173

📄 How It Works (RAG Flow)
User uploads PDF
Text is extracted & chunked
Embeddings generated via Azure OpenAI
Stored in Azure AI Search
On query:
retrieve relevant chunks
send to LLM
generate contextual answer
💡 Example Use Cases
📑 Document Q&A
📊 Business reports summarization
📘 Knowledge base assistant
📄 Resume / policy analysis
📚 Study material assistant
🚀 Deployment (Recommended)
Frontend → Azure Static Web Apps
Backend → Azure App Service
Domain → Custom domain (www + api)
🔮 Future Improvements
📌 Page-level citations
🖼️ OCR for scanned PDFs
💾 Chat history & sessions
🔐 Authentication
📊 Monitoring & logging
🧠 Advanced RAG (re-ranking)
👨‍💻 About

Built as part of my transition from DevOps/Cloud Engineering → AI Engineering, focusing on building real-world AI systems.

⭐ Support

If you found this helpful:

⭐ Star the repo
🔗 Connect with me on LinkedIn
🚀 Share feedback!