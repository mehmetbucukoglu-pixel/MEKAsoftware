import json, re

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
LOCAL_PATTERNS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://host.docker.internal:3000",
]

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    raw = f.read()

original = raw
for pattern in LOCAL_PATTERNS:
    raw = raw.replace(pattern, NGROK_URL)

# Count replacements
count = sum(original.count(p) for p in LOCAL_PATTERNS)

# Verify JSON is still valid
wf = json.loads(raw)

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"✅ {count} adet localhost:3000 → {NGROK_URL} olarak değiştirildi")

# Show all URLs in HTTP nodes to verify
print("\nWorkflow'daki tüm URL'ler:")
for node in wf['nodes']:
    url = node.get('parameters', {}).get('url', '')
    if url and ('http' in str(url).lower()):
        print(f"  [{node['name']}] {str(url)[:90]}")
