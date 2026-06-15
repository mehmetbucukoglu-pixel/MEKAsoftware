import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

fixed = []

for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})

    # Fix ALL nodes that have waPhone as an AI-fillable body param
    body_vals = params.get('parametersBody', {}).get('values', [])
    for p in body_vals:
        if p.get('name') == 'waPhone' and not p.get('value'):
            p['value'] = "={{ $('Data Normalization').first().json.gonderen_no }}"
            fixed.append(f"{name}.waPhone -> gonderen_no expression")

    # Fix escalation tool specifically — move waPhone to URL
    if 'skalasyon' in name or 'scalat' in name.lower() or 'eskale' in name.lower():
        # These nodes should have waPhone in URL, not body
        url = params.get('url', '')
        if url and 'waPhone' not in url:
            # Add waPhone to URL
            sep = '&' if '?' in url else '?'
            params['url'] = f"={url.lstrip('=')}{sep}waPhone={{{{ $('Data Normalization').first().json.gonderen_no }}}}"
            # Remove waPhone from body if exists
            body_vals_new = [p for p in body_vals if p.get('name') != 'waPhone']
            if len(body_vals_new) < len(body_vals):
                params['parametersBody']['values'] = body_vals_new
                fixed.append(f"{name}: moved waPhone to URL")

# Also check the AI tool description for escalation - make sure waPhone not mentioned as fillable
for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})
    desc = params.get('toolDescription', '')
    if 'waPhone' in desc and ('skalasyon' in name or 'eskale' in name.lower()):
        params['toolDescription'] = desc.replace(
            'waPhone',
            'waPhone (otomatik - doldurma)'
        )
        fixed.append(f"{name}: tool description updated")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("=== FIXED ===")
for f in fixed:
    print(f"  ✅ {f}")

if not fixed:
    print("  ℹ️  No changes needed (escalation nodes may use different structure)")
    # Show all node names to debug
    print("\n  All nodes:")
    with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as fj:
        wf2 = json.load(fj)
    for n in wf2['nodes']:
        body = n.get('parameters', {}).get('parametersBody', {}).get('values', [])
        has_waphone = any(p.get('name') == 'waPhone' for p in body)
        if has_waphone:
            print(f"    [{n['name']}] has waPhone in body -> needs fix")
