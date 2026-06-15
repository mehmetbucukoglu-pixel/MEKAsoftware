import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

fixed = []

for node in wf['nodes']:
    if node.get('type') != '@n8n/n8n-nodes-langchain.toolHttpRequest':
        continue

    params = node.get('parameters', {})
    name = node['name']

    # Check query params for ngrok header
    q_vals = params.get('parametersQuery', {}).get('values', [])
    bad_q = [p for p in q_vals if 'ngrok' in p.get('name', '').lower()]

    # Check body params for ngrok header
    b_vals = params.get('parametersBody', {}).get('values', [])
    bad_b = [p for p in b_vals if 'ngrok' in p.get('name', '').lower()]

    if bad_q or bad_b:
        # Remove from query
        params['parametersQuery']['values'] = [p for p in q_vals if 'ngrok' not in p.get('name', '').lower()]
        # Remove from body
        if 'parametersBody' in params:
            params['parametersBody']['values'] = [p for p in b_vals if 'ngrok' not in p.get('name', '').lower()]
        fixed.append(name)
        print(f"✅ {name}: ngrok-skip-browser-warning query/body'den silindi")

    # Ensure it's in headers with fixed value
    headers = params.get('parametersHeaders', {}).get('values', [])
    has_ngrok_header = any('ngrok' in h.get('name', '').lower() for h in headers)
    if not has_ngrok_header:
        if 'parametersHeaders' not in params:
            params['parametersHeaders'] = {'values': []}
        params['sendHeaders'] = True
        params['parametersHeaders']['values'].append({
            'name': 'ngrok-skip-browser-warning',
            'value': '1'
        })
        print(f"  + {name}: ngrok header eklendi")

if not fixed:
    print("Sorunlu node bulunamadı — sorun başka bir node tipinde olabilir")

# Also check regular HTTP Request nodes
for node in wf['nodes']:
    if node.get('type') == 'n8n-nodes-base.httpRequest':
        params = node.get('parameters', {})
        q_params = params.get('queryParameters', {}).get('parameters', [])
        bad = [p for p in q_params if 'ngrok' in p.get('name', '').lower()]
        if bad:
            print(f"\n⚠️  Regular HTTP node [{node['name']}]: ngrok in query params!")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone. Import et.")
