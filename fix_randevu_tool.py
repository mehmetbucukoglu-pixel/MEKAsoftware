import json

CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"
NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    if node.get('name') == 'randevu_olustur':
        params = node['parameters']

        # 1. Update URL — waPhone and clinicId hardcoded here, AI cannot touch them
        params['url'] = (
            f"={NGROK_URL}/api/v1/whatsapp/appointments"
            f"?token={SECRET}"
            f"&waPhone={{{{ $('Data Normalization').first().json.gonderen_no }}}}"
        )

        # 2. Update tool description — clearly say AI only fills 2 params
        params['toolDescription'] = (
            "Yeni randevu oluşturur. "
            "SADECE 2 parametre doldur: doctorName ve startTime. "
            "Başka hiçbir şey doldurma. "
            "startTime formatı: 'YYYY-MM-DDTHH:MM:SS' (örn: 2026-06-19T14:00:00). "
            "doctorName: doktorun adı (örn: 'Dr. Ayşe Pınar Vural')."
        )

        # 3. Body params: ONLY doctorName and startTime (remove clinicId, waPhone, durationMin)
        params['parametersBody'] = {
            'values': [
                {
                    'name': 'doctorName',
                    'description': 'Doktorun tam adı (örn: Dr. Ayşe Pınar Vural)'
                },
                {
                    'name': 'startTime',
                    'description': "Randevu başlangıç zamanı ISO formatında (örn: 2026-06-19T14:00:00)"
                },
                {
                    'name': 'durationMin',
                    'value': '60',
                    'description': 'Randevu süresi dakika cinsinden (default 60)'
                },
            ]
        }

        # 4. Make sure method is POST and sendBody is true
        params['method'] = 'POST'
        params['sendBody'] = True
        params['sendHeaders'] = True

        # 5. Fix Content-Type header
        params['parametersHeaders'] = {
            'values': [
                {'name': 'Content-Type', 'value': 'application/json'},
                {'name': 'ngrok-skip-browser-warning', 'value': '1'},
            ]
        }

        print("✅ randevu_olustur node updated:")
        print(f"   URL: {params['url'][:80]}...")
        print(f"   Body params: {[p['name'] for p in params['parametersBody']['values']]}")
        break

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print()
print("RESULT:")
print("  waPhone -> URL query param (n8n expression, AI dokunamaz)")
print("  clinicId -> Backend defaultClinicId kullanıyor (body'de gerekmez)")
print("  AI SADECE dolduruyor: doctorName + startTime")
