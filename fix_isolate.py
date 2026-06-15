import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node['name'] == 'Isolate AI Input':
        node['parameters']['assignments']['assignments'][0]['value'] = \
            "={{ $json.mesaj_icerigi }}"
        print("✅ Isolate AI Input güncellendi:")
        print("   ÖNCE: $('Data Normalization').first().json.mesaj_icerigi")
        print("   SONRA: $json.mesaj_icerigi  (Context Injector'ın enriched versiyonu)")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
