from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time
from model import (
    load_model_and_tokenizer, 
    generate_response, 
    get_model_info,
    inspect_cached_attention,
    inspect_cached_layer_state,
    get_latest_state
)
from tokenizer import get_token_info
import visualization as viz

app = FastAPI(title="LLM X-Ray Neural Inspector API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
tokenizer = None

@app.on_event("startup")
async def startup_event():
    global model, tokenizer
    try:
        print("Starting LLM X-Ray engine...")
        model, tokenizer = load_model_and_tokenizer()
        print("Model engine ready.")
    except Exception as e:
        print(f"Failed to load model during startup: {e}")

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}

@app.get("/api/info")
async def model_info():
    info = get_model_info()
    return info

class GenerateRequest(BaseModel):
    prompt: str
    temperature: float = 0.7
    top_k: int = 50
    top_p: float = 0.9
    max_new_tokens: int = 35
    concise: bool = True
    layer: int = 0
    head: int = 0

@app.post("/api/generate")
async def generate(req: GenerateRequest):
    global model, tokenizer
    if not model or not tokenizer:
        # Attempt just-in-time load
        try:
            model, tokenizer = load_model_and_tokenizer()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model is not ready: {e}")
            
    try:
        # Generate text and capture internal forward states
        result = generate_response(
            model, 
            tokenizer, 
            req.prompt,
            temperature=req.temperature, 
            top_k=req.top_k, 
            top_p=req.top_p, 
            max_new_tokens=req.max_new_tokens, 
            concise=req.concise
        )
        
        tokens = result["tokens"]
        input_ids = result["input_ids"]
        tokens_meta = result["tokens_meta"]
        forward_outputs = result["forward_outputs"]
        
        # Package comprehensive visualizations
        viz_data = {
            "Tokens": viz.get_tokenization_data(tokens, input_ids, tokens_meta),
            "Embeddings": viz.get_embeddings_data(forward_outputs.hidden_states, tokens, tokens_meta),
            "Attention": viz.get_attention_data(
                forward_outputs.attentions, 
                tokens, 
                layer=req.layer, 
                head=req.head, 
                tokens_meta=tokens_meta
            ),
            "Layers": viz.get_hidden_states_data(
                forward_outputs.hidden_states, 
                tokens, 
                layer=min(12, len(forward_outputs.hidden_states) - 1), 
                tokens_meta=tokens_meta
            ),
            "Logits": viz.get_logits_data(
                forward_outputs.logits, 
                tokenizer, 
                top_k=10, 
                temperature=req.temperature if req.temperature > 0 else 1.0
            ),
            "Generation": viz.get_generation_data(
                req.prompt, 
                result["generated_sequence"], 
                tokenizer
            )
        }
        
        return {
            "response": result["response_text"],
            "metrics": result["metrics"],
            "model_info": get_model_info(),
            "visualizations": viz_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attention")
async def get_attention(
    layer: int = Query(0, description="Layer index (0-indexed)"),
    head: int = Query(0, description="Head index (0-indexed, or -1 for average across all heads)")
):
    """
    Dynamically retrieve attention matrix and metrics for any layer and head in real time.
    """
    res = inspect_cached_attention(layer=layer, head=head)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@app.get("/api/layer-state")
async def get_layer_state(
    layer: int = Query(0, description="Transformer layer index (0 = Embedding, 1..N = Transformer blocks)")
):
    """
    Dynamically retrieve 2D PCA representation of hidden states for any layer in real time.
    """
    res = inspect_cached_layer_state(layer=layer)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@app.get("/api/logits")
async def get_logits(
    top_k: int = Query(10, ge=1, le=50),
    temperature: float = Query(1.0, ge=0.05, le=5.0)
):
    """
    Dynamically recalculate logits and softmax probabilities with variable temperature.
    """
    global tokenizer
    if tokenizer is None:
        _, tokenizer = load_model_and_tokenizer()
        
    state = get_latest_state()
    if state["forward_outputs"] is None:
        raise HTTPException(status_code=400, detail="No prompt has been processed yet.")
        
    logits_data = viz.get_logits_data(
        state["forward_outputs"].logits, 
        tokenizer, 
        top_k=top_k, 
        temperature=temperature
    )
    return logits_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
