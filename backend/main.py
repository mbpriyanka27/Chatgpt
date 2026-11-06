import os
import json
import uuid
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import init_db, get_db, User, Chat, Message, Document, PasswordResetToken, SessionLocal
from auth import (
    hash_password, verify_password, create_access_token, 
    get_current_user, seed_demo_users
)
from llm_client import stream_hosted_llm, preload_model
from rag_service import UserVectorStore
from media_service import detect_image_prompt, generate_image, transcribe_audio_file
from multilingual_service import detect_language, translate_text, has_script_for_lang, LANGUAGE_NAMES
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(
    title="ChatGPT Enterprise Platform API",
    description="Production-ready FastAPI backend with hosted LLM inference, Image Generation, Audio Chatting, RAG, and PostgreSQL/SQLite support",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for generated images and user audio
media_path = Path("data/media")
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

@app.on_event("startup")
def on_startup():
    init_db()
    db = next(get_db())
    try:
        seed_demo_users(db)
    finally:
        db.close()
    
    # Preload inference engine into RAM at startup so first response is sub-second
    preload_model()


# ==========================================
# Pydantic Schemas
# ==========================================
class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = "User"

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    email: str
    display_name: Optional[str] = "Google User"
    photo_url: Optional[str] = ""

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    theme: Optional[str] = None
    default_system_prompt: Optional[str] = None
    temperature: Optional[float] = None

class CreateChatRequest(BaseModel):
    title: Optional[str] = "New Chat"

class RenameChatRequest(BaseModel):
    title: str

class ChatStreamRequest(BaseModel):
    chat_id: Optional[str] = None
    prompt: str
    use_rag: bool = False
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = 1024
    api_key: Optional[str] = None
    is_image_request: Optional[bool] = False
    is_voice_mode: Optional[bool] = False
    language: Optional[str] = None
    voice_language: Optional[str] = None

class ImageGenerateRequest(BaseModel):
    prompt: str
    chat_id: Optional[str] = None
    model: Optional[str] = "flux"
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    api_key: Optional[str] = None

class FeedbackRequest(BaseModel):
    feedback: str  # like, dislike, or empty


# ==========================================
# Authentication Endpoints
# ==========================================
@app.get("/api/health")
def health_check():
    return {"status": "ok", "platform": "ChatGPT Pro Hosted AI Platform", "time": datetime.datetime.utcnow().isoformat()}


@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account with this email already exists")
    
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    user = User(
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        display_name=req.display_name or req.email.split("@")[0].capitalize(),
        provider="email"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "theme": user.theme,
            "provider": user.provider
        }
    }


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user.last_login = datetime.datetime.utcnow()
    db.commit()
    
    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "theme": user.theme,
            "provider": user.provider,
            "default_system_prompt": user.default_system_prompt,
            "temperature": user.temperature
        }
    }


@app.post("/api/auth/google")
def google_auth(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        user = User(
            email=req.email.lower(),
            display_name=req.display_name,
            photo_url=req.photo_url or "https://lh3.googleusercontent.com/a/default-user",
            provider="google"
        )
        db.add(user)
    else:
        user.last_login = datetime.datetime.utcnow()
        if req.photo_url:
            user.photo_url = req.photo_url
            
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "theme": user.theme,
            "provider": user.provider
        }
    }


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user:
        # Avoid user enumeration in production
        return {"message": "If this email is registered, a password reset link has been dispatched."}
        
    reset_tok = str(uuid.uuid4())
    token_entry = PasswordResetToken(
        user_id=user.id,
        token=reset_tok,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    )
    db.add(token_entry)
    db.commit()
    return {
        "message": "Password reset token created successfully.",
        "reset_token": reset_tok
    }


@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == req.token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not token_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == token_entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = hash_password(req.new_password)
    token_entry.used = True
    db.commit()
    return {"message": "Password updated successfully. You can now log in."}


@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "photo_url": user.photo_url,
        "theme": user.theme,
        "provider": user.provider,
        "default_system_prompt": user.default_system_prompt,
        "temperature": user.temperature,
        "created_at": user.created_at.isoformat()
    }


