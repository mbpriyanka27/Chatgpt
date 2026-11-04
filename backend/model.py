import os
import time
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from tokenizer import get_token_info
import visualization as viz

# Optimize PyTorch CPU threading
if not torch.cuda.is_available():
    torch.set_num_threads(max(1, (os.cpu_count() or 4)))

# Global state store for instantaneous UI queries without re-inferring
_model = None
_tokenizer = None
_latest_state = {
    "prompt": "",
    "tokens": [],
    "input_ids": [],
    "tokens_meta": [],
    "forward_outputs": None,
    "last_updated": 0
}

def load_model_and_tokenizer(model_name="Qwen/Qwen2.5-0.5B-Instruct"):
    """
    Loads the Hugging Face model and tokenizer.
    Uses eager attention implementation to enable output_attentions=True.
    """
    global _model, _tokenizer
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer

    print(f"Loading model '{model_name}'...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Use float32 on CPU for optimal native AVX speed; float16 on GPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto" if device == "cuda" else None,
        dtype=dtype,
        attn_implementation="eager"
    )
    model.eval()
    
    _model = model
    _tokenizer = tokenizer
    print(f"Model loaded successfully on {device} (dtype: {dtype}).")
    return _model, _tokenizer


def get_model_info():
    """
    Returns architecture details and configuration of the loaded model.
    """
    global _model, _tokenizer
    if _model is None:
        return {"loaded": False}
        
    cfg = _model.config
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    return {
        "loaded": True,
        "model_name": getattr(cfg, "_name_or_path", "Qwen/Qwen2.5-0.5B-Instruct"),
        "model_type": getattr(cfg, "model_type", "qwen2"),
        "num_layers": getattr(cfg, "num_hidden_layers", 24),
        "num_heads": getattr(cfg, "num_attention_heads", 14),
        "num_kv_heads": getattr(cfg, "num_key_value_heads", 2),
        "hidden_size": getattr(cfg, "hidden_size", 896),
        "vocab_size": getattr(cfg, "vocab_size", 151936),
        "device": device
    }


def generate_response(
    model, 
    tokenizer, 
    prompt, 
    temperature=0.7, 
    top_k=50, 
    top_p=0.9, 
    max_new_tokens=35, 
    concise=True
):
    """
    Generates response from model and extracts forward states for inspection.
    """
    global _latest_state
    start_time = time.time()
    
    # Format prompt
    if concise:
        messages = [
            {"role": "system", "content": "You are a concise AI assistant. Answer directly and concisely in 1-2 short sentences."},
            {"role": "user", "content": prompt}
        ]
        formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    else:
        formatted = prompt
        
    inputs = tokenizer(formatted, return_tensors="pt").to(model.device)
    raw_prompt_inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    # Forward pass of raw prompt to obtain attention maps and hidden states
    with torch.no_grad():
        forward_outputs = model(
            **raw_prompt_inputs,
            output_attentions=True,
            output_hidden_states=True
        )
        
    forward_time = time.time() - start_time
    
    # Autoregressive generation
    gen_start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature if temperature > 0 else 1.0,
            top_k=top_k if temperature > 0 else 50,
            top_p=top_p if temperature > 0 else 1.0,
            do_sample=(temperature > 0.0),
            pad_token_id=tokenizer.eos_token_id,
            use_cache=True
        )
    gen_time = time.time() - gen_start
    total_time = time.time() - start_time
    
    generated_sequence = outputs[0]
    new_token_ids = generated_sequence[inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(new_token_ids, skip_special_tokens=True)
    
    # Extract prompt tokens and metadata
    tokens, input_ids, tokens_meta = get_token_info(tokenizer, prompt)
    
    # Cache state for fast sub-millisecond dynamic inspection queries
    _latest_state.clear()
    _latest_state.update({
        "prompt": prompt,
        "tokens": tokens,
        "input_ids": input_ids,
        "tokens_meta": tokens_meta,
        "forward_outputs": forward_outputs,
        "last_updated": time.time()
    })
    
    tok_per_sec = len(new_token_ids) / max(0.001, gen_time)
    
    return {
        "response_text": response_text,
        "tokens": tokens,
        "input_ids": input_ids,
        "tokens_meta": tokens_meta,
        "generated_sequence": new_token_ids,
        "forward_outputs": forward_outputs,
        "metrics": {
            "total_latency_ms": round(total_time * 1000, 1),
            "generation_latency_ms": round(gen_time * 1000, 1),
            "forward_latency_ms": round(forward_time * 1000, 1),
            "prompt_tokens": len(input_ids),
            "generated_tokens": len(new_token_ids),
            "tokens_per_second": round(tok_per_sec, 2)
        }
    }


def inspect_cached_attention(layer: int = 0, head: int = 0):
    """
    Instantly returns attention matrix and metrics for any layer and head
    from the cached forward pass.
    """
    global _latest_state
    if _latest_state["forward_outputs"] is None:
        return {"error": "No prompt has been processed yet."}
        
    return viz.get_attention_data(
        _latest_state["forward_outputs"].attentions,
        _latest_state["tokens"],
        layer=layer,
        head=head,
        tokens_meta=_latest_state["tokens_meta"]
    )


def inspect_cached_layer_state(layer: int = 0):
    """
    Instantly returns 2D PCA projection of hidden states at any layer (0..num_layers)
    from the cached forward pass.
    """
    global _latest_state
    if _latest_state["forward_outputs"] is None:
        return {"error": "No prompt has been processed yet."}
        
    return viz.get_hidden_states_data(
        _latest_state["forward_outputs"].hidden_states,
        _latest_state["tokens"],
        layer=layer,
        tokens_meta=_latest_state["tokens_meta"]
    )

def get_latest_state():
    global _latest_state
    return _latest_state
