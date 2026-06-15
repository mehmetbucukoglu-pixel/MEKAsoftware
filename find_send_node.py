import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf['connections']

# Find the WhatsApp send node name (used in non-pre-fetch path after AI Agent)
print("=== AI Agent'tan sonraki send node'ları ===")
for src, targets in conns.items():
    for typ, lists in targets.items():
        for lst in lists:
            for t in lst:
                if t['node'] in ['Send message', 'HTTP Request1', 'Send message1']:
                    print(f"  {src} → {t['node']}")

# Also find what HTTP Request1 (outbound send) looks like
for node in wf['nodes']:
    if node['name'] in ['HTTP Request1', 'Send message']:
        print(f"\n[{node['name']}] type={node['type']}")
        url = node.get('parameters', {}).get('url', 'N/A')
        print(f"  URL: {str(url)[:80]}")