@app.put("/api/auth/profile")
def update_profile(req: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.display_name is not None:
        user.display_name = req.display_name
    if req.theme is not None:
        user.theme = req.theme
    if req.default_system_prompt is not None:
        user.default_system_prompt = req.default_system_prompt
    if req.temperature is not None:
        user.temperature = req.temperature
    db.commit()
    return {"message": "Profile updated successfully"}


@app.delete("/api/auth/account")
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Remove files
    vstore = UserVectorStore(user.id)
    if vstore.user_dir.exists():
        import shutil
        shutil.rmtree(vstore.user_dir, ignore_errors=True)
    
    db.delete(user)
    db.commit()
    return {"message": "Account and all associated data permanently deleted"}


# ==========================================
# Chat Management Endpoints
# ==========================================
@app.get("/api/chats")
def list_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = db.query(Chat).filter(Chat.user_id == user.id).order_by(desc(Chat.is_pinned), desc(Chat.updated_at)).all()
    results = []
    for c in chats:
        last_msg = db.query(Message).filter(Message.chat_id == c.id).order_by(desc(Message.created_at)).first()
        results.append({
            "id": c.id,
            "title": c.title,
            "is_pinned": c.is_pinned,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "snippet": last_msg.content[:80] if last_msg else "Empty chat"
        })
    return results


@app.post("/api/chats")
def create_chat(req: CreateChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = Chat(user_id=user.id, title=req.title or "New Chat")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"id": chat.id, "title": chat.title, "is_pinned": chat.is_pinned, "created_at": chat.created_at.isoformat()}


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    messages = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at).all()
    msg_list = []
    for m in messages:
        msg_list.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources_json or "[]"),
            "feedback": m.feedback,
            "tokens": m.tokens,
            "created_at": m.created_at.isoformat()
        })
        
    return {
        "id": chat.id,
        "title": chat.title,
        "is_pinned": chat.is_pinned,
        "created_at": chat.created_at.isoformat(),
        "messages": msg_list
    }


