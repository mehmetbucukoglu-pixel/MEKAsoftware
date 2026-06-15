import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for n in wf['nodes']:
    if n.get('name') == 'CRON: Her Gun 09:00':
        # Update cron expression: 09:00 -> 11:00
        n['parameters']['rule']['interval'][0]['expression'] = '0 11 * * *'
        # Update node name to reflect new time
        n['name'] = 'CRON: Her Gun 11:00'
        print("Updated CRON: 09:00 -> 11:00")

# Also update any connections that reference the old node name
conns = wf.get('connections', {})
if 'CRON: Her Gun 09:00' in conns:
    conns['CRON: Her Gun 11:00'] = conns.pop('CRON: Her Gun 09:00')
    print("Updated connection key")

# Update references in other nodes' expressions
import re
wf_str = json.dumps(wf, ensure_ascii=False)
wf_str = wf_str.replace('CRON: Her Gun 09:00', 'CRON: Her Gun 11:00')
wf = json.loads(wf_str)

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("Done. CRON is now: 0 11 * * * (every day at 11:00)")
