import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf.get('connections', {})

# Add randevu_iptal -> AI Agent connection (same pattern as other tools)
conns['randevu_iptal'] = {
    "ai_tool": [
        [
            {
                "node": "AI Agent",
                "type": "ai_tool",
                "index": 0
            }
        ]
    ]
}

wf['connections'] = conns

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("✅ randevu_iptal -> AI Agent [ai_tool] bağlantısı eklendi")

# Verify
with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf2 = json.load(f)

tools_connected = [src for src, t in wf2['connections'].items()
                   if 'ai_tool' in t and any(
                       item.get('node') == 'AI Agent'
                       for lst in t['ai_tool'] for item in lst
                   )]
print(f"\nAI Agent'a bağlı tool'lar ({len(tools_connected)}):")
for t in tools_connected:
    print(f"  ✅ {t}")
