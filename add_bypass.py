import json, uuid

NGROK = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"
CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"
PHONE_NUM_ID = "1038350189365408"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

conns = wf['connections']

# ── 1. Format Availability Response — Code Node ──
format_node = {
    "id": str(uuid.uuid4()),
    "name": "Format Availability Response",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [48100, 19600],
    "parameters": {
        "mode": "runOnceForEachItem",
        "jsCode": r"""
const apiResult = $input.item.json;
const slots     = apiResult.slots || [];
const targetDate = $('Date Detector').first().json.targetDate || '';
const gonderen  = $('Data Normalization').first().json.gonderen_no;
const available = apiResult.available;
const message   = apiResult.message || '';

// Format date to Turkish: "2026-06-25" → "25 Haziran 2026 Perşembe"
const aylar = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
               'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const gunler = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
let dateLabel = targetDate;
if (targetDate) {
  const d = new Date(targetDate + 'T12:00:00Z');
  dateLabel = `${d.getUTCDate()} ${aylar[d.getUTCMonth()]} ${d.getUTCFullYear()} ${gunler[d.getUTCDay()]}`;
}

let output;
if (slots.length === 0) {
  output = `${dateLabel} tarihinde müsait randevu bulunmamaktadır. Başka bir gün denemek ister misiniz?`;
} else if (available === false && message) {
  const alts = slots.map(s => `• ${s}`).join('\n');
  output = `İstediğiniz saat müsait değil. En yakın alternatifler:\n${alts}\n\nHangi saati tercih edersiniz?`;
} else {
  const slotList = slots.map(s => `• ${s}`).join('\n');
  output = `${dateLabel} için müsait saatler:\n\n${slotList}\n\nHangi saati tercih edersiniz?`;
}

return { output, gonderen_no: gonderen, targetDate };
"""
    }
}

# ── 2. Send Availability WA — WhatsApp Node (clone of Send message) ──
send_wa_node = {
    "id": str(uuid.uuid4()),
    "name": "Send Availability WA",
    "type": "n8n-nodes-base.whatsApp",
    "typeVersion": 1,
    "position": [48400, 19600],
    "parameters": {
        "operation": "send",
        "phoneNumberId": PHONE_NUM_ID,
        "recipientPhoneNumber": "={{ $('Data Normalization').first().json.gonderen_no }}",
        "textBody": "={{ $json.output }}",
        "additionalFields": {}
    },
    "credentials": None  # will use same credentials as Send message
}

# Copy credentials from existing Send message node
for node in wf['nodes']:
    if node['name'] == 'Send message' and 'credentials' in node:
        send_wa_node['credentials'] = node['credentials']
        break

# ── 3. Save Availability Outbound — HTTP Request (clone of HTTP Request1) ──
save_node = {
    "id": str(uuid.uuid4()),
    "name": "Save Availability Outbound",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [48700, 19600],
    "parameters": {
        "method": "POST",
        "url": f"{NGROK}/api/v1/webhooks/whatsapp",
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "x-n8n-secret", "value": SECRET},
                {"name": "ngrok-skip-browser-warning", "value": "1"}
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "clinicId", "value": CLINIC_ID},
                {"name": "waPhone", "value": "={{ $('Data Normalization').first().json.gonderen_no }}"},
                {"name": "waMessageId", "value": "=OUTBOUND_{{ $now.toMillis() }}"},
                {"name": "body", "value": "={{ $('Format Availability Response').first().json.output }}"},
                {"name": "direction", "value": "OUTBOUND"}
            ]
        },
        "options": {}
    }
}

# ── Add nodes ──
wf['nodes'].extend([format_node, send_wa_node, save_node])

# ── Rewire connections ──
fmt = format_node['name']
snd = send_wa_node['name']
sav = save_node['name']

# Pre-Fetch → Format (instead of Context Injector)
conns['Pre-Fetch Musaitlik'] = {
    "main": [[{"node": fmt, "type": "main", "index": 0}]]
}

# Format → Send WA + Save Outbound (parallel)
conns[fmt] = {
    "main": [
        [
            {"node": snd, "type": "main", "index": 0},
            {"node": sav, "type": "main", "index": 0}
        ]
    ]
}

# Context Injector no longer needed in TRUE branch — disconnect
# (it still exists in the workflow but has no incoming connection)

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("✅ Bypass kuruldu:")
print(f"   Pre-Fetch → {fmt} → {snd} + {sav}")
print(f"   AI Agent tamamen bypass edildi (müsaitlik sorguları için)")
print(f"\nWorkflow node sayısı: {len(wf['nodes'])}")
