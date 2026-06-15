import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Fix: read mesaj_icerigi OR combinedText (Check Conversation Status output)
# Also fix: Context Injector needs mesaj_icerigi from Data Normalization node

for node in wf['nodes']:
    if node['name'] == 'Date Detector':
        code = node['parameters']['jsCode']
        # Replace the msg line to also check combinedText
        code = code.replace(
            "const msg = ($input.item.json.mesaj_icerigi || '').toLowerCase();",
            "const msg = ($input.item.json.mesaj_icerigi || $input.item.json.combinedText || '').toLowerCase();"
        )
        node['parameters']['jsCode'] = code
        print("✅ Date Detector: combinedText fallback eklendi")
        print(f"   İlk satır: {code.strip().splitlines()[1]}")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
