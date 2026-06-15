import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

print("=== CRON node'ları ===")
for node in wf['nodes']:
    if node['name'].startswith('CRON'):
        params = node.get('parameters', {})
        print(f"\n[{node['name']}] type={node['type']}")
        url = params.get('url', '')
        if url:
            print(f"  URL: {url[:100]}")
        code = params.get('jsCode', '')
        if code:
            print(f"  Code: {code[:80]}")
        # IF conditions
        conds = params.get('conditions', {}).get('conditions', [])
        for c in conds:
            print(f"  Condition: {c.get('leftValue','')} {c.get('operator',{}).get('operation','')} {c.get('rightValue','')}")
