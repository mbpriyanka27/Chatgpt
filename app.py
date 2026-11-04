import os
import multiprocessing
import streamlit as st
import torch

# Optimize CPU threads for PyTorch inference
torch.set_num_threads(multiprocessing.cpu_count())

# Set Streamlit page config
st.set_page_config(
    page_title="LocalGPT Pro — Multi-User AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom modules
import database
from auth.auth import get_current_user
from ui.theme import apply_theme
from ui.sidebar import render_sidebar
from model import load_model
from tokenizer import load_tokenizer
from pages.login import render_login_page
from pages.workspace import render_workspace_page
from pages.documents import render_documents_page
from pages.profile import render_profile_page

# -------------------------------------------------------------
# Initialize Cached LLM Model & Tokenizer (Loaded once for all users)
# -------------------------------------------------------------
@st.cache_resource(show_spinner=False)
def load_llm_engine(model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"):
    tokenizer = load_tokenizer(model_name)
    model = load_model(model_name)
    return model, tokenizer

# -------------------------------------------------------------
# Session State Initialization
# -------------------------------------------------------------
if "current_page" not in st.session_state:
    st.session_state.current_page = "workspace"

if "theme" not in st.session_state:
    st.session_state.theme = "dark"

# Apply theme and custom CSS
user = get_current_user()
if user and "uid" in user:
    db_u = database.get_user(user["uid"])
    if db_u and db_u.get("theme"):
        st.session_state.theme = db_u["theme"]

apply_theme(st.session_state.theme)

# -------------------------------------------------------------
# Main Routing Logic
# -------------------------------------------------------------
if not user or "uid" not in user:
    # Protected Route: User must log in first
    render_login_page()
else:
    # Authenticated User: Render Sidebar and Active Page
    render_sidebar(user)

    # Load Model with skeleton spinner
    with st.spinner("Preparing local LLM engine..."):
        model, tokenizer = load_llm_engine("Qwen/Qwen2.5-1.5B-Instruct")

    current_page = st.session_state.get("current_page", "workspace")

    if current_page == "documents":
        render_documents_page()
    elif current_page == "profile":
        render_profile_page()
    else:
        render_workspace_page(model, tokenizer)
