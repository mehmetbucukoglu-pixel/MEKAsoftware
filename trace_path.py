import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf.get('connections', {})

# Trace what happens after "If NOT Human Mode" (the registered/unregistered branch)
print("=== Full connection map for unregistered path ===\n")
targets_to_trace = ['If NOT Human Mode', 'Registered Check', 'Unregistered Reply', 
                    'Send Unregistered Msg', 'Auto-Eskalasyon (Kayıtsız)']

for src, targets in conns.items():
    for t_name in targets_to_trace:
        if t_name.lower() in src.lower() or src in targets_to_trace:
            print(f"\n[{src}]")
            for out_idx, out_list in enumerate(targets.get('main', [])):
                label = "TRUE/YES" if out_idx == 0 else "FALSE/NO"
                for t in out_list:
                    print(f"  [{label}] -> {t.get('node')}")

# Also find the node that checks registration status
print("\n\n=== Registered Check node ===")
for node in wf['nodes']:
    name = node.get('name', '')
    if 'registered' in name.lower() or 'kayit' in name.lower():
        print(f"\n[{name}]")
        print(json.dumps(node.get('parameters', {}), ensure_ascii=False, indent=2)[:500])
