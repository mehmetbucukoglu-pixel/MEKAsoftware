import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

changed = []

for node in wf['nodes']:
    ntype = node.get('type', '')
    nname = node.get('name', '')
    params = node.get('parameters', {})
    url = params.get('url', '')

    # Only nodes that make HTTP requests to our backend
    if 'rebuff-husband-legibly' not in str(url):
        continue

    # For regular HTTP Request nodes
    if ntype == 'n8n-nodes-base.httpRequest':
        if 'headerParameters' not in params:
            params['headerParameters'] = {'parameters': []}
        if 'sendHeaders' not in params:
            params['sendHeaders'] = True
        
        headers = params['headerParameters']['parameters']
        # Check if already added
        if not any(h.get('name') == 'ngrok-skip-browser-warning' for h in headers):
            headers.append({'name': 'ngrok-skip-browser-warning', 'value': '1'})
            params['sendHeaders'] = True
            changed.append(f"[HTTP] {nname}")

    # For tool HTTP Request nodes (AI tools)
    if ntype == '@n8n/n8n-nodes-langchain.toolHttpRequest':
        if 'parametersHeaders' not in params:
            params['parametersHeaders'] = {'values': []}
        if 'sendHeaders' not in params:
            params['sendHeaders'] = True
        
        headers = params['parametersHeaders'].get('values', [])
        if not any(h.get('name') == 'ngrok-skip-browser-warning' for h in headers):
            headers.append({'name': 'ngrok-skip-browser-warning', 'value': '1'})
            params['sendHeaders'] = True
            changed.append(f"[Tool] {nname}")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("=== ngrok-skip-browser-warning header added ===")
for c in changed:
    print(f"  + {c}")
print(f"\nTotal: {len(changed)} nodes patched")
print("File updated: n8n-workflow-v18-ngrok.json")
