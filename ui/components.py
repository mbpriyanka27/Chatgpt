import datetime
import streamlit as st
from typing import List, Dict, Any, Optional
from visualization import (
    plot_embeddings_pca,
    plot_attention_heatmap,
    plot_token_probabilities,
    plot_hidden_states_progression
)
from xray import simulate_token_generation

def render_welcome_screen(user_name: str):
    """Renders the executive welcome banner and 4 styled starter prompt cards."""
    hour = datetime.datetime.now().hour
    greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"
    first_name = user_name.split()[0].capitalize() if user_name else "there"

    st.markdown(f"""
    <div class="welcome-container">
        <div class="welcome-title">{greeting}, {first_name} ✨</div>
        <div class="welcome-subtitle">Your private AI assistant is ready. Ask questions, analyze documents, or inspect transformer internals.</div>
    </div>
    """, unsafe_allow_html=True)

    prompts = [
        ("🧠 Explain Transformer Attention", "How Query, Key, and Value matrices compute self-attention dynamically."),
        ("📄 Analyze Uploaded Research Paper", "Synthesize findings, extract methodologies, and ground answers with page citations."),
        ("⚡ Inspect Token Next-Prediction Logits", "Visualize probability distributions and candidate tokens before generation."),
        ("💻 Refactor Python Concurrency Code", "Optimize async workflows, multithreading, and deadlock prevention.")
    ]

    col1, col2 = st.columns(2)
    for idx, (title, desc) in enumerate(prompts):
        col = col1 if idx % 2 == 0 else col2
        with col:
            btn_text = f"**{title}**\n\n{desc}"
            if st.button(btn_text, key=f"prompt_card_{idx}", use_container_width=True):
                clean_query = title.split(" ", 1)[1] if " " in title else title
                st.session_state.suggested_prompt = clean_query
                st.rerun()

def render_source_chips(sources: List[Dict[str, Any]]):
    """Renders document citation chips and expandable snippet viewer."""
    if not sources:
        return
    st.markdown("##### 📚 Document Sources")
    chips_html = "<div>"
    for s in sources:
        score_pct = int(s.get("score", 0) * 100)
        chips_html += f"<span class='source-chip'>📄 {s['source']} · p.{s['page']} <span style='opacity:0.75; font-size:11px;'>({score_pct}% match)</span></span>"
    chips_html += "</div>"
    st.markdown(chips_html, unsafe_allow_html=True)

    with st.expander("🔍 Verified Context Passages", expanded=False):
        for i, s in enumerate(sources, 1):
            st.caption(f"**[{i}] {s['source']} (Page {s['page']}):**")
            st.info(s.get("snippet", ""))

def render_xray_drawer(xray_data: Dict[str, Any], model, tokenizer):
    """
    Renders the collapsible inline X-Ray inspection drawer with the exact 6 tabs:
    Tokens | Embeddings | Layers | Attention | Hidden States | Logits
    """
    with st.expander("🔬 **LLM X-Ray Telemetry & Inspection Panel**", expanded=True):
        t_tokens, t_embed, t_layers, t_attn, t_hidden, t_logits = st.tabs([
            "🔤 Tokens",
            "🌐 Embeddings",
            "🧱 Layers",
            "🎯 Attention",
            "🧠 Hidden States",
            "📊 Logits"
        ])

        with t_tokens:
            st.markdown(f"#### Tokenization Breakdown (`{xray_data['seq_len']}` tokens)")
            chips = "<div style='display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;'>"
            for i, tid in enumerate(xray_data["input_ids"]):
                display_tok = xray_data["decoded_tokens"][i].replace(" ", "␣")
                chips += f"<div class='token-chip'><span class='token-str'>{display_tok}</span><span class='token-id'>ID: {tid}</span></div>"
            chips += "</div>"
            st.markdown(chips, unsafe_allow_html=True)
            st.dataframe(xray_data["token_stats"], use_container_width=True)

        with t_embed:
            st.markdown(f"#### Token Vector Embeddings (`{xray_data['embedding_dim']}` Dimensions)")
            st.caption("2D PCA projection of high-dimensional input embedding representations:")
            fig_pca = plot_embeddings_pca(xray_data["embeddings_tensor"], xray_data["decoded_tokens"])
            if fig_pca:
                fig_pca.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig_pca, use_container_width=True)
            else:
                st.info("Input prompt needs at least 2 tokens to display 2D PCA.")
            st.dataframe(xray_data["token_stats"], use_container_width=True)

        with t_layers:
            st.markdown("#### Transformer Architecture & Hidden State Flow")
            c1, c2, c3 = st.columns(3)
            c1.metric("Transformer Layers", xray_data["num_layers"])
            c2.metric("Attention Heads", xray_data["num_heads"])
            c3.metric("Hidden Vector Dim", xray_data["embedding_dim"])
            if xray_data["hidden_states"]:
                fig_h = plot_hidden_states_progression(xray_data["hidden_states"])
                if fig_h:
                    fig_h.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                    st.plotly_chart(fig_h, use_container_width=True)

        with t_attn:
            st.markdown("#### Multi-Head Self-Attention Matrix")
            st.caption("Inter-token query and key attention weights across Transformer layers:")
            ca, cb = st.columns(2)
            with ca:
                sel_l = st.slider("Transformer Layer", 0, max(0, xray_data["num_layers"] - 1), 0, key="drawer_layer_slider")
            with cb:
                sel_h = st.slider("Attention Head", 0, max(0, xray_data["num_heads"] - 1), 0, key="drawer_head_slider")
            if xray_data["attentions"] and sel_l < len(xray_data["attentions"]):
                attn_mat = xray_data["attentions"][sel_l]
                fig_attn = plot_attention_heatmap(attn_mat, xray_data["decoded_tokens"], sel_l, sel_h)
                fig_attn.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                st.plotly_chart(fig_attn, use_container_width=True)

        with t_hidden:
            st.markdown(f"#### Hidden State Representation Norms ({xray_data['num_hidden_layers']} layers)")
            if xray_data["hidden_states"]:
                fig_hid = plot_hidden_states_progression(xray_data["hidden_states"])
                if fig_hid:
                    fig_hid.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
                    st.plotly_chart(fig_hid, use_container_width=True)

        with t_logits:
            st.markdown("#### Softmax Next-Token Probability Distribution")
            fig_p = plot_token_probabilities(xray_data["predictions"])
            fig_p.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
            st.plotly_chart(fig_p, use_container_width=True)
            st.table(xray_data["predictions"])

            st.markdown("---")
            sim_steps = st.slider("Simulation Steps", 1, 10, 5, key="drawer_sim_slider")
            if st.button("Run Token Generation Trace", key="btn_run_drawer_sim", type="primary"):
                with st.spinner("Executing autoregressive generation simulation..."):
                    gen_trace = simulate_token_generation(model, tokenizer, xray_data["text"], max_steps=sim_steps)
                for step in gen_trace:
                    with st.expander(f"Step {step['step']}: Selected Token → `{step['chosen_token']}`", expanded=True):
                        st.markdown(f"**Sequence so far:** `{step['current_text']}`")
                        st.table(step["candidates"])
