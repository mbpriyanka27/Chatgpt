import streamlit as st
import time
from model import load_model_and_tokenizer, generate_response
from tokenizer import get_token_info
import visualization as viz

# Set page config
st.set_page_config(page_title="LLM X-Ray", layout="wide")

# Custom CSS for ChatGPT-like UX
st.markdown("""
<style>
    .stApp { background-color: #343541; color: #ECECF1; }
    .stChatMessage { background-color: transparent; }
    .stChatMessage.user { background-color: #343541; border-top: 1px solid #565869; border-bottom: 1px solid #565869; }
    .stChatMessage.assistant { background-color: #444654; }
    h1, h2, h3, p, div, span, label { color: #ECECF1 !important; }
    .stTextInput>div>div>input { background-color: #40414F; color: white; border-radius: 8px; border: 1px solid #565869; }
    .stButton>button { background-color: #10A37F; color: white; border: none; border-radius: 4px; }
    .stButton>button:hover { background-color: #0E906F; }
    
    /* Improve Tabs */
    .stTabs [data-baseweb="tab-list"] { gap: 8px; }
    .stTabs [data-baseweb="tab"] { background-color: #40414F; border-radius: 4px 4px 0px 0px; padding: 10px 16px; border: none; }
    .stTabs [aria-selected="true"] { background-color: #565869; border-bottom: 2px solid #10A37F; }
</style>
""", unsafe_allow_html=True)

st.title("LLM X-Ray: Qwen2.5-0.5B-Instruct")
st.markdown("*Interactive Visualization of LLM Inference*")

# --- Load Model ---
with st.spinner("Loading model (this might take a minute)..."):
    try:
        model, tokenizer = load_model_and_tokenizer()
        st.session_state.model_loaded = True
    except Exception as e:
        st.error(f"Failed to load model: {e}")
        st.stop()

if "messages" not in st.session_state:
    st.session_state.messages = []

# Optional Controls Sidebar
with st.sidebar:
    st.header("Generation Settings")
    concise_mode = st.checkbox("⚡ Fast Concise Mode (Replies in seconds)", value=True)
    temperature = st.slider("Temperature", 0.0, 2.0, 0.7)
    top_k = st.slider("Top-K", 1, 100, 50)
    top_p = st.slider("Top-P", 0.0, 1.0, 0.9)
    max_new_tokens = st.number_input("Maximum new tokens", 1, 512, 35)
    
    st.divider()
    st.header("Visualization Settings")
    # Qwen-1.5B has 28 layers and usually 16-32 heads depending on config. We can cap it based on config later.
    num_layers = model.config.num_hidden_layers
    num_heads = model.config.num_attention_heads
    
    vis_layer = st.number_input("Transformer layer (0-indexed)", 0, num_layers-1, min(12, num_layers-1))
    vis_head = st.number_input("Attention head (0-indexed)", 0, num_heads-1, min(4, num_heads-1))

# Display history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# --- Chat Interaction ---
if prompt := st.chat_input("Enter your prompt (e.g., Explain Machine Learning)"):
    st.chat_message("user").markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("assistant"):
        with st.spinner("Generating response and computing states..."):
            result = generate_response(
                model, tokenizer, prompt, 
                temperature=temperature, top_k=top_k, top_p=top_p, max_new_tokens=max_new_tokens
            )
            
        full_response = result["response_text"]
        st.markdown(full_response)
        st.session_state.messages.append({"role": "assistant", "content": full_response})
        
        # Save result to session state to persist visualizations
        st.session_state.last_result = result
        st.session_state.last_prompt = prompt

# --- Visualizations ---
if "last_result" in st.session_state:
    st.divider()
    st.subheader("Model X-Ray Visualizations")
    
    res = st.session_state.last_result
    prompt = st.session_state.last_prompt
    
    tabs = st.tabs(["Chat", "Tokens", "Embeddings", "Attention", "Layers", "Logits", "Generation"])
    
    with tabs[0]:
        st.info("Select a tab above to explore the internal states for the most recent message.")
        
    with tabs[1]:
        tokens, input_ids = get_token_info(tokenizer, prompt)
        viz.visualize_tokenization(tokens, input_ids)
        
    with tabs[2]:
        tokens, _ = get_token_info(tokenizer, prompt)
        # Using forward_outputs for embeddings (first hidden state)
        viz.visualize_embeddings(res["forward_outputs"].hidden_states, tokens)
        
    with tabs[3]:
        tokens, _ = get_token_info(tokenizer, prompt)
        viz.visualize_attention(res["forward_outputs"].attentions, tokens, vis_layer, vis_head)
        
    with tabs[4]:
        tokens, _ = get_token_info(tokenizer, prompt)
        viz.visualize_hidden_states(res["forward_outputs"].hidden_states, tokens, vis_layer)
        
    with tabs[5]:
        viz.visualize_logits(res["forward_outputs"].logits, tokenizer)
        
    with tabs[6]:
        viz.visualize_generation(prompt, res["generated_sequence"], tokenizer)
