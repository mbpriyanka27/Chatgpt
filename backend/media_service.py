import os
import re
import uuid
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any
import httpx

MEDIA_DIR = Path("data/media")
IMAGES_DIR = MEDIA_DIR / "images"
AUDIO_DIR = MEDIA_DIR / "audio"

IMAGES_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

def detect_image_prompt(prompt: str) -> Optional[str]:
    """
    Checks if a user prompt is asking to generate an image.
    Supports natural English, /image commands, Kannada, and Hindi.
    """
    cleaned = prompt.strip()
    if not cleaned:
        return None

    # 1. Direct slash commands: /image, /draw, /img, /paint, /pic, /generate
    cmd_match = re.match(r"^/(?:image|img|draw|paint|generate|pic|photo)\s+(.+)$", cleaned, re.IGNORECASE)
    if cmd_match:
        return cmd_match.group(1).strip()

    # 2. Kannada keywords: ಚಿತ್ರ (image/drawing), ಫೋಟೋ (photo), ಡ್ರಾಯಿಂಗ್
    if any(k in cleaned for k in ["ಚಿತ್ರ", "ಫೋಟೋ", "ಡ್ರಾಯಿಂಗ್", "ಡ್ರಾ"]):
        kn = re.sub(r"(?:ದಯವಿಟ್ಟು\s+)?(?:ಒಂದು\s+)?(?:ಚಿತ್ರ|ಫೋಟೋ|ಡ್ರಾಯಿಂಗ್|ಬಿಡಿಸಿ|ರಚಿಸಿ|ತೋರಿಸಿ|ಕೊಡಿ|ರಚಿಸು|ಮಾಡು)", "", cleaned).strip()
        if len(kn) > 1:
            return kn

    # 3. Hindi keywords: तस्वीर, चित्र, फोटो
    if any(k in cleaned for k in ["तस्वीर", "चित्र", "फोटो"]):
        hi = re.sub(r"(?:कृपया\s+)?(?:एक\s+)?(?:की\s+)?(?:तस्वीर|चित्र|फोटो|बनाओ|दिखाओ|खींचो|दीजिए)", "", cleaned).strip()
        if len(hi) > 1:
            return hi

    # 4. "draw / paint / sketch / illustrate ..." (e.g. "draw a cute cat", "can you draw a car")
    p1 = re.match(
        r"^(?:(?:can|could|will)\s+you\s+)?(?:please\s+)?(?:draw|paint|illustrate|sketch)\s+(?:me\s+)?(?:an?\s+)?(.+)$",
        cleaned,
        re.IGNORECASE
    )
    if p1:
        return p1.group(1).strip()

    # 5. "... (generate|create|make|show|render|give me) ... (image|picture|photo|illustration|art|drawing|wallpaper) ... of ..."
    p2 = re.match(
        r"^(?:(?:can|could|will)\s+you\s+)?(?:please\s+)?(?:i\s+want\s+(?:an?\s+)?|i\s+need\s+(?:an?\s+)?|give\s+me\s+(?:an?\s+)?|show\s+(?:me\s+)?(?:an?\s+)?|generate\s+(?:an?\s+)?|create\s+(?:an?\s+)?|make\s+(?:an?\s+)?|render\s+(?:an?\s+)?)(?:an?\s+)?(?:image|picture|photo|illustration|art|drawing|wallpaper|portrait|graphic|pic)s?\s*(?:of|showing|depicting|about|with)?\s*(.+)$",
        cleaned,
        re.IGNORECASE
    )
    if p2:
        return p2.group(1).strip()

    # 6. Direct "image / picture / photo / wallpaper of ..."
    p3 = re.match(
        r"^(?:an?\s+)?(?:image|picture|photo|drawing|illustration|sketch|wallpaper|portrait)\s+(?:of|showing|about|depicting|with)\s*(.+)$",
        cleaned,
        re.IGNORECASE
    )
    if p3:
        return p3.group(1).strip()

    return None


