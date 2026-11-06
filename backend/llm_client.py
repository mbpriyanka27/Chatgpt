import os
import json
import asyncio
import threading
from typing import AsyncGenerator, List, Dict
from threading import Thread
import httpx
from dotenv import load_dotenv

load_dotenv()

# Hosted LLM Endpoint Configurations (Groq, OpenAI, Together AI, OpenRouter)
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY") or ""
LLM_BASE_URL = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "https://api.groq.com/openai/v1"
LLM_MODEL = os.getenv("LLM_MODEL") or "llama-3.3-70b-versatile"

# Global warmed in-memory model & tokenizer
_local_model = None
_local_tokenizer = None
_model_lock = threading.Lock()
_loading_event = threading.Event()
_is_loading = False


def preload_model():
    """Warms up local Qwen2.5-0.5B-Instruct into memory once at server startup."""
    global _local_model, _local_tokenizer, _is_loading
    with _model_lock:
        if _local_model is not None and _local_tokenizer is not None:
            return
        if _is_loading:
            return
        _is_loading = True

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        # Optimize CPU threads for sub-second generation
        num_cores = os.cpu_count() or 4
        torch.set_num_threads(min(4, num_cores))

        print("Preloading local inference model into RAM...")
        _local_tokenizer = AutoTokenizer.from_pretrained(
            "Qwen/Qwen2.5-0.5B-Instruct", 
            local_files_only=True
        )
        _local_model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-0.5B-Instruct", 
            dtype=torch.float32, 
            local_files_only=True
        )
        print("Local model engine ready (sub-second streaming enabled).")
    except Exception as e:
        print(f"Note: Local model could not be preloaded: {e}")
    finally:
        _loading_event.set()


async def stream_hosted_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 150,
    api_key: str = "",
    model: str = "",
    base_url: str = ""
) -> AsyncGenerator[str, None]:
    """
    Ultra-low latency streaming inference.
    - If user provides a custom API key (Groq, OpenAI, OpenRouter), streams from hosted cloud API.
    - Otherwise, streams token-by-token directly from warm in-memory engine with sub-second time-to-first-token!
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
            "max_tokens": min(max_tokens, 1024),
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
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
                        print(f"Hosted API error ({response.status_code}): {err_text.decode('utf-8', errors='ignore')}")
        except Exception as e:
            print(f"Hosted API exception: {e}")

    # Tier 2: Instant In-Memory Streaming with TextIteratorStreamer (Sub-second TTFT)
    global _local_model, _local_tokenizer, _is_loading
    if _local_model is None or _local_tokenizer is None:
        if _is_loading:
            # Wait for background warmup to finish without duplicate loading
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: _loading_event.wait(timeout=30))
        else:
            preload_model()

    if _local_model is not None and _local_tokenizer is not None:
        try:
            from transformers import TextIteratorStreamer
            import torch

            # Format messages using official chat template
            clean_msgs = []
            for m in messages:
                if m.get("content"):
                    clean_msgs.append({"role": m["role"], "content": m["content"]})
            
            prompt_str = _local_tokenizer.apply_chat_template(clean_msgs, tokenize=False, add_generation_prompt=True)
            inputs = _local_tokenizer(prompt_str, return_tensors="pt")

            streamer = TextIteratorStreamer(
                _local_tokenizer, 
                skip_prompt=True, 
                skip_special_tokens=True
            )

            generation_kwargs = dict(
                **inputs,
                streamer=streamer,
                max_new_tokens=min(max_tokens, 150),
                temperature=temperature if temperature > 0.1 else 0.7,
                do_sample=True if temperature > 0.1 else False,
                pad_token_id=_local_tokenizer.eos_token_id
            )

            # Run generate in dedicated worker thread
            thread = Thread(target=_local_model.generate, kwargs=generation_kwargs)
            thread.daemon = True
            thread.start()

            # Stream tokens immediately as generated without unnecessary sleeps
            loop = asyncio.get_event_loop()
            while True:
                token = await loop.run_in_executor(None, lambda: next(streamer, None))
                if token is None:
                    break
                yield token

            return
        except Exception as e:
            print(f"Local streamer error: {e}")

    # Tier 3: Emergency Fallback
    user_prompt = ""
    for m in reversed(messages):
        if m["role"] == "user":
            user_prompt = m["content"]
            break

    yield f"Processed: **{user_prompt}**. You can also connect a Groq or OpenAI API key in settings for live cloud acceleration."
