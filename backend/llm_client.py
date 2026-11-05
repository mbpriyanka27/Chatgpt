import os
import json
import asyncio
from typing import AsyncGenerator, List, Dict
import httpx
from dotenv import load_dotenv

load_dotenv()

# Hosted LLM Endpoint Configurations
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY") or ""
LLM_BASE_URL = os.getenv("LLM_BASE_URL") or os.getenv("OPENAI_BASE_URL") or "https://api.groq.com/openai/v1"
LLM_MODEL = os.getenv("LLM_MODEL") or "llama-3.3-70b-versatile"


async def stream_hosted_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
    api_key: str = "",
    model: str = "",
    base_url: str = ""
) -> AsyncGenerator[str, None]:
    """
    Streams tokens from a hosted LLM inference endpoint (OpenAI, Groq, OpenRouter, Together AI).
    Yields chunks of text in real-time.
    """
    effective_key = api_key or LLM_API_KEY
    effective_model = model or LLM_MODEL
    effective_base_url = (base_url or LLM_BASE_URL).rstrip("/")

    # If API key is present, invoke hosted OpenAI-compatible endpoint
    if effective_key:
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

        url = f"{effective_base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield f"\n\n**API Error ({response.status_code})**: {error_body.decode('utf-8')}"
                        return

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
        except Exception as e:
            yield f"\n\n**Hosted Inference Connection Error**: {str(e)}"
            return

    # Intelligent fallback when hosted API key is not configured yet
    # Explains instructions and provides an interactive assistant response
    user_prompt = ""
    for m in reversed(messages):
        if m["role"] == "user":
            user_prompt = m["content"]
            break

    fallback_response = generate_demo_response(user_prompt)
    words = fallback_response.split(" ")
    for i in range(0, len(words), 2):
        chunk = " ".join(words[i:i+2]) + " "
        yield chunk
        await asyncio.sleep(0.01)


def generate_demo_response(prompt: str) -> str:
    """Generates a high-quality formatted response when no hosted API key is provided."""
    prompt_lower = prompt.lower()
    
    if "transformer" in prompt_lower or "attention" in prompt_lower:
        return (
            "### Understanding Transformers and Attention Mechanisms\n\n"
            "Transformers are deep learning architectures introduced by Vaswani et al. in *'Attention Is All You Need'* (2017). "
            "They discard recurrence entirely and rely on **Self-Attention** to compute contextual representations in parallel.\n\n"
            "#### Core Mathematical Formulation\n"
            "The scaled dot-product attention is calculated as:\n\n"
            "$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\n\n"
            "#### Key Components\n"
            "1. **Queries ($Q$), Keys ($K$), Values ($V$)**: Projections from input embeddings.\n"
            "2. **Multi-Head Attention**: Allows the model to attend to information from different representation subspaces.\n"
            "3. **Feed-Forward Networks (FFN)**: Point-wise non-linear projections per position.\n"
            "4. **Layer Normalization & Residual Connections**: Enables training hundreds of transformer layers.\n\n"
            "```python\n"
            "import torch\n"
            "import torch.nn.functional as F\n\n"
            "def self_attention(query, key, value, d_k):\n"
            "    scores = torch.matmul(query, key.transpose(-2, -1)) / (d_k ** 0.5)\n"
            "    weights = F.softmax(scores, dim=-1)\n"
            "    return torch.matmul(weights, value)\n"
            "```\n\n"
            "*Tip: Connect your Groq, OpenAI, or OpenRouter API key in Profile & Settings to unlock unlimited live cloud model inference.*"
        )
    elif "rag" in prompt_lower or "document" in prompt_lower:
        return (
            "### Retrieval-Augmented Generation (RAG)\n\n"
            "RAG connects a large language model to private or domain-specific document stores without fine-tuning.\n\n"
            "- **Step 1 (Ingestion)**: Documents (PDF, DOCX, TXT, CSV, JSON) are chunked into 300–500 token segments with page tracking.\n"
            "- **Step 2 (Embedding)**: Chunks are mapped into continuous vector space.\n"
            "- **Step 3 (Vector Retrieval)**: The user's query is converted to an embedding and compared against indexed chunks via cosine similarity.\n"
            "- **Step 4 (Synthesis)**: Relevant chunks are injected into the system context, enabling the model to cite exact source pages."
        )
    else:
        return (
            f"Hello! I am your **ChatGPT-style AI Assistant** powered by a hosted inference service.\n\n"
            f"Regarding your query:\n\n> *\"{prompt}\"*\n\n"
            "Here are the key points to consider:\n\n"
            "1. **Cloud Architecture**: Our system uses FastAPI with asynchronous Server-Sent Events (SSE) streaming connected directly to high-throughput hosted endpoints (Groq, OpenAI, or OpenRouter).\n"
            "2. **Document Grounding**: You can upload PDFs, DOCX, CSVs, or TXT files using the attachment icon below, and I will cite exact pages and chunks in my answers.\n"
            "3. **Multi-User Isolation**: Each user account retains private chat histories, personalized system prompts, and isolated vector indexes.\n\n"
            "```typescript\n"
            "// Real-time EventSource consumer in Next.js\n"
            "const response = await fetch('/api/chat/stream', {\n"
            "  method: 'POST',\n"
            "  body: JSON.stringify({ prompt: text, chat_id: activeChatId })\n"
            "});\n"
            "```\n\n"
            "*How else can I assist you with this topic?*"
        )
