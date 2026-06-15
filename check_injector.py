import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'Context Injector':
        code = node['parameters']['jsCode']
        print("Context Injector kodu:")
        print(code[:400])
        break
