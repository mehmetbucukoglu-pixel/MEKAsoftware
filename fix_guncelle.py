import json

NGROK_URL = "https://rebuff-husband-legibly.ngrok-free.dev"
SECRET = "klinikapp-n8n-secret-2024"

with open('n8n-workflow-v18-ngrok.json', encoding='utf-8') as f:
    wf = json.load(f)

for node in wf['nodes']:
    name = node.get('name', '')
    params = node.get('parameters', {})

    # 1. Fix randevu_sorgula_telefon — phone must be fixed from gonderen_no
    if name == 'randevu_sorgula_telefon':
        params['url'] = (
            f"={NGROK_URL}/api/v1/whatsapp/appointments/lookup"
            f"?token={SECRET}"
            f"&phone={{{{ $('Data Normalization').first().json.gonderen_no }}}}"
        )
        params['sendQuery'] = False  # no more query params needed, all in URL
        params['parametersQuery'] = {'values': []}
        params['toolDescription'] = (
            "Hastanin mevcut randevularini getirir. "
            "phone parametresi otomatik dolduruluyor, sen doldurmana gerek yok. "
            "Her zaman bu tool'u cagir ve appointmentId'yi al, "
            "sonra randevu_guncelle veya randevu_iptal icin kullan."
        )
        print(f"✅ {name}: phone -> URL fixed expression")

    # 2. Fix randevu_guncelle — better description + durationMin default
    if name == 'randevu_guncelle':
        params['toolDescription'] = (
            "Mevcut bir randevuyu gunceller. "
            "ONCE randevu_sorgula_telefon cagirarak appointmentId'yi al, "
            "sonra bu tool'u cagir. "
            "startTime: yeni randevu saati 'YYYY-MM-DDTHH:MM:SS' formatinda. "
            "durationMin: varsayilan 60, degistirme."
        )
        # Set durationMin default
        body_vals = params.get('parametersBody', {}).get('values', [])
        for p in body_vals:
            if p.get('name') == 'durationMin' and not p.get('value'):
                p['value'] = '60'
        print(f"✅ {name}: description updated, durationMin=60 default")

with open('n8n-workflow-v18-ngrok.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print("\nDone. Manuel n8n değişiklikleri:")
print("  randevu_sorgula_telefon -> URL'e bak, Query Params boş olmalı")
print("  randevu_guncelle -> description güncellendi")
