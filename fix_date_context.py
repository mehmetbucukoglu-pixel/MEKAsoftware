import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Date context prefix — n8n expression, Luxon ile dinamik tarih
DATE_CONTEXT = (
    "=### TARİH BAĞLAMI (Her mesajda otomatik güncellenir)\\n"
    "Bugün: {{ $now.setZone('Europe/Istanbul').toFormat('dd MMMM yyyy') }} "
    "({{ $now.setZone('Europe/Istanbul').toFormat('cccc') }})\\n"
    "Yarın: {{ $now.plus({days:1}).setZone('Europe/Istanbul').toFormat('dd MMMM yyyy') }} "
    "({{ $now.plus({days:1}).setZone('Europe/Istanbul').toFormat('cccc') }})\\n"
    "Bu haftanın günleri (TAM LİSTE - bunu kullan):\\n"
    "- Pazartesi: {{ $now.startOf('week').setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Salı: {{ $now.startOf('week').plus({days:1}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Çarşamba: {{ $now.startOf('week').plus({days:2}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Perşembe: {{ $now.startOf('week').plus({days:3}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Cuma: {{ $now.startOf('week').plus({days:4}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Cumartesi: {{ $now.startOf('week').plus({days:5}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "- Pazar: {{ $now.startOf('week').plus({days:6}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "Gelecek hafta Pazartesi: {{ $now.startOf('week').plus({days:7}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "Gelecek hafta Cuma: {{ $now.startOf('week').plus({days:11}).setZone('Europe/Istanbul').toFormat('dd/MM/yyyy') }}\\n"
    "\\n"
    "**KRİTİK KURAL**: Hasta 'Cuma' dediğinde yukarıdaki listeden 'Cuma' satırındaki tarihi kullan. "
    "Kendi tahminini yapma, listeyi kullan.\\n"
    "**Format**: Musaitlik sorgusunda date parametresi MUTLAKA 'YYYY-MM-DD' formatında olmalı "
    "(örn: {{ $now.startOf('week').plus({days:4}).setZone('Europe/Istanbul').toFormat('yyyy-MM-dd') }} for Cuma)\\n"
    "\\n"
    "---\\n\\n"
)

for node in wf['nodes']:
    if node.get('name') == 'AI Agent':
        params = node.get('parameters', {})
        options = params.get('options', {})
        old_prompt = options.get('systemMessage', '')
        
        # Remove old = prefix if exists
        if old_prompt.startswith('='):
            old_prompt = old_prompt[1:]
        
        # Prepend date context (which already starts with =)
        new_prompt = DATE_CONTEXT + old_prompt
        options['systemMessage'] = new_prompt
        print("✅ AI Agent system prompt updated with dynamic date context")
        print(f"   New prompt starts with: {new_prompt[:120]}...")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print()
print("File saved: n8n-workflow-v18-ngrok.json")
print()
print("HOW IT WORKS:")
print("  n8n evaluates $now at runtime -> AI gets exact dates for each weekday")
print("  User says 'Cuma' -> AI looks up Friday row -> uses correct date")
