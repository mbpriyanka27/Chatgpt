def get_token_info(tokenizer, prompt):
    """
    Returns the tokens and their corresponding IDs and detailed metadata for a given prompt.
    """
    encoding = tokenizer(prompt)
    input_ids = encoding['input_ids']
    
    tokens = []
    tokens_meta = []
    
    for idx, token_id in enumerate(input_ids):
        raw_token = tokenizer.decode([token_id])
        # Create display representation for whitespaces and control characters
        display_token = raw_token.replace(" ", "␣").replace("\n", "↵")
        if not display_token:
            display_token = "<empty>"
            
        tokens.append(raw_token)
        tokens_meta.append({
            "index": idx,
            "id": int(token_id),
            "raw": raw_token,
            "display": display_token,
            "length": len(raw_token),
            "is_whitespace": raw_token.isspace() if raw_token else False
        })
        
    return tokens, input_ids, tokens_meta
