import plotly.express as px
import plotly.graph_objects as go
import numpy as np
import torch
from typing import List, Optional, Dict, Any

def plot_embeddings_pca(embeddings_tensor: torch.Tensor, tokens: List[str]) -> Optional[go.Figure]:
    """
    Computes 2D PCA on token embeddings and renders interactive scatter plot.
    """
    if len(tokens) < 2:
        return None

    # Handle shape (seq_len, dim) or (1, seq_len, dim)
    if embeddings_tensor.dim() == 3:
        embeddings_tensor = embeddings_tensor.squeeze(0)

    X = embeddings_tensor.float().cpu()
    n_samples = X.shape[0]
    
    if n_samples < 2:
        return None

    # Mean centering
    X_mean = torch.mean(X, dim=0, keepdim=True)
    X_centered = X - X_mean

    # PCA via torch.pca_lowrank
    q = min(2, n_samples, X.shape[1])
    try:
        _, _, V = torch.pca_lowrank(X_centered, q=q)
        pca_coords = torch.matmul(X_centered, V[:, :2]).numpy()
    except Exception:
        # Fallback to numpy SVD
        u, s, vt = np.linalg.svd(X_centered.numpy(), full_matrices=False)
        pca_coords = np.dot(X_centered.numpy(), vt[:2].T)

    labels = [f"[{i}] {t}" for i, t in enumerate(tokens)]
    
    fig = px.scatter(
        x=pca_coords[:, 0],
        y=pca_coords[:, 1] if pca_coords.shape[1] > 1 else np.zeros_like(pca_coords[:, 0]),
        text=labels,
        title="2D PCA of Token Embeddings",
        labels={'x': 'Principal Component 1', 'y': 'Principal Component 2'},
        color=np.arange(len(tokens)),
        color_continuous_scale="Viridis"
    )
    fig.update_traces(
        textposition='top center',
        marker=dict(size=12, opacity=0.85, line=dict(width=1, color='DarkSlateGrey'))
    )
    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=20, r=20, t=40, b=20),
        coloraxis_showscale=False
    )
    return fig

def plot_attention_heatmap(attention_matrix: torch.Tensor, tokens: List[str], layer_idx: int, head_idx: int) -> go.Figure:
    """
    Plots attention heatmap for a specific transformer layer and head.
    attention_matrix is [batch, heads, seq_len, seq_len] or [heads, seq_len, seq_len].
    """
    if attention_matrix.dim() == 4:
        attn = attention_matrix[0, head_idx].float().cpu().numpy()
    elif attention_matrix.dim() == 3:
        attn = attention_matrix[head_idx].float().cpu().numpy()
    else:
        attn = attention_matrix.float().cpu().numpy()

    # Truncate tokens if longer than attention dimension
    display_tokens = tokens[:attn.shape[0]]
    if len(display_tokens) < attn.shape[0]:
        display_tokens = display_tokens + [f"T{i}" for i in range(len(display_tokens), attn.shape[0])]

    # Token labels with index
    axis_labels = [f"[{i}] {t}" for i, t in enumerate(display_tokens)]

    fig = px.imshow(
        attn,
        x=axis_labels,
        y=axis_labels,
        title=f"Attention Heatmap — Layer {layer_idx}, Head {head_idx}",
        labels=dict(x="Key Tokens", y="Query Tokens", color="Attention"),
        color_continuous_scale="Blues"
    )
    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=20, r=20, t=40, b=20)
    )
    return fig

def plot_token_probabilities(predictions: List[Dict[str, Any]]) -> go.Figure:
    """
    Plots horizontal bar chart of top candidate tokens and their probability percentages.
    """
    tokens = [p["token"] for p in predictions][::-1]
    probs = [p["prob"] * 100 for p in predictions][::-1]
    percentages = [p["percentage"] for p in predictions][::-1]

    fig = go.Figure(go.Bar(
        x=probs,
        y=tokens,
        orientation='h',
        text=percentages,
        textposition='outside',
        marker=dict(
            color=probs,
            colorscale='Blues',
            line=dict(color='rgba(255, 255, 255, 0.4)', width=1)
        )
    ))
    fig.update_layout(
        title="Next Token Prediction Distribution (Logits Softmax)",
        xaxis_title="Probability (%)",
        yaxis_title="Predicted Token",
        template="plotly_dark",
        margin=dict(l=20, r=40, t=40, b=20),
        xaxis=dict(range=[0, max(max(probs) * 1.25, 10)])
    )
    return fig

def plot_hidden_states_progression(hidden_states: List[torch.Tensor]) -> Optional[go.Figure]:
    """
    Visualizes representation norms and variance across all transformer layers.
    """
    if not hidden_states:
        return None

    layer_indices = []
    mean_norms = []
    
    for idx, h in enumerate(hidden_states):
        # h: (1, seq_len, dim)
        norm = torch.norm(h.float(), dim=-1).mean().item()
        layer_indices.append(f"L{idx}" if idx > 0 else "Embed")
        mean_norms.append(norm)

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=layer_indices,
        y=mean_norms,
        mode='lines+markers',
        line=dict(color='#00ADB5', width=3),
        marker=dict(size=8, color='#EEEEEE')
    ))
    fig.update_layout(
        title="Hidden State L2 Norm Across Transformer Layers",
        xaxis_title="Layer",
        yaxis_title="Mean Hidden Vector L2 Norm",
        template="plotly_dark",
        margin=dict(l=20, r=20, t=40, b=20)
    )
    return fig
