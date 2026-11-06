# ChatGPT Pro — Enterprise Multi-User AI Platform (Project Phase 3)

A high-performance, full-stack **ChatGPT-style AI web application** built with a **Next.js + React + TypeScript** frontend, a **FastAPI** Python backend, and support for **PostgreSQL** (with zero-configuration SQLite fallback) and **Hosted LLM Endpoints**.

Users can access the application through the web without installing local PyTorch models or requiring a dedicated GPU.

---

## 🌟 Key Features

### 1. Modern ChatGPT-Style Interface (No Streamlit)
- **Authentic ChatGPT UI**: Dark/Light executive theme, responsive mobile drawer, smooth transitions, and keyboard shortcuts (`Ctrl+Shift+O` for new chat, `Ctrl+K` for search).
- **Welcome Screen**: Dynamic greeting (`Good morning/afternoon/evening, <name>`) with 4 interactive starter prompt cards.
- **Rich Message Presentation**:
  - Full Markdown rendering (headings, tables, blockquotes, bullet & numbered lists).
  - Code syntax highlighting with language badges and one-click **Copy code** button.
  - Streaming cursor animation (`▍`) and real-time token rendering.
  - Interactive toolbar: **Copy**, **Regenerate**, **Edit prompt**, and **Thumbs Up / Down** feedback.
  - **Stop Generating** control (`■ Stop generating`) during active streaming.

### 2. AI Image Generation Engine
- **Conversational & One-Click Generation**:
  - Automatically detects natural language image requests (e.g., `"draw a cute red panda wearing glasses"`, `"/image cybernetic metropolis at sunset"`).
  - Dedicated **🎨 Image** tool button in the prompt toolbar.
  - Powered by high-fidelity **Flux / SDXL** generation engine with optional **OpenAI DALL-E 3** support.
- **Interactive Image Cards**:
  - Full inline preview with shimmer loading state.
  - One-click **Save / Download** button.
  - Click to open a full-resolution **Lightbox Zoom Modal**.
  - Local disk caching under `/media/images/<user_id>/` for permanent offline access.

### 3. Real-Time Audio Chatting & Voice Mode
- **Two-Way ChatGPT Voice Mode**:
  - Dedicated **🎙️ Voice Mode** with central animated pulsating sound wave orb and real-time audio state indicator (`Listening...`, `Thinking...`, `Speaking...`).
  - Hands-free natural conversational loop: user speaks -> automatically transcribes -> streams answer -> speaks back response out loud -> listens for next turn.
- **Speech-to-Text Microphone Dictation**:
  - In-line microphone button with pulsing red audio ring for real-time speech transcription into prompt box.
- **Text-to-Speech (Audio Voice Output)**:
  - Speaker icon (**🔊**) on every assistant response for instant read-aloud audio with pause/resume controls.
  - **🔊 Audio Auto-Speak** toggle in the top bar to automatically vocalize all incoming AI responses.

### 4. Hosted LLM Inference Service
- **Deployable & GPU-Free**: Runs against any high-throughput OpenAI-compatible hosted API endpoint:
  - **Groq** (`llama-3.3-70b-versatile`)
  - **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
  - **OpenRouter / Hugging Face Serverless** (`qwen/qwen-2.5-72b-instruct`)
- **Server-Sent Events (SSE)**: True token-by-token streaming via FastAPI `StreamingResponse`.
- **Zero-Setup Cloud Demo Mode**: Includes an intelligent built-in cloud assistant fallback if no API key is entered immediately.

### 3. Multi-User Authentication & Security
- **Email + Password Signup & Login**: Secure password hashing with PBKDF2 HMAC-SHA256 and unique cryptographic salts.
- **Google Sign-In**: Instant OAuth onboarding.
- **Session Management**: Cryptographically signed JWT Bearer tokens with 7-day expiration.
- **Forgot Password**: Password reset request and token verification workflow.
- **One-Click Demo Accounts**: Pre-seeded `alice@example.com` and `bob@example.com` (`password123`) for immediate testing of data isolation.

