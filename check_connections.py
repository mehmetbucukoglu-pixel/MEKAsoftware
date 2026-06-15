import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf.get('connections', {})

# Find how other tools connect to AI Agent (look at randevu_guncelle as example)
print("=== randevu_guncelle connection ===")
if 'randevu_guncelle' in conns:
    print(json.dumps(conns['randevu_guncelle'], indent=2))

print("\n=== AI Agent inputs (tools) ===")
# Tools connect TO the agent, so look for who points to AI Agent
for src, targets in conns.items():
    for out_type, out_lists in targets.items():
        for out_list in out_lists:
            for t in out_list:
                if t.get('node') == 'AI Agent' and out_type == 'ai_tool':
                    print(f"  {src} -> AI Agent [ai_tool]")
