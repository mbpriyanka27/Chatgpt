import numpy as np
import torch
import math

def compute_pca_2d(tensor_2d):
    """
    Computes 2D PCA projection for a tensor of shape (N, D).
    Returns coordinates (N, 2) and explained variance ratio.
    """
    N, D = tensor_2d.shape
    if N < 2:
        # Not enough points for PCA, return zeros
        coords = np.zeros((N, 2), dtype=float)
        return coords, 1.0, 0.0

    X_mean = torch.mean(tensor_2d, dim=0)
    X_centered = tensor_2d - X_mean
    
    q = min(2, N, D)
    # Use torch.pca_lowrank for fast, stable PCA
    U, S, V = torch.pca_lowrank(X_centered, q=q, center=False)
    coords_tensor = torch.matmul(X_centered, V[:, :2])
    coords = coords_tensor.cpu().numpy()
    
    # Pad to 2D if N=1 or q=1
    if coords.shape[1] < 2:
        coords = np.pad(coords, ((0, 0), (0, 2 - coords.shape[1])), mode='constant')
        
    # Approximate explained variance
    total_var = torch.sum(X_centered ** 2).item()
    if total_var > 1e-9:
        var_components = (S ** 2).cpu().numpy()
        var_pc1 = float(var_components[0] / total_var) if len(var_components) > 0 else 0.0
        var_pc2 = float(var_components[1] / total_var) if len(var_components) > 1 else 0.0
    else:
        var_pc1, var_pc2 = 0.5, 0.5

    return coords, var_pc1, var_pc2


def get_tokenization_data(tokens, input_ids, tokens_meta=None):
    return {
        "tokens": tokens,
        "input_ids": [int(x) for x in input_ids],
        "tokens_meta": tokens_meta or [],
        "total_tokens": len(tokens)
    }


def get_embeddings_data(hidden_states, tokens, tokens_meta=None):
    """
    Hidden states layer 0 corresponds to the initial token embeddings.
    """
    embeddings = hidden_states[0][0].float().cpu()
    dim = int(embeddings.shape[1])
    seq_len = len(tokens)
    
    coords, var1, var2 = compute_pca_2d(embeddings)
    norms = torch.norm(embeddings, dim=1).numpy()
    
    points = []
    for i in range(seq_len):
        meta = tokens_meta[i] if tokens_meta and i < len(tokens_meta) else {}
        points.append({
            "index": i,
            "token": tokens[i],
            "display": meta.get("display", tokens[i]),
            "x": round(float(coords[i, 0]), 4),
            "y": round(float(coords[i, 1]), 4),
            "norm": round(float(norms[i]), 3)
        })
        
    return {
        "dimension": dim,
        "seq_len": seq_len,
        "var_pc1": round(var1, 3),
        "var_pc2": round(var2, 3),
        "points": points
    }


def get_attention_data(attentions, tokens, layer=0, head=0, tokens_meta=None):
    """
    Extracts attention matrix for specified layer and head.
    If head == -1, returns the mean across all attention heads in that layer.
    """
    num_layers = len(attentions)
    if layer < 0 or layer >= num_layers:
        return {"error": f"Layer {layer} out of bounds (0..{num_layers-1})"}
    
    # attentions[layer] shape: (batch_size, num_heads, seq_len, seq_len)
    layer_attn = attentions[layer][0].float().cpu()
    num_heads = layer_attn.shape[0]
    seq_len = layer_attn.shape[1]
    
    is_average = False
    if head == -1 or head >= num_heads:
        # Compute mean across all heads
        attn_matrix = torch.mean(layer_attn, dim=0).numpy()
        head_label = "Average (All Heads)"
        is_average = True
    else:
        attn_matrix = layer_attn[head].numpy()
        head_label = f"Head {head}"
        
    # Round matrix values for compact JSON payload
    matrix_rounded = [[round(float(val), 4) for val in row] for row in attn_matrix]
    
    # Calculate analytical metrics
    # 1. Self-attention ratio (mean of diagonal)
    diagonal = np.diag(attn_matrix)
    self_attn_ratio = float(np.mean(diagonal)) if len(diagonal) > 0 else 0.0
    
    # 2. Shannon Entropy per query token (dispersion)
    entropies = []
    for row in attn_matrix:
        row_safe = np.clip(row, 1e-9, 1.0)
        ent = -np.sum(row_safe * np.log2(row_safe))
        entropies.append(float(ent))
    avg_entropy = float(np.mean(entropies)) if entropies else 0.0
    
    # 3. Peak off-diagonal attended token pair
    max_weight = -1.0
    top_pair = {"query_idx": 0, "key_idx": 0, "query_token": "", "key_token": "", "weight": 0.0}
    for i in range(seq_len):
        for j in range(seq_len):
            if i != j and attn_matrix[i, j] > max_weight:
                max_weight = attn_matrix[i, j]
                top_pair = {
                    "query_idx": i,
                    "key_idx": j,
                    "query_token": tokens[i],
                    "key_token": tokens[j],
                    "weight": round(float(max_weight), 4)
                }

    return {
        "layer": layer,
        "head": head,
        "head_label": head_label,
        "is_average": is_average,
        "num_layers": num_layers,
        "num_heads": num_heads,
        "tokens": tokens,
        "tokens_meta": tokens_meta or [],
        "matrix": matrix_rounded,
        "metrics": {
            "self_attention_ratio": round(self_attn_ratio, 4),
            "average_entropy": round(avg_entropy, 3),
            "max_attended_pair": top_pair
        }
    }