### 4. Persistent Conversations & Multi-Turn Memory
- **Full History**: Chats are saved with auto-generated titles from initial questions.
- **Date Grouping**: Organizes conversations into *Pinned*, *Today*, *Yesterday*, *Previous 7 Days*, and *Older*.
- **Chat Actions**: Pin, inline rename, delete conversation, or clear all history.
- **Conversation Memory**: Feeds previous conversational turns into prompt context.

### 5. Document Management & RAG Grounding
- **Supported Formats**: `.pdf`, `.docx`, `.txt`, `.csv`, `.json` (up to 25 MB).
- **Chunking & Page Tracking**: Overlapping semantic segmentation preserving exact source page numbers.
- **Per-User Isolation**: Each user gets a dedicated document store and vector index (`data/users/<uid>/`).
- **Citation Chips**: Grounded answers display interactive chips (`📄 paper.pdf · p.4`) that expand to reveal the underlying source excerpt.
- **Toggle Control**: "Search my documents" checkbox per query.

### 6. Export Capabilities
- Export any conversation directly to **Markdown (`.md`)**, **PDF**, or **JSON**.

---

## 🏗️ Architecture

```
LLM-XRay/
├── backend/
│   ├── main.py              # FastAPI application & REST/SSE endpoints
│   ├── database.py          # SQLAlchemy PostgreSQL & SQLite models
│   ├── auth.py              # JWT authentication & PBKDF2 password hashing
│   ├── llm_client.py        # Hosted LLM streaming client (Groq, OpenAI, etc.)
│   ├── rag_service.py       # Document parsing, chunking & semantic search
│   ├── test_phase3.py       # Automated validation suite (6/6 tests)
│   ├── requirements.txt     # Backend dependencies
│   └── Dockerfile           # Backend container build
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx   # Root layout & metadata
│   │   │   ├── page.tsx     # Main ChatGPT interface
│   │   │   └── globals.css  # Dark theme styles & design tokens
│   │   └── components/
│   │       ├── Sidebar.tsx  # Chat list, search, pinning, user menu
│   │       ├── AuthModal.tsx # Login / Signup / Google OAuth / Demo accounts
│   │       ├── DocumentManagerModal.tsx # Drag-and-drop RAG upload
│   │       ├── ProfileSettingsModal.tsx # Inference settings & user profile
│   │       ├── MarkdownRenderer.tsx     # Markdown & syntax code blocks
│   │       └── Icons.tsx    # Lightweight inline SVG icon library
│   ├── package.json
│   └── Dockerfile           # Next.js production container build
│
├── docker-compose.yml       # 1-click Docker orchestration (Postgres + Backend + Frontend)
├── .env.example             # Template for hosted API keys & database URLs
├── start_chatgpt.bat        # Windows one-click desktop launcher
└── README.md
```

---

## 🚀 Quickstart Guide

### Option 1: Local Development (Fastest)

#### 1. Start the FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- API is live at `http://localhost:8000`
- Interactive Swagger docs at `http://localhost:8000/docs`

#### 2. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
- Application is live at `http://localhost:3000`

Or simply double-click `start_chatgpt.bat` on Windows.

---

### Option 2: Docker Compose (Production / Cloud)

Run all services including PostgreSQL with a single command:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## ⚙️ Environment Variables (`.env`)

```ini
# PostgreSQL Database (e.g., Supabase, Neon, Render, Railway)
# Leave empty or omit to automatically use local SQLite (chatgpt.db)
DATABASE_URL=postgresql://chatgpt_user:chatgpt_password_2026@localhost:5432/chatgpt_db

# Security
JWT_SECRET_KEY=super-secret-chatgpt-jwt-key-2026

# Hosted LLM Inference Service (OpenAI-compatible)
LLM_API_KEY=gsk_your_groq_api_key_or_openai_key
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🧪 Automated Test Suite

Run the full end-to-end verification suite:
```bash
cd backend
python test_phase3.py
```

Validates:
1. Database initialization and demo account seeding (`Alice` & `Bob`).
2. PBKDF2 HMAC-SHA256 password hashing & JWT token verification.
3. Multi-turn conversation persistence.
4. RAG document chunking and semantic query search.
5. Strict multi-user data isolation (User B cannot access User A's index).
6. Hosted LLM Server-Sent Events streaming token generator.
