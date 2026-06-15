import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Check if randevu_iptal already exists
existing = [n['name'] for n in wf['nodes']]
print("Mevcut node'lar:", [n for n in existing if 'randevu' in n.lower()])

if 'randevu_iptal' not in existing:
    # Find randevu_guncelle to clone its structure
    guncelle = next(n for n in wf['nodes'] if n['name'] == 'randevu_guncelle')

    iptal_node = {
        "id": "randevu-iptal-node-001",
        "name": "randevu_iptal",
        "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
        "typeVersion": 1.1,
        "position": [
            guncelle['position'][0] + 200,
            guncelle['position'][1] + 100
        ],
        "parameters": {
            "toolDescription": (
                "Mevcut bir randevuyu iptal eder. "
                "ONCE randevu_sorgula_telefon cagir, appointmentId'yi al (id alani), "
                "sonra bu tool'u cagir. "
                "appointmentId ZORUNLU. "
                "Kullanici 'randevumu iptal et' veya 'iptal' dediginde kullan."
            ),
            "method": "POST",
            "url": f"{NGROK_URL}/api/v1/whatsapp/appointments/cancel-by-id?token={SECRET}",
            "sendHeaders": True,
            "parametersHeaders": {
                "values": [
                    {"name": "Content-Type", "value": "application/json"},
                    {"name": "ngrok-skip-browser-warning", "value": "1"}
                ]
            },
            "sendBody": True,
            "parametersBody": {
                "values": [
                    {
                        "name": "appointmentId",
                        "description": "Iptal edilecek randevunun ID'si. randevu_sorgula_telefon ciktisindaki 'id' alanini kullan."
                    }
                ]
            }
        }
    }

    wf['nodes'].append(iptal_node)
    print("✅ randevu_iptal node eklendi")

    # Connect it to the AI Agent — find the agent node
    agent_node = next((n['name'] for n in wf['nodes'] if 'agent' in n.get('type','').lower() or 'agent' in n.get('name','').lower()), None)
    print(f"   Agent node: {agent_node}")

    # Add connection from agent to randevu_iptal (as a tool)
    # In n8n, tools connect to agent via 'ai_tool' output type
    if 'randevu_guncelle' in wf['connections']:
        # Clone the connection structure from randevu_guncelle
        print("   Connections will need manual linking in n8n UI")
else:
    print("ℹ️ randevu_iptal already exists")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone! Import et, sonra n8n'de randevu_iptal'i AI Agent'a tool olarak bağla.")
