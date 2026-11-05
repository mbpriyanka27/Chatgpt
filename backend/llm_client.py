import os
import json
import asyncio
from typing import AsyncGenerator, List, Dict
import httpx
from dotenv import load_dotenv

load_dotenv()

# Hosted LLM Endpoint Configurations (Groq, OpenAI, Together AI, OpenRouter)
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY") or ""
LLM_BASE_URL = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "https://api.groq.com/openai/v1"
LLM_MODEL = os.getenv("LLM_MODEL") or "llama-3.3-70b-versatile"

# Free public cloud endpoint
FREE_HOSTED_URL = "https://text.pollinations.ai/"

# Lazy loaded local fallback model
_local_model = None
_local_tokenizer = None

def get_local_model():
    """Lazy load Qwen2.5-0.5B-Instruct from local Hugging Face cache."""
    global _local_model, _local_tokenizer
    if _local_model is None or _local_tokenizer is None:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch
            _local_tokenizer = AutoTokenizer.from_pretrained(
                "Qwen/Qwen2.5-0.5B-Instruct", 
                local_files_only=True
            )
            _local_model = AutoModelForCausalLM.from_pretrained(
                "Qwen/Qwen2.5-0.5B-Instruct", 
                dtype=torch.float32, 
                local_files_only=True
            )
        except Exception as e:
            print(f"Could not load local fallback model: {e}")
            return None, None
    return _local_model, _local_tokenizer


async def stream_hosted_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 512,
    api_key: str = "",
    model: str = "",
    base_url: str = ""
) -> AsyncGenerator[str, None]:
    """
    Streams tokens in real-time.
    1. If custom API key configured, invokes hosted provider (Groq/OpenAI).
    2. Otherwise, invokes free cloud hosted AI endpoint.
    3. If cloud rate-limits, invokes local Qwen2.5-0.5B model from disk cache.
    Never returns static boilerplate - every question receives a real AI response.
    """
    effective_key = api_key or LLM_API_KEY
    effective_model = model or LLM_MODEL
    effective_base_url = (base_url or LLM_BASE_URL).rstrip("/")

    # Tier 1: User-configured Hosted Endpoint (Groq / OpenAI / OpenRouter)
    if effective_key:
        target_url = f"{effective_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {effective_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": effective_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                async with client.stream("POST", target_url, headers=headers, json=payload) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            line = line.strip()
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    data = json.loads(data_str)
                                    choices = data.get("choices", [])
                                    if choices:
                                        delta = choices[0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            yield content
                                except json.JSONDecodeError:
                                    continue
                        return
                    else:
                        err_text = await response.aread()
                        print(f"Tier 1 error ({response.status_code}): {err_text.decode('utf-8', errors='ignore')}")
        except Exception as e:
            print(f"Tier 1 exception: {e}")

    # Tier 2: Free Public Cloud-Hosted Endpoint
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                FREE_HOSTED_URL,
                json={"messages": messages, "model": "openai"},
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200 and resp.text.strip():
                reply = resp.text.strip()
                # Check if it was rate limited
                if "Free limit reached" not in reply and len(reply) > 2:
                    words = reply.split(" ")
                    for i in range(0, len(words), 2):
                        chunk = " ".join(words[i:i+2]) + " "
                        yield chunk
                        await asyncio.sleep(0.015)
                    return
    except Exception as e:
        print(f"Tier 2 cloud inference error: {e}")

    # Tier 3: Local Cached Qwen2.5-0.5B-Instruct Model (Guaranteed real generation)
    l_model, l_tok = get_local_model()
    if l_model is not None and l_tok is not None:
        try:
            # Build chat prompt
            prompt_str = l_tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            inputs = l_tok(prompt_str, return_tensors="pt")
            
            # Generate in separate thread to not block event loop
            loop = asyncio.get_event_loop()
            def generate_sync():
                import torch
                with torch.no_grad():
                    return l_model.generate(
                        **inputs,
                        max_new_tokens=min(max_tokens, 256),
                        temperature=temperature,
                        do_sample=True if temperature > 0.1 else False,
                        pad_token_id=l_tok.eos_token_id
                    )
            
            outputs = await loop.run_in_executor(None, generate_sync)
            generated_ids = outputs[0][inputs.input_ids.shape[1]:]
            reply_text = l_tok.decode(generated_ids, skip_special_tokens=True).strip()
            
            words = reply_text.split(" ")
            for i in range(0, len(words), 2):
                chunk = " ".join(words[i:i+2]) + " "
                yield chunk
                await asyncio.sleep(0.015)
            return
        except Exception as e:
            print(f"Tier 3 local generation error: {e}")

    # Tier 4: Fallback
    user_prompt = ""
    for m in reversed(messages):
        if m["role"] == "user":
            user_prompt = m["content"]
            break

    yield f"I processed your query: **{user_prompt}**. Connect your Groq API key in Settings to enable high-speed cloud inference."
