import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"

with open('n8n-workflow-v18-production.json', encoding='utf-8') as f:
    content = f.read()

# Replace localhost with ngrok
content = content.replace('http://localhost:3000', NGROK_URL)

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    f.write(content)

count = content.count('rebuff-husband-legibly.ngrok-free.dev')
print(f"Done. {count} URL references now pointing to ngrok.")
print(f"File: n8n-workflow-v18-ngrok.json")
print()

# Verify
wf = json.loads(content)
for n in wf['nodes']:
    params = n.get('parameters', {})
    url = params.get('url', '')
    if 'rebuff' in str(url):
        name = n['name']
        print(f"  OK [{name}]: {url[:80]}")
