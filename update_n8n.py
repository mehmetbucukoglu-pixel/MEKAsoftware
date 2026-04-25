import json
import copy

with open('n8n-workflow-v10-openai.json', 'r', encoding='utf-8') as f:
    wf = json.load(f)

# Update name
wf['name'] = "KlinikApp WhatsApp Bot v16 - V11 Escalation & Handover"

# 1. Update System Prompt in AI Agent Node (index 1 is OpenAI Chat Model, wait, prompt is in AI-Agent node sometimes. Let's find it.)
agent_node = next(n for n in wf['nodes'] if n['type'] == '@n8n/n8n-nodes-langchain.agent')
options = agent_node['parameters'].get('options', {})
prompt = options.get('systemMessage', '')

# Append new rules to prompt
new_rules = """
6. **Klinik Dışı Sorular:** Eğer müşteri randevu dışında klinik hakkında detaylı bilgi (doktor uzmanlıkları, fiyatlar, tedavi detayları vb.) isterse veya bir doktorla konuşmak isterse:
   - `eskalasyon` aracını çağır (reason: kısa açıklama, urgency: 'normal' veya 'urgent')
   - Müşteriye: "Bilginizi kliniğimize ilettim, en kısa sürede size dönüş yapılacaktır." de.
"""
options['systemMessage'] = prompt + new_rules
agent_node['parameters']['options'] = options


# 2. Add 'eskalasyon' tool
eskalasyon_tool = {
    "parameters": {
        "toolDescription": "Klinik dışı uzmanlık/fiyat sorularında veya müşterinin acil olarak doktor/insan ile görüşme talebinde bu aracı kullan.",
        "method": "POST",
        "url": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments/escalate?token=klinikapp-n8n-secret-2024",
        "sendHeaders": True,
        "parametersHeaders": {
            "values": [
                {
                    "name": "Content-Type",
                    "value": "application/json"
                }
            ]
        },
        "sendBody": True,
        "parametersBody": {
            "values": [
                {
                    "name": "waPhone",
                    "value": "={{ $('Data Normalization').first().json.gonderen_no }}"
                },
                {
                    "name": "reason"
                },
                {
                    "name": "urgency"
                },
                {
                    "name": "summary"
                }
            ]
        },
        "options": {}
    },
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [
        1250,
        864
    ],
    "id": "eskalasyon-tool",
    "name": "eskalasyon"
}
wf['nodes'].append(eskalasyon_tool)

# Connect tool to AI agent
wf['connections']['eskalasyon'] = {
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

# 3. Add 'Check Conversation Status' Pre-Filter
check_status_node = {
    "parameters": {
        "url": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments/conversation-status",
        "sendQuery": True,
        "queryParameters": {
            "parameters": [
                {
                    "name": "waPhone",
                    "value": "={{ $json.gonderen_no }}"
                },
                {
                    "name": "token",
                    "value": "klinikapp-n8n-secret-2024"
                }
            ]
        },
        "options": {
            "allowUnauthorizedCerts": True
        }
    },
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [
        -240,
        640
    ],
    "id": "check-conversation-status-node",
    "name": "Check Conversation Status",
    "continueOnFail": True
}

if_mode_node = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2
            },
            "conditions": [
                {
                    "id": "check-bot-mode",
                    "leftValue": "={{ $json.status.mode }}",
                    "rightValue": "HUMAN",
                    "operator": {
                        "type": "string",
                        "operation": "notEqual"
                    }
                }
            ],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [
        0,
        640
    ],
    "id": "if-not-human-node",
    "name": "If NOT Human Mode"
}

wf['nodes'].append(check_status_node)
wf['nodes'].append(if_mode_node)

# Fix connections
# Data Normalization array was: [Isolate AI Input, Forward to Backend]
# Now: Isolate AI input comes AFTER the If Mode node. Forward to Backend stays on Data Normalization.
data_norm_conns = wf['connections'].get('Data Normalization', {}).get('main', [[]])[0]
new_data_norm_conns = [c for c in data_norm_conns if c['node'] != 'Isolate AI Input']
new_data_norm_conns.append({ "node": "Check Conversation Status", "type": "main", "index": 0 })
wf['connections']['Data Normalization']['main'][0] = new_data_norm_conns

wf['connections']["Check Conversation Status"] = {
    "main": [
        [
            {
                "node": "If NOT Human Mode",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

wf['connections']["If NOT Human Mode"] = {
    "main": [
        [
            {
                "node": "Isolate AI Input",
                "type": "main",
                "index": 0
            }
        ],
        [] # false path (human mode -> do nothing)
    ]
}

# The Check Status API node output will overwrite $json context. 
# We need to make sure Isolate AI Input still uses the original message.
# In Isolate AI Input, assignments use `={{ $('Data Normalization').first().json.mesaj_icerigi }}` instead of `={{ $json.mesaj_icerigi }}` to be safe.
isolate_node = next(n for n in wf['nodes'] if n['name'] == 'Isolate AI Input')
isolate_node['parameters']['assignments']['assignments'][0]['value'] = "={{ $('Data Normalization').first().json.mesaj_icerigi }}"

# Move forward to backend visual position
for n in wf['nodes']:
    if n['name'] == 'Forward to Backend':
        n['position'] = [20, 440]
    if n['name'] == 'Isolate AI Input':
        n['position'] = [240, 640]

with open('n8n-workflow-v11-openai.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=4, ensure_ascii=False)

print("n8n-workflow-v11-openai.json updated successfully.")
