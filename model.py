import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import streamlit as st

@st.cache_resource
def load_model_and_tokenizer(model_name="Qwen/Qwen2.5-1.5B-Instruct"):
    """
    Loads the Hugging Face model and tokenizer.
    Uses caching so it only loads once per session.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # Load model with output_attentions and output_hidden_states to true
    # This is required for the X-Ray visualizations
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        device_map="auto", # Automatically use GPU if available
        torch_dtype="auto",
        output_attentions=True,
        output_hidden_states=True
    )
    
    return model, tokenizer

def generate_response(model, tokenizer, prompt, temperature=0.7, top_k=50, top_p=0.9, max_new_tokens=128):
    """
    Generates a response from the model and returns the output along with internal states.
    """
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    # We want to capture the generated tokens and the states.
    # We can use the generate method, but it might be easier to capture states
    # by running a forward pass on the generated sequence afterwards, or using return_dict_in_generate.
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            do_sample=(temperature > 0.0),
            return_dict_in_generate=True,
            output_scores=True,
            output_attentions=True,
            output_hidden_states=True
        )
        
    generated_sequence = outputs.sequences[0]
    response_text = tokenizer.decode(generated_sequence[inputs.input_ids.shape[1]:], skip_special_tokens=True)
    
    # We also need the forward pass of the initial input to get the initial embeddings and attentions
    with torch.no_grad():
        forward_outputs = model(**inputs, output_attentions=True, output_hidden_states=True)
        
    return {
        "response_text": response_text,
        "inputs": inputs,
        "generated_sequence": generated_sequence,
        "generate_outputs": outputs,
        "forward_outputs": forward_outputs
    }
