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

    if embeddings_tensor.dim() == 3:
        embeddings_tensor = embeddings_tensor.squeeze(0)

    X = embeddings_tensor.float().cpu()
    n_samples = X.shape[0]
    
    if n_samples < 2:
        return None

    X_mean = torch.mean(X, dim=0, keepdim=True)
    X_centered = X - X_mean

    q = min(2, n_samples, X.shape[1])
    try:
        _, _, V = torch.pca_lowrank(X_centered, q=q)
        pca_coords = torch.matmul(X_centered, V[:, :2]).numpy()
    except Exception:
        u, s, vt = np.linalg.svd(X_centered.numpy(), full_matrices=False)
        pca_coords = np.dot(X_centered.numpy(), vt[:2].T)

    labels = [f"[{i}] {t}" for i, t in enumerate(tokens)]
    
    fig = px.scatter(
        x=pca_coords[:, 0],
        y=pca_coords[:, 1] if pca_coords.shape[1] > 1 else np.zeros_like(pca_coords[:, 0]),
        text=labels,
        title="2D PCA Projection of Token Embeddings",
        labels={'x': 'Principal Component 1', 'y': 'Principal Component 2'},
        color=np.arange(len(tokens)),
        color_continuous_scale=["#38bdf8", "#818cf8", "#c084fc"]
    )
    fig.update_traces(
        textposition='top center',
        marker=dict(size=14, opacity=0.9, line=dict(width=1.5, color='#ffffff'))
    )
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(15, 23, 42, 0.4)",
        plot_bgcolor="rgba(15, 23, 42, 0.4)",
        margin=dict(l=20, r=20, t=50, b=20),
        coloraxis_showscale=False,
        font=dict(family="Plus Jakarta Sans, sans-serif", color="#f1f5f9")
    )
    return fig

def plot_attention_heatmap(attention_matrix: torch.Tensor, tokens: List[str], layer_idx: int, head_idx: int) -> go.Figure:
    """
    Plots attention heatmap for a specific transformer layer and head.
    """
    if attention_matrix.dim() == 4:
        attn = attention_matrix[0, head_idx].float().cpu().numpy()
    elif attention_matrix.dim() == 3:
        attn = attention_matrix[head_idx].float().cpu().numpy()
    else:
        attn = attention_matrix.float().cpu().numpy()

    display_tokens = tokens[:attn.shape[0]]
    if len(display_tokens) < attn.shape[0]:
        display_tokens = display_tokens + [f"T{i}" for i in range(len(display_tokens), attn.shape[0])]

    axis_labels = [f"[{i}] {t}" for i, t in enumerate(display_tokens)]

    fig = px.imshow(
        attn,
        x=axis_labels,
        y=axis_labels,
        title=f"Attention Matrix — Layer {layer_idx}, Head {head_idx}",
        labels=dict(x="Key Tokens", y="Query Tokens", color="Weight"),
        color_continuous_scale=["#090d16", "#0284c7", "#38bdf8", "#c084fc"]
    )
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(15, 23, 42, 0.4)",
        plot_bgcolor="rgba(15, 23, 42, 0.4)",
        margin=dict(l=20, r=20, t=50, b=20),
        font=dict(family="Plus Jakarta Sans, sans-serif", color="#f1f5f9")
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
            colorscale=[[0, '#1e293b'], [0.5, '#0284c7'], [1, '#38bdf8']],
            line=dict(color='rgba(255, 255, 255, 0.3)', width=1)
        )
    ))
    fig.update_layout(
        title="Next Token Prediction Distribution (Softmax Probabilities)",
        xaxis_title="Probability (%)",
        yaxis_title="Predicted Token",
        template="plotly_dark",
        paper_bgcolor="rgba(15, 23, 42, 0.4)",
        plot_bgcolor="rgba(15, 23, 42, 0.4)",
        margin=dict(l=20, r=50, t=50, b=20),
        xaxis=dict(range=[0, max(max(probs) * 1.3, 10)]),
        font=dict(family="Plus Jakarta Sans, sans-serif", color="#f1f5f9")
    )
    return fig

def plot_hidden_states_progression(hidden_states: List[torch.Tensor]) -> Optional[go.Figure]:
    """
    Visualizes representation norms across all transformer layers.
    """
    if not hidden_states:
        return None

    layer_indices = []
    mean_norms = []
    
    for idx, h in enumerate(hidden_states):
        norm = torch.norm(h.float(), dim=-1).mean().item()
        layer_indices.append(f"L{idx}" if idx > 0 else "Embed")
        mean_norms.append(norm)

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=layer_indices,
        y=mean_norms,
        mode='lines+markers',
        line=dict(color='#38bdf8', width=3),
        marker=dict(size=8, color='#818cf8', line=dict(color='#ffffff', width=1))
    ))
    fig.update_layout(
        title="Hidden State Representation L2 Norm Progression",
        xaxis_title="Transformer Layer",
        yaxis_title="Mean L2 Norm",
        template="plotly_dark",
        paper_bgcolor="rgba(15, 23, 42, 0.4)",
        plot_bgcolor="rgba(15, 23, 42, 0.4)",
        margin=dict(l=20, r=20, t=50, b=20),
        font=dict(family="Plus Jakarta Sans, sans-serif", color="#f1f5f9")
    )
    return fig
