import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"
CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node.get('name') == 'randevu_sorgula_telefon':
        params = node['parameters']

        # Full n8n expression URL — phone embedded, AI has ZERO params to fill
        # ={{ ... }} is proper n8n expression syntax that evaluates the whole URL
        params['url'] = (
            "={{ '"
            + NGROK_URL
            + "/api/v1/whatsapp/appointments/lookup"
            + "?token=" + SECRET
            + "&clinicId=" + CLINIC_ID
            + "&phone=' + $('Data Normalization').first().json.gonderen_no }}"
        )

        # Remove ALL query params — nothing for AI to fill
        params['sendQuery'] = False
        params['parametersQuery'] = {'values': []}

        params['toolDescription'] = (
            "Hastanin mevcut randevularini getirir. "
            "Hicbir parametre doldurma, otomatik calisir. "
            "Randevu guncelleme veya iptal icin ONCE bu tool'u cagir, "
            "appointmentId'yi al (id alani), sonra randevu_guncelle kullan."
        )

        print("✅ randevu_sorgula_telefon:")
        print(f"   URL: {params['url']}")
        print(f"   parametersQuery: {params['parametersQuery']}")
        print(f"   sendQuery: {params['sendQuery']}")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
