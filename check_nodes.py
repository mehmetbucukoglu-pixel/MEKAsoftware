import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

print('Workflow name:', wf.get('name'))
print('Node sayisi:', len(wf['nodes']))
print()
for n in wf['nodes']:
    t = n.get('type', '')
    name = n['name']
    if 'tool' in t.lower() or 'randevu' in name.lower() or 'agent' in name.lower() or 'iptal' in name.lower():
        connected = name in wf.get('connections', {})
        print(f"  [{name}]  connected={connected}")
