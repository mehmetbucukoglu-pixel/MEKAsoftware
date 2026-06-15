import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if 'guncelle' in node.get('name', '').lower() or 'update' in node.get('name', '').lower():
        print(f"=== {node['name']} ===")
        print(json.dumps(node['parameters'], ensure_ascii=False, indent=2))
        break

# Also show randevu_sorgula to see what it returns
print("\n\n=== randevu_sorgula (what AI uses to get appointment IDs) ===")
for node in wf['nodes']:
    if 'sorgula' in node.get('name', '').lower():
        print(f"[{node['name']}]")
        print(json.dumps(node['parameters'], ensure_ascii=False, indent=2)[:600])
        print()
