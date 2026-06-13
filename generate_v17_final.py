"""
Generate n8n v17 with:
1. isNewConversation-based first-message greeting (registered vs unregistered)
2. CRON reminder workflow (separate file)
"""
import json, uuid

# ─── Update v17: add first-message greeting flow ─────────────────────────────
SRC = "n8n-workflow-v17-registered-only.json"
DST = "n8n-workflow-v17-registered-only.json"

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)

# New nodes to add
registered_greeting_node = {
    "parameters": {
        "assignments": {
            "assignments": [{
                "id": "reg-greeting",
                "name": "output",
                "value": (
                    "=Merhaba! 👋 Numaranız {{ $('Check Conversation Status').first().json.patientName }} "
                    "adına kayıtlıdır.\n\nSize nasıl yardımcı olabilirim?"
                ),
                "type": "string"
            }]
        },
        "options": {}
    },
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.4,
    "position": [48288, 18200],
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "name": "Registered Greeting"
}

send_reg_greeting_node = {
    "parameters": {
        "operation": "send",
        "phoneNumberId": "1038350189365408",
        "recipientPhoneNumber": "={{ $('Data Normalization').first().json.gonderen_no }}",
        "textBody": "={{ $json.output }}",
        "additionalFields": {}
    },
    "type": "n8n-nodes-base.whatsApp",
    "typeVersion": 1,
    "position": [48528, 18200],
    "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "name": "Send Registered Greeting",
    "credentials": {
        "whatsAppApi": {
            "id": "pAHu8UjOiUUJ4ORt",
            "name": "WhatsApp account"
        }
    }
}

is_new_conv_node = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2
            },
            "conditions": [{
                "id": "check-new-conv",
                "leftValue": "={{ $json.isNewConversation }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"}
            }],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [48048, 18200],
    "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
    "name": "Is New Conversation?"
}

wf["nodes"].extend([is_new_conv_node, registered_greeting_node, send_reg_greeting_node])

# Rewire:
# "If NOT Human Mode" true → "Is New Conversation?" (was Is Registered?)
# Keep "Is Registered?" for subsequent messages
# "Is New Conversation?" true → "Is Registered (first)?" (new branch)
#   registered → "Registered Greeting" → done
#   not registered → "Unregistered Reply" → done
# "Is New Conversation?" false → "Is Registered?" → AI or Unregistered

# New node: "Is Registered First?" for new conv branch
is_reg_first_node = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2
            },
            "conditions": [{
                "id": "check-is-reg-first",
                "leftValue": "={{ $('Check Conversation Status').first().json.isRegistered }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"}
            }],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [48288, 18100],
    "id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
    "name": "Is Registered? (First)"
}
wf["nodes"].append(is_reg_first_node)

# Unregistered Reply'e pointer: "Is Registered? (First)" false → Unregistered Reply
# Existing "Unregistered Reply" zaten var

# Rewire "If NOT Human Mode" true → "Is New Conversation?"
wf["connections"]["If NOT Human Mode"]["main"][0] = [
    {"node": "Is New Conversation?", "type": "main", "index": 0}
]

# "Is New Conversation?" true → "Is Registered? (First)", false → "Is Registered?"
wf["connections"]["Is New Conversation?"] = {
    "main": [
        [{"node": "Is Registered? (First)", "type": "main", "index": 0}],
        [{"node": "Is Registered?", "type": "main", "index": 0}]
    ]
}

# "Is Registered? (First)" true → "Registered Greeting", false → "Unregistered Reply"
wf["connections"]["Is Registered? (First)"] = {
    "main": [
        [{"node": "Registered Greeting", "type": "main", "index": 0}],
        [{"node": "Unregistered Reply", "type": "main", "index": 0}]
    ]
}

# "Registered Greeting" → "Send Registered Greeting"
wf["connections"]["Registered Greeting"] = {
    "main": [[{"node": "Send Registered Greeting", "type": "main", "index": 0}]]
}

wf["versionId"] = str(uuid.uuid4())

with open(DST, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"[OK] v17 updated with first-message greeting. Total nodes: {len(wf['nodes'])}")

