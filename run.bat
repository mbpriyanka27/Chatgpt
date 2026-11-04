@echo off
cd /d "%~dp0"
echo Starting LocalGPT (Phase 2 Upgrade with RAG and LLM X-Ray)...
python -m streamlit run app.py
pause

