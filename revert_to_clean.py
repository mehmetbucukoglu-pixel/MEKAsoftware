import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Nodes to remove (all our additions)
TO_REMOVE = {
    'Date Detector',
    'Musaitlik Sorgusu mu?',
    'Pre-Fetch Musaitlik',
    'Context Injector',
    'Specific Time?',
    'Format Availability Response',
    'Send Availability WA',
    'Save Availability Outbound',
}

before = len(wf['nodes'])
wf['nodes'] = [n for n in wf['nodes'] if n['name'] not in TO_REMOVE]
after = len(wf['nodes'])
print(f"✅ {before - after} node silindi: {before} → {after}")

conns = wf['connections']

# Remove connections FROM removed nodes
for name in TO_REMOVE:
    if name in conns:
        del conns[name]
        print(f"   Bağlantı silindi: {name}")

# Restore: Check Conversation Status → If NOT Human Mode
conns['Check Conversation Status'] = {
    "main": [[{"node": "If NOT Human Mode", "type": "main", "index": 0}]]
}
print("✅ Check Conversation Status → If NOT Human Mode (orijinal)")

# Restore: Isolate AI Input reads from Data Normalization (original)
for node in wf['nodes']:
    if node['name'] == 'Isolate AI Input':
        node['parameters']['assignments']['assignments'] = [
            {
                "id": "set-mesaj-icerigi-isolation",
                "name": "mesaj_icerigi",
                "value": "={{ $('Data Normalization').first().json.mesaj_icerigi }}",
                "type": "string"
            }
        ]
        print("✅ Isolate AI Input → $('Data Normalization').first().json.mesaj_icerigi (orijinal)")
        break

# Remove system_inject from anywhere it might have snuck in
for node in wf['nodes']:
    if node['name'] == 'Isolate AI Input':
        assignments = node['parameters']['assignments']['assignments']
        node['parameters']['assignments']['assignments'] = [
            a for a in assignments if a['name'] != 'system_inject'
        ]

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print(f"\nFinal node sayısı: {len(wf['nodes'])}")
print("\nKalan akış:")
print("  WhatsApp → Data Normalization → Check Conv Status → If NOT Human Mode → ... → AI Agent")
print("  AI Agent tools: randevu_sorgula, randevu_olustur, randevu_guncelle,")
print("                  musaitlik_kontrol, randevu_sorgula_telefon, eskalasyon, randevu_iptal")