def get_hidden_states_data(hidden_states, tokens, layer=12, tokens_meta=None):
    """
    Extracts 2D PCA representation of hidden states for any layer (0..num_layers).
    Layer 0 = Input Embedding, Layer N = Final transformer block output.
    """
    num_layers = len(hidden_states)
    if layer < 0 or layer >= num_layers:
        return {"error": f"Layer {layer} out of bounds (0..{num_layers-1})"}
    
    h_states = hidden_states[layer][0].float().cpu()
    seq_len = len(tokens)
    
    coords, var1, var2 = compute_pca_2d(h_states)
    norms = torch.norm(h_states, dim=1).numpy()
    
    # Calculate drift from previous layer if available
    drift = None
    if layer > 0:
        prev_h = hidden_states[layer - 1][0].float().cpu()
        cos_sim = torch.nn.functional.cosine_similarity(h_states, prev_h, dim=1).numpy()
        drift = round(float(np.mean(1.0 - cos_sim)), 4)
        
    points = []
    for i in range(seq_len):
        meta = tokens_meta[i] if tokens_meta and i < len(tokens_meta) else {}
        points.append({
            "index": i,
            "token": tokens[i],
            "display": meta.get("display", tokens[i]),
            "x": round(float(coords[i, 0]), 4),
            "y": round(float(coords[i, 1]), 4),
            "norm": round(float(norms[i]), 3)
        })

    return {
        "layer": layer,
        "num_layers": num_layers,
        "var_pc1": round(var1, 3),
        "var_pc2": round(var2, 3),
        "layer_drift": drift,
        "points": points
    }


def get_logits_data(logits, tokenizer, top_k=10, temperature=1.0):
    """
    Returns top-k predicted candidates for the next token with probabilities.
    Supports dynamic temperature scaling.
    """
    last_step_logits = logits[0, -1, :].float().cpu().numpy()
    
    # Apply temperature
    temp = max(0.05, float(temperature))
    scaled_logits = last_step_logits / temp
    
    # Numerically stable softmax
    exp_logits = np.exp(scaled_logits - np.max(scaled_logits))
    probs = exp_logits / exp_logits.sum()
    
    top_indices = np.argsort(probs)[-top_k:][::-1]
    top_probs = probs[top_indices]
    top_raw_logits = last_step_logits[top_indices]
    
    items = []
    cum_prob = 0.0
    for rank, (idx, p, raw_l) in enumerate(zip(top_indices, top_probs, top_raw_logits), start=1):
        cum_prob += float(p)
        token_str = tokenizer.decode([idx])
        display_str = token_str.replace(" ", "␣").replace("\n", "↵")
        if not display_str:
            display_str = f"<id:{idx}>"
            
        items.append({
            "rank": rank,
            "token_id": int(idx),
            "token": token_str,
            "display": display_str,
            "probability": round(float(p), 4),
            "logit": round(float(raw_l), 2),
            "cumulative_prob": round(cum_prob, 4)
        })
        
    return items


def get_generation_data(prompt, generated_tokens, tokenizer):
    """
    Extracts step-by-step breakdown of generated tokens.
    """
    if hasattr(generated_tokens, "tolist"):
        generated_tokens = generated_tokens.tolist()
        
    steps = []
    cumulative_text = ""
    for i, tid in enumerate(generated_tokens):
        decoded = tokenizer.decode([tid])
        cumulative_text += decoded
        steps.append({
            "step": i + 1,
            "token_id": int(tid),
            "token": decoded,
            "display": decoded.replace(" ", "␣").replace("\n", "↵"),
            "cumulative": cumulative_text
        })
        
    return {
        "prompt": prompt,
        "total_generated": len(steps),
        "steps": steps,
        "final_response": cumulative_text
    }
