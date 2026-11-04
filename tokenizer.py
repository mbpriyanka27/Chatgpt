from transformers import AutoTokenizer
from typing import Tuple, List

def load_tokenizer(model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"):
    """
    Loads Hugging Face tokenizer with local caching.
    """
    try:
        return AutoTokenizer.from_pretrained(model_name, trust_remote_code=True, local_files_only=True)
    except Exception:
        try:
            return AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        except Exception as e:
            print(f"Warning: Failed loading {model_name} ({e}), falling back to 0.5B...")
            return AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct", trust_remote_code=True, local_files_only=True)

def get_tokens(tokenizer, prompt: str) -> Tuple[List[str], List[int]]:
    """
    Tokenizes input string and returns (tokens, token_ids).
    """
    inputs = tokenizer(prompt, return_tensors="pt")
    token_ids = inputs.input_ids[0].tolist()
    tokens = tokenizer.convert_ids_to_tokens(token_ids)
    return tokens, token_ids
