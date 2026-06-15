import json
with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)
for n in wf['nodes']:
    name = n.get('name', '')
    ntype = n.get('type', '')
    if 'CRON' in name or 'scheduleTrigger' in ntype or 'cron' in ntype.lower():
        print("Node:", name)
        print("  Type:", ntype)
        print("  Params:", json.dumps(n['parameters'], ensure_ascii=False, indent=4))
        print()
