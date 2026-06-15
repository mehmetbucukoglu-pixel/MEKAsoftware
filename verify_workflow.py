import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf['connections']

print("=== Zincir doğrulama ===")
checks = [
    ('Check Conversation Status', 'Date Detector'),
    ('Date Detector', 'Musaitlik Sorgusu mu?'),
    ('Pre-Fetch Musaitlik', 'Context Injector'),
    ('Context Injector', 'If NOT Human Mode'),
]
for src, expected_target in checks:
    targets = []
    for typ, lists in conns.get(src, {}).items():
        for lst in lists:
            for t in lst:
                targets.append(t['node'])
    ok = expected_target in targets
    print(f"  {'✅' if ok else '❌'} {src} → {expected_target}")

# IF node branches
if_conns = conns.get('Musaitlik Sorgusu mu?', {}).get('main', [])
true_target  = if_conns[0][0]['node'] if len(if_conns) > 0 and if_conns[0] else None
false_target = if_conns[1][0]['node'] if len(if_conns) > 1 and if_conns[1] else None
print(f"  {'✅' if true_target == 'Pre-Fetch Musaitlik' else '❌'} IF TRUE  → {true_target}")
print(f"  {'✅' if false_target == 'If NOT Human Mode' else '❌'} IF FALSE → {false_target}")

print(f"\nJSON geçerli: OK\nNode sayısı: {len(wf['nodes'])}")
