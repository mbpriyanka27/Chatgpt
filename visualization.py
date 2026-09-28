import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from sklearn.decomposition import PCA
import numpy as np

def visualize_tokenization(tokens, input_ids):
    """Visualizes tokenization process."""
    st.markdown("### Tokenization")
    st.write("How the input text is split into tokens and mapped to IDs.")
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Tokens**")
        st.code(" | ".join(tokens))
    with col2:
        st.markdown("**Token IDs**")
        st.code(" | ".join(map(str, input_ids)))

def visualize_embeddings(hidden_states, tokens):
    """Visualizes the initial embeddings using PCA."""
    st.markdown("### Token Embeddings")
    
    # Extract the first hidden state (which is the output of the embedding layer)
    # Shape: (batch_size, sequence_length, hidden_size)
    embeddings = hidden_states[0][0].float().cpu().numpy()
    
    st.write(f"Embedding dimension: {embeddings.shape[1]}")
    
    # Apply PCA to reduce to 2 dimensions for visualization
    if embeddings.shape[0] > 1:
        pca = PCA(n_components=2)
        embeddings_2d = pca.fit_transform(embeddings)
        
        fig = px.scatter(
            x=embeddings_2d[:, 0], 
            y=embeddings_2d[:, 1],
            text=tokens,
            title="2D PCA of Token Embeddings"
        )
        fig.update_traces(textposition='top center')
        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.write("Not enough tokens to perform PCA visualization.")

def visualize_attention(attentions, tokens, layer, head):
    """Visualizes attention matrix for a specific layer and head."""
    st.markdown(f"### Attention Head ({layer}, {head})")
    
    # attentions is a tuple of layers. Each element is (batch_size, num_heads, seq_len, seq_len)
    if layer < len(attentions):
        attn_matrix = attentions[layer][0, head].float().cpu().numpy()
        
        fig = px.imshow(
            attn_matrix,
            x=tokens,
            y=tokens,
            color_continuous_scale='Viridis',
            title=f"Attention Weights (Layer {layer}, Head {head})"
        )
        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.error(f"Layer {layer} is out of bounds.")

def visualize_hidden_states(hidden_states, tokens, layer):
    """Visualizes hidden states for a specific layer using PCA."""
    st.markdown(f"### Hidden States (Layer {layer})")
    
    if layer < len(hidden_states):
        h_states = hidden_states[layer][0].float().cpu().numpy()
        
        if h_states.shape[0] > 1:
            pca = PCA(n_components=2)
            h_states_2d = pca.fit_transform(h_states)
            
            fig = px.scatter(
                x=h_states_2d[:, 0], 
                y=h_states_2d[:, 1],
                text=tokens,
                title=f"2D PCA of Hidden States (Layer {layer})"
            )
            fig.update_traces(textposition='top center')
            fig.update_layout(template="plotly_dark")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.write("Not enough tokens for PCA.")
    else:
        st.error(f"Layer {layer} is out of bounds.")

def visualize_logits(logits, tokenizer):
    """Visualizes top tokens based on logits of the last generated step."""
    st.markdown("### Next Token Prediction (Logits)")
    
    # logits shape: (batch_size, seq_len, vocab_size)
    # We look at the logits of the last token in the sequence
    last_step_logits = logits[0, -1, :].float().cpu().numpy()
    
    # Convert logits to probabilities
    exp_logits = np.exp(last_step_logits - np.max(last_step_logits))
    probs = exp_logits / exp_logits.sum()
    
    # Get top 5
    top_indices = np.argsort(probs)[-5:][::-1]
    top_probs = probs[top_indices]
    top_tokens = [tokenizer.decode([idx]) for idx in top_indices]
    
    # Create bar chart
    fig = px.bar(
        x=top_tokens,
        y=top_probs,
        labels={'x': 'Token', 'y': 'Probability'},
        title="Top 5 Next Token Predictions"
    )
    fig.update_layout(template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)

def visualize_generation(prompt, generated_sequence, tokenizer):
    """Visualizes the step-by-step token generation."""
    st.markdown("### Token Generation Process")
    
    # The generated sequence includes the prompt.
    prompt_tokens = tokenizer(prompt)['input_ids']
    new_tokens = generated_sequence[len(prompt_tokens):]
    
    current_text = prompt
    st.write(f"**Prompt:** {prompt}")
    
    # Show how it was generated
    st.markdown("#### Generation Steps:")
    
    # Display step-by-step in an expander or a list
    steps = []
    for i, token_id in enumerate(new_tokens):
        token_str = tokenizer.decode([token_id])
        current_text += token_str
        steps.append(f"→ Step {i+1}: `{token_str}`")
        
    # Show first 10 and last 10 if it's too long
    if len(steps) > 20:
        for step in steps[:10]:
            st.write(step)
        st.write("...")
        for step in steps[-10:]:
            st.write(step)
    else:
        for step in steps:
            st.write(step)
            
    st.write(f"**Final Response:** {tokenizer.decode(new_tokens)}")
