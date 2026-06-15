import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

fixed = []
for node in wf['nodes']:
    if node.get('type') == '@n8n/n8n-nodes-langchain.toolHttpRequest':
        params = node.get('parameters', {})
        # Disable response optimization so allSlots is not stripped
        if params.get('optimizeResponse', True):
            params['optimizeResponse'] = False
            fixed.append(node['name'])

print("optimizeResponse=False yapılan node'lar:")
for n in fixed:
    print(f"  ✅ {n}")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
