import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Find unregistered flow nodes
for node in wf['nodes']:
    name = node.get('name', '')
    if any(k in name.lower() for k in ['kayitsiz', 'unregist', 'eskale', 'auto', 'bilinmeyen', 'not_found', 'kayıtsız']):
        print(f"\n=== {name} ===")
        params = node.get('parameters', {})
        print(f"  type: {node.get('type')}")
        if 'textBody' in params:
            print(f"  textBody: {params['textBody'][:100]}")
        if 'url' in params:
            print(f"  url: {params['url'][:100]}")
        if 'jsCode' in params:
            print(f"  code: {params['jsCode'][:150]}")
        if 'conditions' in params:
            print(f"  conditions: {json.dumps(params['conditions'])[:200]}")

# Also check connections to see what connects after "not registered" branch
print("\n\n=== CONNECTIONS (unregistered path) ===")
conns = wf.get('connections', {})
for src, targets in conns.items():
    if any(k in src.lower() for k in ['kayit', 'status', 'durum', 'check', 'kontrol']):
        print(f"{src} ->")
        for out_idx, out_list in enumerate(targets.get('main', [])):
            for t in out_list:
                print(f"  [{out_idx}] -> {t.get('node')}")
