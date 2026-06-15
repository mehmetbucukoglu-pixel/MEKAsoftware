import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'Simple Memory':
        # 1. Window'u 4'e düşür (yeterli context, eski tool sonuçları düşer)
        node['parameters']['contextWindowLength'] = 4
        # 2. Session key'e _v2 ekle → eski tüm memory temizlenir
        node['parameters']['sessionKey'] = "={{ $('Data Normalization').first().json.wa_id }}_v2\n"
        print("✅ Simple Memory güncellendi:")
        print("   contextWindowLength: 50 → 4")
        print("   sessionKey: wa_id → wa_id_v2  (eski memory temizlendi)")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
