import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf.get('connections', {})

# Find the chain around Data Normalization → Check Conversation Status → IF NOT Human Mode
print("=== Mevcut bağlantı zinciri ===")
for src in ['Data Normalization', 'Check Conversation Status', 'If NOT Human Mode', 'Is New Conversation?']:
    if src in conns:
        for out_type, out_lists in conns[src].items():
            for i, lst in enumerate(out_lists):
                for t in lst:
                    print(f"  {src} [{out_type}][{i}] → {t['node']}")

# Find positions of key nodes for placing new nodes
for node in wf['nodes']:
    if node['name'] in ['Check Conversation Status', 'If NOT Human Mode', 'Data Normalization']:
        print(f"\n[{node['name']}] pos={node['position']}")
