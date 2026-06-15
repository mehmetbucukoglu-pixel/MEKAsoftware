import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# ─────────────────────────────────────────────────────────────
# CHANGE 1: After "Send Unregistered Msg" → add Auto-Escalate node
# This fires escalation so the clinic sees every unregistered contact
# ─────────────────────────────────────────────────────────────

# Find position of Send Unregistered Msg to place new node nearby
send_unreg_pos = None
for n in wf['nodes']:
    if n['name'] == 'Send Unregistered Msg':
        send_unreg_pos = n['position']
        break

# New node: Auto-Escalate Unregistered
auto_escalate_node = {
    "parameters": {
        "method": "POST",
        "url": f"{NGROK_URL}/api/v1/whatsapp/appointments/escalate?token={SECRET}",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "ngrok-skip-browser-warning", "value": "1"},
                {"name": "Content-Type", "value": "application/json"}
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "waPhone", "value": "={{ $('Data Normalization').first().json.gonderen_no }}"},
                {"name": "reason", "value": "Kayıtsız hasta talebi"},
                {"name": "urgency", "value": "NORMAL"},
                {"name": "summary", "value": "={{ 'Kayıtsız numara mesaj attı: ' + $(\\'Data Normalization\\').first().json.mesaj_icerigi }}"},
            ]
        },
        "options": {
            "allowUnauthorizedCerts": True
        }
    },
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.4,
    "position": [
        (send_unreg_pos[0] + 250) if send_unreg_pos else 49000,
        (send_unreg_pos[1]) if send_unreg_pos else 18550
    ],
    "id": "auto-escalate-unreg-001",
    "name": "Auto-Eskalasyon (Kayıtsız)",
    "continueOnFail": True
}

wf['nodes'].append(auto_escalate_node)

# ─────────────────────────────────────────────────────────────
# CHANGE 2: Connect "Send Unregistered Msg" -> "Auto-Eskalasyon (Kayıtsız)"
# and "Send Registered Greeting" → (no change, stays as is)
# ─────────────────────────────────────────────────────────────

conns = wf['connections']

# Add connection: Send Unregistered Msg → Auto-Eskalasyon
if 'Send Unregistered Msg' not in conns:
    conns['Send Unregistered Msg'] = {'main': [[]]}
if 'main' not in conns['Send Unregistered Msg']:
    conns['Send Unregistered Msg']['main'] = [[]]

# Add to first output
if len(conns['Send Unregistered Msg']['main']) == 0:
    conns['Send Unregistered Msg']['main'].append([])

conns['Send Unregistered Msg']['main'][0].append({
    "node": "Auto-Eskalasyon (Kayıtsız)",
    "type": "main",
    "index": 0
})
print("✅ Send Unregistered Msg → Auto-Eskalasyon connected")

# ─────────────────────────────────────────────────────────────
# CHANGE 3: Update system prompt to reinforce unregistered escalation
# ─────────────────────────────────────────────────────────────
for node in wf['nodes']:
    if node.get('name') == 'AI Agent':
        params = node.get('parameters', {})
        if 'options' in params and 'systemMessage' in params['options']:
            old_prompt = params['options']['systemMessage']
            # Add stronger rule about unregistered users
            addition = "\n- **KRİTİK**: `isRegistered` false ise HİÇBİR araç kullanma. Sadece eskalasyon yap. Randevu, bilgi, hiçbir şey."
            params['options']['systemMessage'] = old_prompt + addition
            print("✅ AI Agent prompt hardened for unregistered users")

# ─────────────────────────────────────────────────────────────
# CHANGE 4: Fix "Registered Greeting" — also connect to HTTP Request (save message)
# ─────────────────────────────────────────────────────────────
# (Already connected via Data Normalization → HTTP Request separately, no change needed)

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print()
print("✅ Saved: n8n-workflow-v18-ngrok.json")
print()
print("SUMMARY OF CHANGES:")
print("1. New node: Auto-Eskalasyon (Kayıtsız) - fires escalation to clinic")
print("2. Connection: Send Unregistered Msg → Auto-Eskalasyon")
print("   → Kayıtsız her kişi hem static msg alır hem klinik bildirim alır")
print("3. AI Agent prompt: isRegistered=false → HEMEN eskalasyon, başka hiçbir şey")
print()
print("IMPORT THIS FILE TO n8n:")
print("  n8n-workflow-v18-ngrok.json")
