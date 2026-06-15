import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Current main flow at y=18672, tools at y=18896
# New nodes will be on a clean row at y=19350 — between handshake area and CRON
# x spread: aligned with the main left-to-right flow

NEW_POSITIONS = {
    'Date Detector':         [47300, 19350],
    'Musaitlik Sorgusu mu?': [47700, 19350],
    'Pre-Fetch Musaitlik':   [48100, 19350],
    'Context Injector':      [48500, 19350],
}

for node in wf['nodes']:
    if node['name'] in NEW_POSITIONS:
        old = node.get('position')
        node['position'] = NEW_POSITIONS[node['name']]
        print(f"✅ {node['name']}")
        print(f"   {old} → {node['position']}")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nLayout:")
print("  Main flow (y=18672): Webhook → ... → Check Conv Status → If NOT Human Mode → ...")
print("  Tools    (y=18896): OpenAI, Memory, randevu_* ...")
print("  Pre-fetch (y=19350): Date Detector → IF → Pre-Fetch → Context Injector")
print("  CRON     (y=20000): ...")
print("\nOk — import et.")
