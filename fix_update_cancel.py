import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})

    # Fix randevu_guncelle — POST to /update-by-id, all params in body
    if name == 'randevu_guncelle':
        params['method'] = 'POST'
        params['url'] = f"{NGROK_URL}/api/v1/whatsapp/appointments/update-by-id?token={SECRET}"
        params['sendBody'] = True
        params['parametersBody'] = {
            'values': [
                {
                    'name': 'appointmentId',
                    'description': 'Guncellenecek randevunun ID\'si. randevu_sorgula_telefon ciktisindan al (id alani).'
                },
                {
                    'name': 'startTime',
                    'description': 'Yeni randevu baslangic zamani ISO formatinda (ornek: 2026-06-29T11:00:00)'
                },
                {
                    'name': 'durationMin',
                    'value': '60',
                    'description': 'Randevu suresi dakika (varsayilan 60, degistirme)'
                }
            ]
        }
        params['toolDescription'] = (
            "Mevcut bir randevuyu gunceller. "
            "ONCE randevu_sorgula_telefon cagir, appointmentId'yi al (id alani), "
            "sonra bu tool'u cagir. "
            "appointmentId ZORUNLU. startTime: 'YYYY-MM-DDTHH:MM:SS' formatinda."
        )
        print(f"✅ {name}: POST /update-by-id, appointmentId body'de")

    # Fix randevu_iptal — POST to /cancel-by-id, appointmentId in body
    if 'iptal' in name.lower() or 'cancel' in name.lower():
        params['method'] = 'POST'
        params['url'] = f"{NGROK_URL}/api/v1/whatsapp/appointments/cancel-by-id?token={SECRET}"
        params['sendBody'] = True
        params['parametersBody'] = {
            'values': [
                {
                    'name': 'appointmentId',
                    'description': 'Iptal edilecek randevunun ID\'si. randevu_sorgula_telefon ciktisindan al (id alani).'
                }
            ]
        }
        params['toolDescription'] = (
            "Mevcut bir randevuyu iptal eder. "
            "ONCE randevu_sorgula_telefon cagir, appointmentId'yi al, "
            "sonra bu tool'u cagir. appointmentId ZORUNLU."
        )
        print(f"✅ {name}: POST /cancel-by-id, appointmentId body'de")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone. Import et ve 'randevumu guncelle' diye test et.")
