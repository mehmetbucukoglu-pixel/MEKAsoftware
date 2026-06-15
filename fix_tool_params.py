import json

CLINIC_ID = "135460d3-f612-457f-89e8-8ead3181c562"
NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

# Find the node name that holds gonderen_no (Data Normalization)
# waPhone comes from the webhook trigger -> gonderen_no

fixed_tools = {
    'randevu_olustur': {
        'toolDescription': (
            "Yeni randevu oluşturur. "
            "SADECE şu 2 parametreyi doldur: doctorName ve startTime. "
            "clinicId ve waPhone otomatik doldurulur, sen doldurma. "
            "startTime formatı: 'YYYY-MM-DDTHH:MM:SS' (örn: 2026-06-19T14:00:00)"
        ),
        'method': 'POST',
        'url': f"{NGROK_URL}/api/v1/whatsapp/appointments?token={SECRET}",
        'sendHeaders': True,
        'parametersHeaders': {
            'values': [
                {'name': 'Content-Type', 'value': 'application/json'},
                {'name': 'ngrok-skip-browser-warning', 'value': '1'},
            ]
        },
        'sendBody': True,
        'specifyBody': 'json',
        # Use jsonBody to send fixed + AI-filled params together
        'jsonBody': (
            "={"
            "\"clinicId\": \"" + CLINIC_ID + "\","
            "\"waPhone\": \"{{ $('Data Normalization').first().json.gonderen_no }}\","
            "\"doctorName\": \"{doctorName}\","
            "\"startTime\": \"{startTime}\","
            "\"durationMin\": 60"
            "}"
        ),
    },
    'randevu_guncelle': {
        'toolDescription': (
            "Mevcut randevuyu günceller. "
            "appointmentId (randevu ID'si) ve yeni startTime gerekli. "
            "startTime formatı: 'YYYY-MM-DDTHH:MM:SS'"
        ),
    },
}

changed = []

for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})

    if name == 'randevu_olustur':
        # Fix description
        params['toolDescription'] = fixed_tools['randevu_olustur']['toolDescription']

        # Fix Content-Type header value
        headers = params.get('parametersHeaders', {}).get('values', [])
        for h in headers:
            if h.get('name') == 'Content-Type' and not h.get('value'):
                h['value'] = 'application/json'

        # Fix body parameters: clinicId and waPhone should have fixed values
        body_params = params.get('parametersBody', {}).get('values', [])
        for p in body_params:
            if p.get('name') == 'clinicId' and not p.get('value'):
                p['value'] = CLINIC_ID
                changed.append('randevu_olustur.clinicId = fixed UUID')
            elif p.get('name') == 'waPhone' and not p.get('value'):
                p['value'] = "={{ $('Data Normalization').first().json.gonderen_no }}"
                changed.append('randevu_olustur.waPhone = expression from gonderen_no')
            elif p.get('name') == 'durationMin' and not p.get('value'):
                p['value'] = '60'
                changed.append('randevu_olustur.durationMin = 60 (default)')

    elif name == 'randevu_guncelle':
        # Fix Content-Type header value
        headers = params.get('parametersHeaders', {}).get('values', [])
        for h in headers:
            if h.get('name') == 'Content-Type' and not h.get('value'):
                h['value'] = 'application/json'

    elif name == 'randevu_sorgula' or name == 'randevu_sorgula_telefon':
        # Fix clinicId if empty
        query_params = params.get('parametersQuery', {}).get('values', [])
        for p in query_params:
            if p.get('name') == 'clinicId' and not p.get('value'):
                p['value'] = CLINIC_ID
                changed.append(f'{name}.clinicId = fixed UUID')

    elif name == 'musaitlik_kontrol':
        # Fix clinicId query param if empty
        query_params = params.get('parametersQuery', {}).get('values', [])
        for p in query_params:
            if p.get('name') == 'clinicId' and not p.get('value'):
                p['value'] = CLINIC_ID
                changed.append('musaitlik_kontrol.clinicId = fixed UUID')

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("=== FIXED ===")
for c in changed:
    print(f"  ✅ {c}")
print()
print("SUMMARY:")
print("  randevu_olustur.clinicId -> sabit UUID (AI doldurmaz)")
print("  randevu_olustur.waPhone  -> $('Data Normalization').gonderen_no (AI doldurmaz)")
print("  randevu_olustur.durationMin -> 60 (default)")
print("  Content-Type -> application/json")
print()
print("AI ARTIK SADECE DOLDURUYOR:")
print("  - doctorName (örn: 'Dr. Ayse Pinar Vural')")
print("  - startTime  (örn: '2026-06-19T14:00:00')")
