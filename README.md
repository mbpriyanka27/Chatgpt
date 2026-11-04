# LocalGPT Pro — Secure, Multi-User Local AI Assistant with Firebase Authentication and Advanced UI

> **Project Phase 3 Upgrade**  
> Turns LocalGPT into a secure, multi-user product: every user signs in with Google or Email through Firebase Authentication, enjoys strict data isolation across personal workspaces (private chats, private documents, and private FAISS vector indices), and interacts with a redesigned ChatGPT-style interface with LLM X-Ray inspection.

---

## 🌟 What's New in Phase 3 (LocalGPT Pro)

| Feature | Phase 2 (LocalGPT) | Phase 3 (LocalGPT Pro) |
| :--- | :--- | :--- |
| **Authentication** | No login | Google Sign-In + Email/Password via Firebase |
| **User Space** | Single shared user | Multiple isolated users, each with private workspaces |
| **Data Isolation** | Shared database rows | Every chat, message, document, and FAISS index keyed by verified `uid` |
| **UI Design** | Default Streamlit look | Custom theme, dark/light mode tokens, avatars, styled bubbles |
| **Chat Management** | Simple list | Search (`Ctrl+K`), Pinned chats, Date groups (Today, Yesterday, 7 Days) |
| **Document System** | Basic sidebar uploader | Dedicated Document Manager, drag-and-drop progress, per-chat RAG toggle |
| **X-Ray Panel** | Separate full-page tabs | Collapsible inline drawer next to/below each response |
| **Settings** | Global settings | Per-user saved hyperparameters and default system prompts |
| **Chat Export** | None | Export conversations as formatted Markdown (`.md`) and styled PDF (`.pdf`) |
| **Security Layer** | Open | Protected routes (`require_login()`), verified JWT tokens, strict file isolation |

---

## 🏗️ Architecture & Technology Stack

```
LocalGPT-Pro/
├── app.py                     # Entry point & router (protected routes)
│
├── auth/                      # Firebase & Authentication Layer
│   ├── firebase_config.py     # Loads config from .env
│   ├── firebase_admin_init.py # Initializes Firebase Admin SDK & verifies tokens
│   ├── auth_component.html    # Firebase JS SDK (Google Popup, Email forms)
│   ├── auth.py                # Session handling, token processing, logout
│   └── guards.py              # require_login() route guard
│
├── pages/                     # Application Screens
│   ├── login.py               # Custom branded login, signup & forgot password
│   ├── workspace.py           # Main chat canvas with streaming & message controls
│   ├── documents.py           # Drag-and-drop document manager & FAISS indexing
│   └── profile.py             # User profile, custom system prompts & danger zone
│
├── ui/                        # Presentation Components
│   ├── theme.py               # Dark/Light theme design tokens
│   ├── components.py          # Welcome screen, source chips, inline X-Ray drawer
│   └── sidebar.py             # Search, pinned chats, date groups, user menu
│
├── assets/                    # Styling Assets
│   ├── style.css              # Custom styling, fonts, cards, animations
│   └── logo.svg               # Vector brand logo
│
├── model.py, tokenizer.py, chat.py, memory.py
├── document_loader.py, embeddings.py, vector_store.py, rag.py
├── xray.py, visualization.py
├── database.py                # SQLite schema with users, chats, messages, documents, settings
├── export.py                  # Markdown and ReportLab PDF exporter
├── requirements.txt           # Dependencies
└── data/
    └── users/
        └── <uid>/             # Isolated user directory
            ├── documents/     # Private raw documents
            ├── faiss_index/   # Private FAISS vector indices
            └── exports/       # Private chat exports
```

---

## 🔑 Firebase Setup Instructions

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project named `localgpt-pro`.
2. Navigate to **Authentication → Sign-in method** and enable:
   - **Google**
   - **Email/Password**
3. Under **Authentication → Settings → Authorized domains**, ensure `localhost` is listed.
4. Under **Project settings → General → Your apps**, add a Web app and copy your configuration into `.env`:
   ```env
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=localgpt-pro.firebaseapp.com
   FIREBASE_PROJECT_ID=localgpt-pro
   FIREBASE_APP_ID=your_app_id
   GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
   ```
5. Under **Project settings → Service accounts**, click **Generate new private key** and save it as `serviceAccountKey.json` in the project root.

---

## 🚀 Running the Application

```bash
streamlit run app.py
```

The application is accessible at:
👉 **http://localhost:8501**
