import torch
import numpy as np
from typing import Dict, Any, List, Optional
from tokenizer import get_tokens

@torch.no_grad()
def analyze_input_internals(model, tokenizer, text: str, max_tokens: int = 128) -> Dict[str, Any]:
    """
    Runs forward pass on prompt/text with output_attentions=True and output_hidden_states=True.
    Returns comprehensive inspection data for LLM X-Ray.
    """
    # Truncate text if very long for fast inspection response
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=max_tokens).to(model.device)
    input_ids = inputs.input_ids[0].tolist()
    tokens = tokenizer.convert_ids_to_tokens(input_ids)
    decoded_tokens = [tokenizer.decode([tid]) for tid in input_ids]

    outputs = model(**inputs, output_attentions=True, output_hidden_states=True)

    # 1. Embedding data
    # Hugging Face causal LM input embeddings: model.get_input_embeddings()(inputs.input_ids)
    embed_layer = model.get_input_embeddings()
    embeddings = embed_layer(inputs.input_ids)[0] # Shape: (seq_len, hidden_dim)
    
    emb_dim = embeddings.shape[-1]
    emb_np = embeddings.detach().cpu().float().numpy()
    
    token_stats = []
    for i, tid in enumerate(input_ids):
        vec = emb_np[i]
        token_stats.append({
            "token": tokens[i],
            "display": decoded_tokens[i],
            "id": tid,
            "min": float(np.min(vec)),
            "max": float(np.max(vec)),
            "mean": float(np.mean(vec)),
            "std": float(np.std(vec)),
            "norm": float(np.linalg.norm(vec))
        })

    # 2. Attention layers info
    attentions = outputs.attentions # tuple of (batch, num_heads, seq_len, seq_len)
    num_layers = len(attentions) if attentions is not None else 0
    num_heads = attentions[0].shape[1] if (attentions is not None and len(attentions) > 0) else 0

    # 3. Next token predictions (Logits & Probabilities)
    last_logits = outputs.logits[0, -1, :].float()
    probs = torch.nn.functional.softmax(last_logits, dim=-1)
    
    top_k = 10
    top_probs, top_indices = torch.topk(probs, top_k)
    top_probs = top_probs.detach().cpu().numpy()
    top_indices = top_indices.detach().cpu().numpy()
    
    predictions = []
    for p, idx in zip(top_probs, top_indices):
        token_str = tokenizer.decode([idx])
        predictions.append({
            "token": repr(token_str) if token_str.strip() == "" else token_str,
            "token_id": int(idx),
            "prob": float(p),
            "percentage": f"{p * 100:.1f}%",
            "logit": float(last_logits[idx].detach().cpu().numpy())
        })

    # 4. Hidden states info
    hidden_states = outputs.hidden_states # tuple of (batch, seq_len, hidden_dim)
    num_hidden_layers = len(hidden_states) if hidden_states is not None else 0

    return {
        "text": text,
        "input_ids": input_ids,
        "tokens": tokens,
        "decoded_tokens": decoded_tokens,
        "seq_len": len(input_ids),
        "embedding_dim": emb_dim,
        "token_stats": token_stats,
        "embeddings_tensor": embeddings.detach().cpu(),
        "attentions": attentions,
        "num_layers": num_layers,
        "num_heads": num_heads,
        "predictions": predictions,
        "num_hidden_layers": num_hidden_layers,
        "hidden_states": [h.detach().cpu() for h in hidden_states] if hidden_states else []
    }

@torch.no_grad()
def simulate_token_generation(model, tokenizer, prompt: str, max_steps: int = 5) -> List[Dict[str, Any]]:
    """
    Simulates sequential token-by-token generation showing top candidates at each step.
    """
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=128).to(model.device)
    curr_ids = inputs.input_ids
    steps = []
    generated_text = ""

    for step_num in range(1, max_steps + 1):
        outputs = model(input_ids=curr_ids)
        next_logits = outputs.logits[0, -1, :].float()
        probs = torch.nn.functional.softmax(next_logits, dim=-1)
        
        # Best token
        best_id = torch.argmax(next_logits).item()
        best_token = tokenizer.decode([best_id])
        generated_text += best_token
        
        # Top 5 candidates for this step
        top_probs, top_indices = torch.topk(probs, 5)
        candidates = []
        for p, idx in zip(top_probs.tolist(), top_indices.tolist()):
            c_str = tokenizer.decode([idx])
            candidates.append({
                "token": repr(c_str) if c_str.strip() == "" else c_str,
                "prob": p,
                "percentage": f"{p*100:.1f}%"
            })
            
        steps.append({
            "step": step_num,
            "chosen_token": best_token,
            "current_text": prompt + generated_text,
            "candidates": candidates
        })
        
        # Append best token
        next_id_tensor = torch.tensor([[best_id]], device=model.device)
        curr_ids = torch.cat([curr_ids, next_id_tensor], dim=1)
        if best_id == tokenizer.eos_token_id:
            break

    return steps

