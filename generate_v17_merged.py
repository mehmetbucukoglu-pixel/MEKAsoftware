"""
Merge CRON reminder nodes into v17 main workflow.
Result: one workflow with two independent entry points:
  - Webhook (POST) → existing bot flow
  - Schedule (09:00) → reminder CRON flow
"""
import json, uuid

SRC = "n8n-workflow-v17-registered-only.json"
DST = "n8n-workflow-v17-final.json"
BASE_URL = "https://rebuff-husband-legibly.ngrok-free.dev/api/v1"
TOKEN = "klinikapp-n8n-secret-2024"
WA_PHONE_ID = "1038350189365408"
WA_CRED = {"id": "pAHu8UjOiUUJ4ORt", "name": "WhatsApp account"}

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)

# ─── CRON nodes ───────────────────────────────────────────────────────────────
cron_nodes = [
    {
        "parameters": {
            "rule": {
                "interval": [{"field": "cronExpression", "expression": "0 9 * * *"}]
            }
        },
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [47200, 20000],
        "id": "cron-sched-001",
        "name": "CRON: Her Gun 09:00"
    },
    {
        "parameters": {
            "url": f"{BASE_URL}/whatsapp/appointments/reminder-due",
            "sendQuery": True,
            "queryParameters": {
                "parameters": [{"name": "token", "value": TOKEN}]
            },
            "options": {"allowUnauthorizedCerts": True}
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.4,
        "position": [47440, 20000],
        "id": "cron-fetch-001",
        "name": "CRON: Hatirlama Listesi Al",
        "continueOnFail": True
    },
    {
        "parameters": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
                "conditions": [{
                    "id": "check-has-items",
                    "leftValue": "={{ $json.length }}",
                    "rightValue": 0,
                    "operator": {"type": "number", "operation": "gt"}
                }],
                "combinator": "and"
            },
            "options": {}
        },
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.2,
        "position": [47660, 20000],
        "id": "cron-check-001",
        "name": "CRON: Hatirlatilacak Var mi?"
    },
    {
        "parameters": {},
        "type": "n8n-nodes-base.splitInBatches",
        "typeVersion": 3,
        "position": [47880, 20000],
        "id": "cron-split-001",
        "name": "CRON: Her Randevu Icin"
    },
    {
        "parameters": {
            "operation": "send",
            "phoneNumberId": WA_PHONE_ID,
            "recipientPhoneNumber": "={{ $json.patientPhone }}",
            "textBody": (
                "=Merhaba {{ $json.patientName }}! 👋\n\n"
                "Yarınki randevunuzu hatırlatmak istedik:\n"
                "📅 Tarih: {{ $now.plus({days:1}).setZone('Europe/Istanbul').setLocale('tr').toFormat('dd MMMM yyyy') }}\n"
                "⏰ Saat: {{ $json.timeFormatted }}\n"
                "👨‍⚕️ {{ $json.doctorName }}\n\n"
                "Randevunuzu onaylamak için *EVET*, iptal için *HAYIR* yazabilirsiniz."
            ),
            "additionalFields": {}
        },
        "type": "n8n-nodes-base.whatsApp",
        "typeVersion": 1,
        "position": [48100, 20000],
        "id": "cron-send-001",
        "name": "CRON: WA Hatirlama Gonder",
        "continueOnFail": True,
        "credentials": {"whatsAppApi": WA_CRED}
    },
    {
        "parameters": {
            "method": "PATCH",
            "url": f"={BASE_URL}/whatsapp/appointments/{{{{ $('CRON: Her Randevu Icin').item.json.appointmentId }}}}/reminder-sent?token={TOKEN}",
            "options": {"allowUnauthorizedCerts": True}
        },
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.4,
        "position": [48320, 20000],
        "id": "cron-mark-001",
        "name": "CRON: Hatirlatmayi SENT Yap",
        "continueOnFail": True
    }
]

wf["nodes"].extend(cron_nodes)

# ─── CRON connections (completely separate from bot flow) ─────────────────────
wf["connections"]["CRON: Her Gun 09:00"] = {
    "main": [[{"node": "CRON: Hatirlama Listesi Al", "type": "main", "index": 0}]]
}
wf["connections"]["CRON: Hatirlama Listesi Al"] = {
    "main": [[{"node": "CRON: Hatirlatilacak Var mi?", "type": "main", "index": 0}]]
}
wf["connections"]["CRON: Hatirlatilacak Var mi?"] = {
    "main": [
        [{"node": "CRON: Her Randevu Icin", "type": "main", "index": 0}],  # TRUE (var)
        []  # FALSE (yok, dur)
    ]
}
wf["connections"]["CRON: Her Randevu Icin"] = {
    "main": [[{"node": "CRON: WA Hatirlama Gonder", "type": "main", "index": 0}]]
}
wf["connections"]["CRON: WA Hatirlama Gonder"] = {
    "main": [[{"node": "CRON: Hatirlatmayi SENT Yap", "type": "main", "index": 0}]]
}

# ─── Update metadata ──────────────────────────────────────────────────────────
wf["name"] = "KlinikApp WhatsApp Bot v17 - Registered Only + Reminder CRON"
wf["versionId"] = str(uuid.uuid4())

with open(DST, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

# Summary
bot_nodes = [n for n in wf["nodes"] if not n["name"].startswith("CRON:")]
cron_names = [n["name"] for n in wf["nodes"] if n["name"].startswith("CRON:")]

print(f"[OK] Merged workflow saved: {DST}")
print(f"     Total nodes: {len(wf['nodes'])}")
print(f"     Bot flow nodes: {len(bot_nodes)}")
print(f"     CRON nodes ({len(cron_names)}): {', '.join(cron_names)}")
print()
print("[Flow 1] Webhook (POST) -> bot flow (unchanged)")
print("[Flow 2] CRON 09:00 -> reminder-due -> splitInBatches -> WA send -> mark SENT")
