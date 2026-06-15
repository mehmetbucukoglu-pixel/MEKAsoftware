import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] in ['HTTP Request', 'HTTP Request1']:
        print(f"\n=== {node['name']} ===")
        print(json.dumps(node['parameters'], ensure_ascii=False, indent=2))
