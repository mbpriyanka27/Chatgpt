# ChatGPT Core Platform

A clean, modular architectural scaffold for building a ChatGPT-inspired AI application using **React, TypeScript, Tailwind CSS, and FastAPI**.

---

## Project Structure

```text
chatgpt-core/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers & endpoints
│   │   │   ├── health.py # System health check
│   │   │   └── router.py # Aggregated API router
│   │   ├── core/         # Settings, security, config
│   │   │   └── config.py # Pydantic environment settings
│   │   ├── models/       # Pydantic data schemas
│   │   │   └── health.py # Health response model
│   │   ├── services/     # Business logic & AI pipelines (ready for LLM/RAG)
│   │   └── main.py       # FastAPI application entry point
│   ├── requirements.txt  # Python backend dependencies
│   └── .env.example      # Environment variables template
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/   # AppShell, Header
    │   │   └── ui/       # Button, Badge
    │   ├── hooks/        # useHealth & custom hooks
    │   ├── services/     # Typed API client
    │   ├── types/        # TypeScript interfaces
    │   ├── App.tsx       # Root layout & status dashboard
    │   ├── main.tsx      # Application entry point
    │   └── index.css     # Tailwind CSS styles
    ├── package.json      # Frontend dependencies & scripts
    ├── tsconfig.json     # Strict TypeScript configuration
    ├── vite.config.ts    # Build & dev server configuration
    └── .env.example      # Frontend environment template
```

---

## Getting Started

### 1. Backend (FastAPI)
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Frontend (React + TypeScript)
```bash
cd frontend
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## Architectural Highlights
- **Strict Typing**: End-to-end data safety with TypeScript interfaces on the client and Pydantic models on the server.
- **Modular Design**: Clear separation of concerns between API routing, business services, configuration, and UI components.
- **Extensible**: Pre-configured structure ready to integrate OpenAI/Groq streaming endpoints, pgvector RAG services, and Google OAuth authentication.
