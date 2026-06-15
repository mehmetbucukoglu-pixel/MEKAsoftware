import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'musaitlik_kontrol':
        old_desc = node['parameters'].get('description', '')
        node['parameters']['description'] = (
            "ZORUNLU: Hasta herhangi bir gün, tarih veya saat sorduğunda MUTLAKA bu tool'u çağır. "
            "Konuşma geçmişindeki eski müsaitlik verileri GEÇERSIZDIR — her soru için yeni çağrı yap. "
            "Tool çağırmadan kesinlikle müsaitlik bilgisi verme. "
            "preferredTime parametresi: kullanıcı saat belirttiyse (örn: '14:00') doldur, "
            "belirtmediyse boş bırak — boş bırakılırsa o günün tüm müsait saatleri gelir."
        )
        print(f"✅ musaitlik_kontrol description güncellendi")
        print(f"   Yeni: {node['parameters']['description'][:80]}...")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
