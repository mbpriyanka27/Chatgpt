import os
import streamlit as st

THEMES = {
    "dark": {
        "name": "Midnight Obsidian",
        "bg_primary": "#090d16",
        "bg_secondary": "#0f172a",
        "bg_card": "rgba(30, 41, 59, 0.65)",
        "border": "rgba(255, 255, 255, 0.08)",
        "text_primary": "#f8fafc",
        "text_secondary": "#94a3b8",
        "accent": "#38bdf8",
        "accent_gradient": "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)",
        "user_bubble": "#1e293b",
        "assistant_bubble": "#0b1120"
    },
    "light": {
        "name": "Frost Titanium",
        "bg_primary": "#f8fafc",
        "bg_secondary": "#ffffff",
        "bg_card": "rgba(255, 255, 255, 0.8)",
        "border": "#e2e8f0",
        "text_primary": "#0f172a",
        "text_secondary": "#64748b",
        "accent": "#0284c7",
        "accent_gradient": "linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)",
        "user_bubble": "#f1f5f9",
        "assistant_bubble": "#ffffff"
    }
}

def apply_theme(theme_name: str = "dark"):
    """Injects high-end CSS styling and dynamic design tokens."""
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
        --accent-gradient: {theme["accent_gradient"]};
        --user-bubble: {theme["user_bubble"]};
        --assistant-bubble: {theme["assistant_bubble"]};
    }}
    {base_css}
    </style>
    """
    st.markdown(theme_vars, unsafe_allow_html=True)
