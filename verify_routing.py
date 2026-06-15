import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf['connections']

print("=== Full routing chain ===")
chain = [
    ('Pre-Fetch Musaitlik', 'Specific Time?', 0),
    ('Specific Time?', 'Context Injector', 0),    # TRUE branch
    ('Specific Time?', 'Format Availability Response', 1),  # FALSE branch
    ('Context Injector', 'If NOT Human Mode', 0),
    ('Format Availability Response', 'Send Availability WA', 0),
]

all_ok = True
for src, expected, branch in chain:
    c = conns.get(src, {}).get('main', [])
    targets = [t['node'] for t in c[branch]] if len(c) > branch else []
    ok = expected in targets
    all_ok = all_ok and ok
    label = ['TRUE','FALSE'][branch] if 'Specific Time' in src or 'Musaitlik Sorgusu' in src else str(branch)
    print(f"  {'✅' if ok else '❌'} {src} [{label}] → {expected}  (got: {targets})")

print(f"\n{'✅ Tüm bağlantılar doğru' if all_ok else '❌ Hata var'}")
print(f"Node sayısı: {len(wf['nodes'])}")
