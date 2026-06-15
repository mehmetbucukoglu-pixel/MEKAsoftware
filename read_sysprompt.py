import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'AI Agent':
        params = node.get('parameters', {})
        msg = params.get('systemMessage', params.get('text', 'NOT FOUND'))
        print(repr(msg[:3000]))
        break
