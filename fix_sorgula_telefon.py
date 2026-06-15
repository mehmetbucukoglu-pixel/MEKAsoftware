import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"
CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node.get('name') == 'randevu_sorgula_telefon':
        params = node['parameters']

        # Clean URL — no expression, like musaitlik_kontrol pattern
        params['url'] = f"{NGROK_URL}/api/v1/whatsapp/appointments/lookup?token={SECRET}&clinicId={CLINIC_ID}"

        # sendQuery: true — query params handled properly
        params['sendQuery'] = True

        # phone as fixed value (n8n evaluates this, AI can't override)
        params['parametersQuery'] = {
            'values': [
                {
                    'name': 'phone',
                    'value': "={{ $('Data Normalization').first().json.gonderen_no }}"
                }
            ]
        }

        params['toolDescription'] = (
            "Hastanin mevcut randevularini getirir. "
            "phone parametresi otomatik doldurulur, sen doldurmana gerek yok. "
            "Randevu guncelleme veya iptal icin ONCE bu tool'u cagir, "
            "appointmentId'yi al, sonra randevu_guncelle veya randevu_iptal kullan."
        )

        print("✅ randevu_sorgula_telefon fixed:")
        print(f"   URL: {params['url']}")
        print(f"   phone value: {params['parametersQuery']['values'][0]['value']}")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)