@app.put("/api/chats/{chat_id}")
def rename_chat(chat_id: str, req: RenameChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    chat.title = req.title.strip() or "Untitled Chat"
    db.commit()
    return {"message": "Chat renamed", "title": chat.title}


@app.post("/api/chats/{chat_id}/pin")
def toggle_pin(chat_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    chat.is_pinned = not chat.is_pinned
    db.commit()
    return {"message": "Pin status updated", "is_pinned": chat.is_pinned}


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    db.delete(chat)
    db.commit()
    return {"message": "Chat deleted"}


@app.delete("/api/chats")
def clear_all_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Chat).filter(Chat.user_id == user.id).delete()
    db.commit()
    return {"message": "All conversations cleared"}


# ==========================================
# Real-Time Streaming Chat (SSE)
# ==========================================
@app.post("/api/chat/stream")
async def chat_stream(req: ChatStreamRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Resolve or create chat
    chat = None
    if req.chat_id:
        chat = db.query(Chat).filter(Chat.id == req.chat_id, Chat.user_id == user.id).first()
    if not chat:
        title = req.prompt[:35] + "..." if len(req.prompt) > 35 else req.prompt
        chat = Chat(user_id=user.id, title=title)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    # 2. Save user message to database
    user_msg = Message(
        chat_id=chat.id,
        role="user",
        content=req.prompt,
        tokens=len(req.prompt.split())
    )
    db.add(user_msg)
    chat.updated_at = datetime.datetime.utcnow()
    db.commit()

    # 3. Assemble multi-turn history memory and detect language
    target_lang = detect_language(req.prompt, req.language or req.voice_language)
    lang_label = LANGUAGE_NAMES.get(target_lang, target_lang)

    history_messages = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at).all()
    if req.is_voice_mode:
        if target_lang != 'en':
            llm_messages = [{"role": "system", "content": f"You are ChatGPT in real-time voice mode. The user spoke in {lang_label}. You MUST reply ONLY in {lang_label}. Reply in 1 short sentence (under 15 words) in {lang_label}. Never use English. Never use asterisks, emojis, bullet points, or markdown formatting."}]
        else:
            llm_messages = [{"role": "system", "content": "You are ChatGPT in real-time voice mode. Reply instantly, warmly, and naturally in 1 short sentence (under 15 words). Never use asterisks, emojis, bullet points, or markdown formatting."}]
    else:
        if target_lang != 'en':
            llm_messages = [{"role": "system", "content": f"You are ChatGPT. The user is writing in {lang_label}. You MUST reply strictly in {lang_label}. Never respond in English."}]
        else:
            llm_messages = [{"role": "system", "content": user.default_system_prompt or "You are ChatGPT, a helpful assistant."}]
    
    # 4. Handle RAG document injection if requested
    sources = []
    rag_context = ""
    if req.use_rag:
        vstore = UserVectorStore(user.id)
        matches = vstore.search(req.prompt, top_k=3)
        if matches:
            sources = [{"filename": m["filename"], "page": m["page"], "snippet": m["text"][:150] + "..."} for m in matches]
            docs_text = "\n\n".join([f"Source: {m['filename']} (Page {m['page']}):\n{m['text']}" for m in matches])
            rag_context = f"\n\nContext from user uploaded documents:\n{docs_text}\n\nWhen answering, cite the document name and page."
            llm_messages[0]["content"] += rag_context

    if req.is_voice_mode:
        # Micro-history for voice mode: only 1 prior turn so prompt tokens stay under 30 for < 200ms TTFT
        for m in history_messages[-2:]:
            llm_messages.append({"role": m.role, "content": m.content})
    else:
        for m in history_messages[-10:]:  # Last 10 turns for token budget
            llm_messages.append({"role": m.role, "content": m.content})

    # 5. Stream response generator (Text or Image)
    assistant_msg_id = str(uuid.uuid4())
    img_prompt = req.prompt if req.is_image_request else detect_image_prompt(req.prompt)

    if img_prompt:
        async def sse_image_generator():
            yield f"data: {json.dumps({'event': 'start', 'chat_id': chat.id, 'message_id': assistant_msg_id, 'sources': []})}\n\n"
            notice = f"🎨 Generating your requested AI image for: **\"{img_prompt}\"**...\n\n"
            yield f"data: {json.dumps({'event': 'chunk', 'text': notice})}\n\n"

            try:
                img_res = await generate_image(
                    prompt=img_prompt,
                    user_id=user.id,
                    model=req.model or "flux",
                    api_key=req.api_key or ""
                )
                img_markdown = f"![{img_prompt}]({img_res['url']})\n\n**Generated Image**: *{img_prompt}*\n\n*(Model: {img_res['model'].upper()} • Click to view full size)*"
                yield f"data: {json.dumps({'event': 'chunk', 'text': img_markdown})}\n\n"
                full_content = notice + img_markdown
            except Exception as e:
                err_text = f"⚠️ Image generation failed: {str(e)}"
                yield f"data: {json.dumps({'event': 'chunk', 'text': err_text})}\n\n"
                full_content = notice + err_text

            db_session = SessionLocal()
            try:
                asst_msg = Message(
                    id=assistant_msg_id,
                    chat_id=chat.id,
                    role="assistant",
                    content=full_content,
                    sources_json="[]",
                    tokens=len(full_content.split())
                )
                db_session.add(asst_msg)
                db_session.commit()
            finally:
                db_session.close()

            yield f"data: {json.dumps({'event': 'end', 'full_text': full_content})}\n\n"

        return StreamingResponse(sse_image_generator(), media_type="text/event-stream")
    
    async def sse_event_generator():
        collected_chunks = []
        # Initial metadata event: chat_id, message_id, sources, target_lang
        yield f"data: {json.dumps({'event': 'start', 'chat_id': chat.id, 'message_id': assistant_msg_id, 'sources': sources, 'target_lang': target_lang})}\n\n"
        
        voice_token_limit = 35 if req.is_voice_mode else (req.max_tokens or 1024)

        if req.is_voice_mode and target_lang != 'en':
            # In voice mode for non-English, buffer the short clause to guarantee native language output
            raw_chunks = []
            async for chunk in stream_hosted_llm(
                messages=llm_messages,
                temperature=req.temperature or user.temperature or 0.7,
                max_tokens=voice_token_limit,
                model=req.model or "",
                api_key=req.api_key or ""
            ):
                raw_chunks.append(chunk)

            raw_text = "".join(raw_chunks).strip()
            # If the model emitted English (0.5B fallback), translate immediately to native script
            if not has_script_for_lang(raw_text, target_lang):
                full_content = translate_text(raw_text, target_lang)
            else:
                full_content = raw_text

            # Stream words with natural cadence
            words = full_content.split(" ")
            for idx, word in enumerate(words):
                token = word if idx == 0 else " " + word
                collected_chunks.append(token)
                yield f"data: {json.dumps({'event': 'chunk', 'text': token})}\n\n"
        else:
            async for chunk in stream_hosted_llm(
                messages=llm_messages,
                temperature=req.temperature or user.temperature or 0.7,
                max_tokens=voice_token_limit,
                model=req.model or "",
                api_key=req.api_key or ""
            ):
                collected_chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'chunk', 'text': chunk})}\n\n"

            full_content = "".join(collected_chunks)
            if target_lang != 'en' and not has_script_for_lang(full_content, target_lang):
                translated = translate_text(full_content, target_lang)
                if translated and translated != full_content:
                    full_content = translated
                    yield f"data: {json.dumps({'event': 'replace', 'text': full_content})}\n\n"

        # Save assistant message in DB with its own session
        db_session = SessionLocal()
        try:
            asst_msg = Message(
                id=assistant_msg_id,
                chat_id=chat.id,
                role="assistant",
                content=full_content,
                sources_json=json.dumps(sources),
                tokens=len(full_content.split())
            )
            db_session.add(asst_msg)
            db_session.commit()
        finally:
            db_session.close()

        yield f"data: {json.dumps({'event': 'end', 'full_text': full_content})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@app.post("/api/image/generate")
