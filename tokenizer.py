def get_token_info(tokenizer, prompt):
    """
    Returns the tokens and their corresponding IDs for a given prompt.
    """
    encoding = tokenizer(prompt)
    input_ids = encoding['input_ids']
    
    # Decode each token ID back to string to show the tokenization
    tokens = [tokenizer.decode([token_id]) for token_id in input_ids]
    
    return tokens, input_ids