# ─── CRON Reminder Workflow ───────────────────────────────────────────────────
BASE_URL = "https://rebuff-husband-legibly.ngrok-free.dev/api/v1"
TOKEN = "klinikapp-n8n-secret-2024"
WA_PHONE_ID = "1038350189365408"

cron_wf = {
    "name": "KlinikApp - Randevu Hatirlatma CRON (v1)",
    "nodes": [
        {
            "parameters": {
                "rule": {
                    "interval": [{"field": "cronExpression", "expression": "0 9 * * *"}]
                }
            },
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1.2,
            "position": [240, 300],
            "id": "cron-trigger-001",
            "name": "Her Gun Saat 09:00"
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
            "position": [460, 300],
            "id": "fetch-reminders-001",
            "name": "Hatirlatilacak Randevulari Getir"
        },
        {
            "parameters": {},
            "type": "n8n-nodes-base.splitInBatches",
            "typeVersion": 3,
            "position": [680, 300],
            "id": "split-001",
            "name": "Her Randevu Icin"
        },
        {
            "parameters": {
                "operation": "send",
                "phoneNumberId": WA_PHONE_ID,
                "recipientPhoneNumber": "={{ $json.patientPhone }}",
                "textBody": (
                    "=Merhaba {{ $json.patientName }}! 👋\n\n"
                    "Yarinki randevunuzu hatirlatmak istedik:\n"
                    "📅 Tarih: {{ $now.plus({days:1}).setZone('Europe/Istanbul').setLocale('tr').toFormat('dd MMMM yyyy') }}\n"
                    "⏰ Saat: {{ $json.timeFormatted }}\n"
                    "👨‍⚕️ {{ $json.doctorName }}\n\n"
                    "Randevunuzu onaylamak icin *EVET*, iptal etmek icin *HAYIR* yazabilirsiniz."
                ),
                "additionalFields": {}
            },
            "type": "n8n-nodes-base.whatsApp",
            "typeVersion": 1,
            "position": [900, 300],
            "id": "send-reminder-001",
            "name": "Hatirlatma Gonder",
            "continueOnFail": True,
            "credentials": {
                "whatsAppApi": {
                    "id": "pAHu8UjOiUUJ4ORt",
                    "name": "WhatsApp account"
                }
            }
        },
        {
            "parameters": {
                "method": "PATCH",
                "url": f"={BASE_URL}/whatsapp/appointments/{{{{ $('Her Randevu Icin').item.json.appointmentId }}}}/reminder-sent?token={TOKEN}",
                "options": {"allowUnauthorizedCerts": True}
            },
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.4,
            "position": [1120, 300],
            "id": "mark-sent-001",
            "name": "Hatirlatmay SENT Yap",
            "continueOnFail": True
        }
    ],
    "pinData": {},
    "connections": {
        "Her Gun Saat 09:00": {
            "main": [[{"node": "Hatirlatilacak Randevulari Getir", "type": "main", "index": 0}]]
        },
        "Hatirlatilacak Randevulari Getir": {
            "main": [[{"node": "Her Randevu Icin", "type": "main", "index": 0}]]
        },
        "Her Randevu Icin": {
            "main": [[{"node": "Hatirlatma Gonder", "type": "main", "index": 0}]]
        },
        "Hatirlatma Gonder": {
            "main": [[{"node": "Hatirlatmay SENT Yap", "type": "main", "index": 0}]]
        }
    },
    "active": True,
    "settings": {"executionOrder": "v1"},
    "versionId": str(uuid.uuid4()),
    "meta": {"instanceId": "87c0a25f5af05297c61afecbc1a76e1f62d2b42e620b33813844c0d8fb6d57aa"},
    "id": "CRON_REMINDER_V1",
    "tags": []
}

with open("n8n-cron-reminder-v1.json", "w", encoding="utf-8") as f:
    json.dump(cron_wf, f, ensure_ascii=False, indent=2)

print(f"[OK] CRON reminder workflow saved to n8n-cron-reminder-v1.json")
print(f"     Schedule: Her gun saat 09:00")
print(f"     Nodes: {len(cron_wf['nodes'])}")
