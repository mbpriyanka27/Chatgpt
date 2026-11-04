import os
from threading import Thread
from typing import List, Dict, Any, Tuple
import torch
from transformers import AutoModelForCausalLM, TextIteratorStreamer

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"
os.environ["HF_HUB_DISABLE_FAST_DOWNLOAD"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

@torch.no_grad()
def load_model(model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"):
    """
    Loads causal language model with appropriate precision and device placement.
    Falls back to 0.5B if 1.5B is unavailable or fails due to memory.
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    try:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=dtype,
            attn_implementation="eager",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
            local_files_only=True
        )
    except Exception:
        try:
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=dtype,
                attn_implementation="eager",
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )
        except Exception as e:
            print(f"Warning: Failed loading {model_name} ({e}). Falling back to Qwen2.5-0.5B-Instruct...")
            model = AutoModelForCausalLM.from_pretrained(
                "Qwen/Qwen2.5-0.5B-Instruct",
                torch_dtype=dtype,
                attn_implementation="eager",
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                local_files_only=True
            )

    model.to(device)
    model.eval()
    return model

def build_chat_prompt(tokenizer, messages: List[Dict[str, str]]) -> str:
    """
    Applies the model's native chat template (Qwen ChatML) to format multi-turn history.
    """
    try:
        return tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
    except Exception:
        # Fallback manual ChatML formatting if template fails
        formatted = ""
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            formatted += f"<|im_start|>{role}\n{content}<|im_end|>\n"
        formatted += "<|im_start|>assistant\n"
        return formatted

def stream_chat_response(
    model,
    tokenizer,
    messages: List[Dict[str, str]],
    max_new_tokens: int = 512,
    temperature: float = 0.7,
    top_p: float = 0.9,
    top_k: int = 50
) -> Tuple[TextIteratorStreamer, Thread]:
    """
    Streams multi-turn conversational responses using TextIteratorStreamer.
    """
    prompt = build_chat_prompt(tokenizer, messages)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True
    )
    
    # Configure generation parameters
    gen_kwargs = {
        **inputs,
        "streamer": streamer,
        "max_new_tokens": max_new_tokens,
        "pad_token_id": tokenizer.eos_token_id,
        "use_cache": True
    }
    
    if temperature > 0:
        gen_kwargs["do_sample"] = True
        gen_kwargs["temperature"] = float(temperature)
        gen_kwargs["top_p"] = float(top_p)
        gen_kwargs["top_k"] = int(top_k)
    else:
        gen_kwargs["do_sample"] = False

    thread = Thread(target=model.generate, kwargs=gen_kwargs)
    thread.start()
    return streamer, thread

@torch.no_grad()
def generate_response(
    model,
    tokenizer,
    messages: List[Dict[str, str]],
    max_new_tokens: int = 512,
    temperature: float = 0.7,
    top_p: float = 0.9,
    top_k: int = 50
) -> str:
    """
    Generates complete response synchronously for a multi-turn conversation.
    """
    prompt = build_chat_prompt(tokenizer, messages)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    gen_kwargs = {
        **inputs,
        "max_new_tokens": max_new_tokens,
        "pad_token_id": tokenizer.eos_token_id,
        "use_cache": True
    }
    if temperature > 0:
        gen_kwargs["do_sample"] = True
        gen_kwargs["temperature"] = float(temperature)
        gen_kwargs["top_p"] = float(top_p)
        gen_kwargs["top_k"] = int(top_k)
    else:
        gen_kwargs["do_sample"] = False

    outputs = model.generate(**gen_kwargs)
    input_length = inputs.input_ids.shape[1]
    return tokenizer.decode(outputs[0][input_length:], skip_special_tokens=True)

@torch.no_grad()
def get_model_internals(model, tokenizer, prompt: str):
    """
    Legacy helper for X-Ray extraction on single prompt string.
    """
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=128).to(model.device)
    outputs = model(**inputs, output_attentions=True, output_hidden_states=True)
    return outputs, inputs

@torch.no_grad()
def simulate_generation_steps(model, tokenizer, prompt: str, max_steps: int = 5):
    """
    Legacy helper for step-by-step generation simulation.
    """
    from xray import simulate_token_generation
    return simulate_token_generation(model, tokenizer, prompt, max_steps=max_steps)
