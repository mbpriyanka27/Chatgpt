import os
import streamlit as st

THEMES = {
    "dark": {
        "bg_primary": "#0f172a",
        "bg_secondary": "#1e293b",
        "bg_card": "#1e293b",
        "border": "#334155",
        "text_primary": "#f8fafc",
        "text_secondary": "#94a3b8",
        "accent": "#38bdf8",
        "accent_hover": "#0284c7"
    },
    "light": {
        "bg_primary": "#f8fafc",
        "bg_secondary": "#ffffff",
        "bg_card": "#ffffff",
        "border": "#e2e8f0",
        "text_primary": "#0f172a",
        "text_secondary": "#64748b",
        "accent": "#0284c7",
        "accent_hover": "#0369a1"
    }
}

def apply_theme(theme_name: str = "dark"):
    """Injects CSS variables and styles according to theme."""
    theme = THEMES.get(theme_name, THEMES["dark"])
    css_path = os.path.join(os.path.dirname(__file__), "..", "assets", "style.css")
    base_css = ""
    if os.path.exists(css_path):
        with open(css_path, "r", encoding="utf-8") as f:
            base_css = f.read()

    theme_vars = f"""
    <style>
    :root {{
        --bg-primary: {theme["bg_primary"]};
        --bg-secondary: {theme["bg_secondary"]};
        --bg-card: {theme["bg_card"]};
        --border-color: {theme["border"]};
        --text-primary: {theme["text_primary"]};
        --text-secondary: {theme["text_secondary"]};
        --accent: {theme["accent"]};
    }}
    {base_css}
    </style>
    """
    st.markdown(theme_vars, unsafe_allow_html=True)