async def generate_image_endpoint(
    req: ImageGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Direct API endpoint for image generation."""
    img_res = await generate_image(
        prompt=req.prompt,
        user_id=user.id,
        width=req.width or 1024,
        height=req.height or 1024,
        model=req.model or "flux",
        api_key=req.api_key or ""
    )
    return img_res


@app.post("/api/audio/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    user: User = Depends(get_current_user)
):
    """Audio transcription endpoint supporting voice chat and recorded audio."""
    contents = await file.read()
    transcription = await transcribe_audio_file(contents, file.filename or "recording.webm", api_key=api_key or "")
    return {"text": transcription}


@app.post("/api/messages/{message_id}/feedback")
def set_feedback(message_id: str, req: FeedbackRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).join(Chat).filter(Message.id == message_id, Chat.user_id == user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    msg.feedback = req.feedback
    db.commit()
    return {"message": "Feedback recorded", "feedback": msg.feedback}


# ==========================================
# Document Management & RAG
# ==========================================
@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_exts = [".pdf", ".docx", ".txt", ".csv", ".json"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(allowed_exts)}")

    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 25 MB")

    vstore = UserVectorStore(user.id)
    doc_meta = vstore.add_document(file.filename, contents)

    # Persist in DB
    existing = db.query(Document).filter(Document.user_id == user.id, Document.filename == doc_meta["filename"]).first()
    if existing:
        existing.pages_count = doc_meta["pages_count"]
        existing.chunks_count = doc_meta["chunks_count"]
        existing.file_size = doc_meta["file_size"]
        db_doc = existing
    else:
        db_doc = Document(
            user_id=user.id,
            filename=doc_meta["filename"],
            file_type=doc_meta["file_type"],
            file_size=doc_meta["file_size"],
            pages_count=doc_meta["pages_count"],
            chunks_count=doc_meta["chunks_count"]
        )
        db.add(db_doc)
        
    db.commit()
    db.refresh(db_doc)

    return {
        "id": db_doc.id,
        "filename": db_doc.filename,
        "file_type": db_doc.file_type,
        "file_size": db_doc.file_size,
        "pages_count": db_doc.pages_count,
        "chunks_count": db_doc.chunks_count,
        "uploaded_at": db_doc.uploaded_at.isoformat()
    }


@app.get("/api/documents")
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.user_id == user.id).order_by(desc(Document.uploaded_at)).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "pages_count": d.pages_count,
            "chunks_count": d.chunks_count,
            "uploaded_at": d.uploaded_at.isoformat()
        }
        for d in docs
    ]


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    vstore = UserVectorStore(user.id)
    vstore.delete_document(doc.filename)
    
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


# ==========================================
# Export Conversation (Markdown / JSON / PDF)
# ==========================================
@app.get("/api/chats/{chat_id}/export")
def export_chat(chat_id: str, format: str = Query("markdown", pattern="^(markdown|json|pdf)$"), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    messages = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at).all()

    if format == "json":
        data = {
            "title": chat.title,
            "created_at": chat.created_at.isoformat(),
            "messages": [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in messages]
        }
        return Response(content=json.dumps(data, indent=2), media_type="application/json", headers={"Content-Disposition": f"attachment; filename={chat.title}.json"})
        
    elif format == "markdown":
        md_lines = [f"# {chat.title}\n*Exported on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC*\n\n---\n"]
        for m in messages:
            author = "User" if m.role == "user" else "Assistant"
            md_lines.append(f"### {author}\n\n{m.content}\n\n---\n")
        content = "\n".join(md_lines)
        return Response(content=content, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={chat.title}.md"})

    elif format == "pdf":
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#10a37f'))
        user_style = ParagraphStyle('UserStyle', parent=styles['Normal'], fontName='Helvetica-Bold', textColor=colors.HexColor('#2563eb'))
        asst_style = ParagraphStyle('AsstStyle', parent=styles['Normal'], fontName='Helvetica', textColor=colors.HexColor('#1f2937'))

        story.append(Paragraph(chat.title, title_style))
        story.append(Spacer(1, 14))

        for m in messages:
            sender = "User:" if m.role == "user" else "ChatGPT:"
            story.append(Paragraph(sender, user_style if m.role == "user" else asst_style))
            # Clean newlines for ReportLab
            clean_text = m.content.replace('\n', '<br/>')
            story.append(Paragraph(clean_text, asst_style))
            story.append(Spacer(1, 10))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={chat.title}.pdf"})
