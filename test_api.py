import requests
import json
import time

url = "http://localhost:8080/api/generate"
payload = {"prompt": "Explain what Artificial Intelligence is in one short sentence"}
headers = {"Content-Type": "application/json"}

print("Sending request to backend (this may take 10-30s if the model is loading into memory for the first time)...")
start = time.time()

try:
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nTime taken: {time.time() - start:.2f} seconds\n")
        print("=== AI RESPONSE ===")
        print(data.get("response", ""))
        print("\n=== EXTRACTED VISUALIZATION DATA (Truncated) ===")
        
        viz = data.get("visualizations", {})
        print(f"Tokens: {viz.get('Tokens', {}).get('tokens', [])[:5]}...")
        print(f"Logits (Top Probabilities):")
        for item in viz.get("Logits", []):
            print(f" - {item['token']}: {item['probability']*100:.2f}%")
            
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Failed to connect to the backend: {e}")
