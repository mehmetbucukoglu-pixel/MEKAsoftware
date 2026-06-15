import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'AI Agent':
        msg = node['parameters']['options']['systemMessage']
        # Remove leading = sign if present
        if msg.startswith('='):
            msg = msg[1:]
        print(msg)
        break
