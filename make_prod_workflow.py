import json

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    content = f.read()

OLD = 'rebuff-husband-legibly.ngrok-free.dev'
NEW = 'api.mekapanel.com'

count = content.count(OLD)
content = content.replace(OLD, NEW)

with open('n8n-workflow-v19-production.json', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ {count} URL değiştirildi: {OLD} → {NEW}")
print("   Yeni dosya: n8n-workflow-v19-production.json")