async def generate_image(
    prompt: str,
    user_id: str = "default",
    width: int = 1024,
    height: int = 1024,
    model: str = "flux",
    api_key: str = ""
) -> Dict[str, Any]:
    """
    Generates a high-quality AI image from prompt.
    - If api_key (OpenAI) provided: uses DALL-E 3 API.
    - Otherwise: uses high-performance Pollinations Flux/SDXL engine (free, instant).
    Saves image locally for permanent caching and offline accessibility.
    """
    image_id = str(uuid.uuid4())
    user_img_dir = IMAGES_DIR / user_id
    user_img_dir.mkdir(parents=True, exist_ok=True)
    local_filename = f"{image_id}.jpg"
    local_path = user_img_dir / local_filename

    # If prompt is in Kannada, Hindi, etc., translate to English for visual synthesis
    prompt_for_gen = prompt
    if any(ord(c) > 127 for c in prompt):
        try:
            from multilingual_service import translate_text
            translated = translate_text(prompt, "en")
            if translated and len(translated.strip()) > 1:
                prompt_for_gen = translated.strip()
        except Exception:
            pass

    # Option 1: OpenAI DALL-E 3 if key is provided and requested
    if api_key and (api_key.startswith("sk-") and "proj" in api_key or len(api_key) > 40) and model == "dall-e-3":
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "dall-e-3",
                        "prompt": prompt_for_gen,
                        "n": 1,
                        "size": f"{width}x{height}",
                        "quality": "standard"
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    remote_url = data["data"][0]["url"]
                    # Download locally
                    img_res = await client.get(remote_url)
                    if img_res.status_code == 200:
                        local_path.write_bytes(img_res.content)
                        return {
                            "image_id": image_id,
                            "url": f"/media/images/{user_id}/{local_filename}",
                            "remote_url": remote_url,
                            "prompt": prompt,
                            "model": "dall-e-3"
                        }
        except Exception as e:
            print(f"DALL-E generation failed, falling back to Flux: {e}")

    # Option 2: Pollinations Flux Engine (High fidelity, sub-2s, free)
    encoded_prompt = urllib.parse.quote(prompt_for_gen.strip())
    seed = int(time.time() * 1000) % 10000000
    pollinations_url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?width={width}&height={height}&seed={seed}&nologo=true&model={model}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ChatGPT-Pro/3.0"}
            img_res = await client.get(pollinations_url, headers=headers)
            if img_res.status_code == 200 and len(img_res.content) > 1000:
                local_path.write_bytes(img_res.content)
                return {
                    "image_id": image_id,
                    "url": f"/media/images/{user_id}/{local_filename}",
                    "remote_url": pollinations_url,
                    "prompt": prompt,
                    "model": model
                }
    except Exception as e:
        print(f"Error downloading image locally: {e}")

    # Fallback return direct pollinations URL if local download timed out
    return {
        "image_id": image_id,
        "url": pollinations_url,
        "remote_url": pollinations_url,
        "prompt": prompt,
        "model": model
    }


async def transcribe_audio_file(
    file_bytes: bytes,
    filename: str,
    api_key: str = ""
) -> str:
    """
    Transcribes audio using Groq Whisper / OpenAI Whisper if API key available.
    """
    effective_key = api_key or os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY") or ""
    
    # Check if we can use Groq Whisper (ultra-fast transcription)
    if effective_key and effective_key.startswith("gsk_"):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, file_bytes, "audio/webm")}
                data = {"model": "whisper-large-v3-turbo"}
                res = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {effective_key}"},
                    files=files,
                    data=data
                )
                if res.status_code == 200:
                    return res.json().get("text", "")
        except Exception as e:
            print(f"Groq Whisper error: {e}")

    # If OpenAI key
    if effective_key and effective_key.startswith("sk-"):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, file_bytes, "audio/webm")}
                data = {"model": "whisper-1"}
                res = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {effective_key}"},
                    files=files,
                    data=data
                )
                if res.status_code == 200:
                    return res.json().get("text", "")
        except Exception as e:
            print(f"OpenAI Whisper error: {e}")

    return "Audio clip received. (For cloud transcription, add a free Groq or OpenAI key in Settings)."
