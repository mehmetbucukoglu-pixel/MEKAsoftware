import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

BYPASS = "ngrok-skip-browser-warning=1"

for node in wf['nodes']:
    if node.get('type') != '@n8n/n8n-nodes-langchain.toolHttpRequest':
        continue

    params = node.get('parameters', {})
    name = node['name']

    # 1. Remove ngrok header from parametersHeaders
    headers = params.get('parametersHeaders', {}).get('values', [])
    cleaned = [h for h in headers if 'ngrok' not in h.get('name', '').lower()]
    if len(cleaned) != len(headers):
        params['parametersHeaders']['values'] = cleaned
        print(f"✅ {name}: ngrok header'dan silindi")

    # 2. Add to URL query string directly (hardcoded, AI can't touch)
    url = params.get('url', '')
    if BYPASS not in url:
        sep = '&' if '?' in url else '?'
        params['url'] = url + sep + BYPASS
        print(f"   → URL'e eklendi: ...{BYPASS}")

    # 3. If no headers left, disable sendHeaders
    remaining = params.get('parametersHeaders', {}).get('values', [])
    if not remaining:
        params['sendHeaders'] = False

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone. Import et.")
