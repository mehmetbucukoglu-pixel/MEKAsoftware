import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] in ['randevu_guncelle', 'randevu_iptal']:
        print(f"\n=== {node['name']} ===")
        params = node.get('parameters', {})
        print(f"URL: {params.get('url', 'N/A')}")
        print(f"Method: {params.get('method', 'N/A')}")
        body = params.get('bodyParameters', {}).get('parameters', [])
        for p in body:
            print(f"  body.{p['name']} = {p['value'][:80]}")
