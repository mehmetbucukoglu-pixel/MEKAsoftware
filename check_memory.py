import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if 'memory' in node['name'].lower() or node['type'] == '@n8n/n8n-nodes-langchain.memoryBufferWindow':
        print(f"Node: {node['name']}")
        print(json.dumps(node['parameters'], ensure_ascii=False, indent=2))
        break
