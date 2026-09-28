# LLM X-Ray

An interactive web application built with Streamlit and PyTorch that visualizes the internal workings of a Large Language Model (Qwen2.5-1.5B-Instruct) during inference.

## Features

- **ChatGPT-like Interface**: Chat with the model.
- **Tokenization Visualization**: See how text is chunked into tokens and mapped to IDs.
- **Embeddings Visualization (PCA)**: 2D representation of high-dimensional token embeddings.
- **Attention Heatmaps**: Explore attention weights across different layers and heads.
- **Hidden States (PCA)**: Visualize how representations evolve across transformer layers.
- **Logits & Probabilities**: View top predictions for the next token.
- **Step-by-step Generation**: See how the output is generated token by token.

## Requirements
- Python 3.8+
- PyTorch
- Hugging Face Transformers
- Streamlit
- Plotly
- Scikit-learn
- NumPy

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd llm-xray
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the Streamlit application:
```bash
streamlit run app.py
```

The app will download the Qwen 1.5B model on the first run (approx 3GB). Subsequent runs will be much faster.

## Structure
- `app.py`: Main Streamlit UI and wiring.
- `model.py`: Handles Hugging Face model loading and inference.
- `tokenizer.py`: Handles token mapping and extraction.
- `visualization.py`: Plotly charts and PCA logic.
