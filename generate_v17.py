import json, copy, uuid

SRC = "KlinikApp WhatsApp Bot v16 - V11 Escalation & Handover.json"
DST = "n8n-workflow-v17-registered-only.json"

with open(SRC, encoding="utf-8") as f:
    wf = json.load(f)

# ── 1. Fix randevu_olustur: waPhone replaces patientName+patientPhone ─────────
for node in wf["nodes"]:
    if node["name"] == "randevu_olustur":
        node["parameters"]["parametersBody"]["values"] = [
            {"name": "clinicId"},
            {"name": "waPhone"},
            {"name": "doctorName"},
            {"name": "startTime"},
            {"name": "durationMin"},
        ]
        node["parameters"]["toolDescription"] = (
            "Yeni bir randevu oluşturur. Sadece waPhone (gönderenin WhatsApp numarası), "
            "doktor adı ve randevu zamanı gereklidir. Backend kayıtlı hastayı otomatik bulur."
        )

# ── 2. Fix system prompt ──────────────────────────────────────────────────────
for node in wf["nodes"]:
    if node["name"] == "AI Agent":
        sp = node["parameters"]["options"]["systemMessage"]
        # Remove Ön-Kayıt line
        sp = sp.replace(
            "- **Ön-Kayıt**: İsim zaten biliniyorsa (`patientName` doluysa) tekrar Ad/Soyad sorma.\n",
            ""
        )
        sp = sp.replace(
            "- **Ön-Kayıt**: İsim zaten biliniyorsa (`patientName` doluysa) tekrar Ad/Soyad sorma.",
            ""
        )
        # Add isRegistered to context block
        sp = sp.replace(
            "- Müşteri Adı: {{ $('Check Conversation Status').first().json.patientName || 'Misafir' }}",
            "- Müşteri Adı: {{ $('Check Conversation Status').first().json.patientName || 'Bilinmiyor' }}\n"
            "- Kayıt Durumu: {{ $('Check Conversation Status').first().json.isRegistered ? '✅ Kayıtlı Hasta' : '❌ Kayıtsız' }}"
        )
        # Add rule about registered-only appointments
        sp = sp.replace(
            "- **Doktor İsim Karışıklığı**",
            "- **Randevu Kısıtı**: Sadece kayıtlı hastalar randevu alabilir. `isRegistered` false ise randevu aracını KULLANMA, sadece eskalasyon yap.\n"
            "- **Doktor İsim Karışıklığı**"
        )
        node["parameters"]["options"]["systemMessage"] = sp

# ── 3. Add new nodes ──────────────────────────────────────────────────────────
check_reg_node = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2
            },
            "conditions": [{
                "id": "check-is-registered",
                "leftValue": "={{ $json.isRegistered }}",
                "rightValue": True,
                "operator": {"type": "boolean", "operation": "true"}
            }],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [48288, 18400],
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Is Registered?"
}

unreg_reply_node = {
    "parameters": {
        "assignments": {
            "assignments": [{
                "id": "unreg-reply",
                "name": "output",
                "value": (
                    "Merhaba! 👋 Numaranıza kayıtlı bir hastamız bulunamadı.\n\n"
                    "Randevu alabilmek için kliniğimizde kayıtlı olmanız gerekmektedir. "
                    "Kayıt yaptırmak için kliniğimizi arayabilirsiniz.\n\n"
                    "Doktor, adres veya fiyat bilgisi almak isterseniz yardımcı olmaktan memnuniyet duyarım. 🏥"
                ),
                "type": "string"
            }]
        },
        "options": {}
    },
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.4,
    "position": [48528, 18550],
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Unregistered Reply"
}

send_unreg_node = {
    "parameters": {
        "operation": "send",
        "phoneNumberId": "1038350189365408",
        "recipientPhoneNumber": "={{ $('Data Normalization').first().json.gonderen_no }}",
        "textBody": "={{ $json.output }}",
        "additionalFields": {}
    },
    "type": "n8n-nodes-base.whatsApp",
    "typeVersion": 1,
    "position": [48752, 18550],
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Send Unregistered Msg",
    "credentials": {
        "whatsAppApi": {
            "id": "pAHu8UjOiUUJ4ORt",
            "name": "WhatsApp account"
        }
    }
}

wf["nodes"].extend([check_reg_node, unreg_reply_node, send_unreg_node])

# ── 4. Rewire connections ─────────────────────────────────────────────────────
# If NOT Human Mode → true branch → Is Registered? (was Isolate AI Input)
wf["connections"]["If NOT Human Mode"]["main"][0] = [
    {"node": "Is Registered?", "type": "main", "index": 0}
]

# Is Registered? → true: Isolate AI Input, false: Unregistered Reply
wf["connections"]["Is Registered?"] = {
    "main": [
        [{"node": "Isolate AI Input", "type": "main", "index": 0}],
        [{"node": "Unregistered Reply", "type": "main", "index": 0}]
    ]
}

# Unregistered Reply → Send Unregistered Msg
wf["connections"]["Unregistered Reply"] = {
    "main": [[{"node": "Send Unregistered Msg", "type": "main", "index": 0}]]
}

# ── 5. Metadata ───────────────────────────────────────────────────────────────
wf["name"] = "KlinikApp WhatsApp Bot v17 - Registered Only"
wf["versionId"] = str(uuid.uuid4())

with open(DST, "w", encoding="utf-8") as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"[OK] v17 workflow saved to {DST}")
print(f"   Nodes: {len(wf['nodes'])}")
print(f"   New nodes: Is Registered?, Unregistered Reply, Send Unregistered Msg")
