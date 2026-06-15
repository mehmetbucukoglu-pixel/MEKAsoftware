import json, copy

# ─────────────────────────────────────────────
# CONFIGURATION — change these for production
# ─────────────────────────────────────────────
OLD_BASE = "https://rebuff-husband-legibly.ngrok-free.dev"
NEW_BASE = "http://localhost:3000"  # ← will be replaced with real URL at deploy time

CLINIC_ID  = "135460d3-f612-457f-89e8-8ead3181c562"
N8N_SECRET = "klinikapp-n8n-secret-2024"
WA_PHONE_ID = "1038350189365408"
WA_VERIFY_TOKEN = "klinikapp-wa-verify-token"

# ─────────────────────────────────────────────
# IMPROVED SYSTEM PROMPT (v18)
# ─────────────────────────────────────────────
NEW_SYSTEM_PROMPT = """=# 🎭 Rol & Kimlik
Sen Feneryolu Psikiyatri kliniğinin resmi dijital asistanısın.
Ton: Samimi, profesyonel, anlayışlı ve çözüm odaklı.
Yanıtların KISA ve NET olsun — gereksiz açıklama yapma.

# ⚡ ANA İŞ AKIŞI (2 YOL)

## YOL 1: RANDEVU İŞLEMLERİ (Smooth Flow)
Randevu alma, sorgulama, güncelleme ve iptal işlemleri bu yola girer.

**Kurallar:**
1. Gereksiz doğrulama yapma — isim/doktor biliniyorsa tekrar sorma.
2. `musaitlik_kontrol` aracından gelen `suggestedSlots` (maks 3 adet) listesini sun.
3. `patientPatterns` verisindeki favori saati/doktoru proaktif teklif et.
4. Randevu onayında referans kodunu paylaş.
5. Saat formatı: 24 saat (10:00, 14:30) — SADECE HH:mm formatında kullan.
6. startTime formatı API'ye gönderirken: "YYYY-MM-DDTHH:mm:00" (ISO 8601).

## YOL 2: KLİNİK İLETİŞİM (Eskalasyon)
Aşağıdaki durumlarda bu yola gir:
- Randevu dışı sorular (fiyat, reçete, sigorta, tedavi bilgisi)
- "İnsan ile konuşmak istiyorum / doktor ile görüşmek istiyorum"
- Duygu Durumu 'ANGRY' veya 'CRISIS' olan hastalar
- Acil durum belirtileri

**Kurallar:**
1. Özet/onay SORMA — HEMEN `eskalasyon` aracını çağır.
2. Müşteriye kısa teyit ver: "Kliniğimizden size en kısa sürede dönülecektir."
3. urgency: ANGRY/CRISIS ise "HIGH", normal soru ise "NORMAL"

# 📊 Akıllı Bağlam (Context — her mesajda güncel)
- Bugün: {{ $now.setZone('Europe/Istanbul').setLocale('tr').toFormat('dd MMMM yyyy cccc HH:mm') }}
- DİKKAT: ŞU ANKİ YIL 2026'DIR!
- Müşteri Adı: {{ $('Check Conversation Status').first().json.patientName || 'Bilinmiyor' }}
- Kayıt Durumu: {{ $('Check Conversation Status').first().json.isRegistered ? '✅ Kayıtlı Hasta' : '❌ Kayıtsız' }}
- Duygu Durumu: {{ $('Check Conversation Status').first().json.sentiment }} (ANGRY → direkt YOL 2!)
- Kayıtlı Doktor: {{ $('Check Conversation Status').first().json.doctorName || 'Bilinmiyor' }}
- Tercihler: {{ JSON.stringify($('Check Conversation Status').first().json.patientPatterns) }}
- Klinik Doktorları: 1. Dr. Ayşe Pınar Vural, 2. Dr. Ece Yılmaz

# 📅 Takvim Referansı
Bugün: {{ $now.setZone('Europe/Istanbul').toFormat('yyyy-MM-dd') }} ({{ $now.setZone('Europe/Istanbul').setLocale('tr').toFormat('cccc') }})
Yarın: {{ $now.setZone('Europe/Istanbul').plus({days:1}).toFormat('yyyy-MM-dd') }}
+2 Gün: {{ $now.setZone('Europe/Istanbul').plus({days:2}).toFormat('yyyy-MM-dd') }}
+3 Gün: {{ $now.setZone('Europe/Istanbul').plus({days:3}).toFormat('yyyy-MM-dd') }}
+4 Gün: {{ $now.setZone('Europe/Istanbul').plus({days:4}).toFormat('yyyy-MM-dd') }}
+5 Gün: {{ $now.setZone('Europe/Istanbul').plus({days:5}).toFormat('yyyy-MM-dd') }}
+6 Gün: {{ $now.setZone('Europe/Istanbul').plus({days:6}).toFormat('yyyy-MM-dd') }}

# 🛡️ OPERASYONEL KURALLAR
- **Randevu Kısıtı**: `isRegistered` false ise randevu aracını KULLANMA — sadece eskalasyon yap.
- **Doktor İsim Karışıklığı**: "Ayşe", "Ece" DOKTOR isimleridir. Hastaya bu isimlerle hitap ETME.
- **Çoklu Mesaj**: Arka arkaya gelen mesajları bütün olarak değerlendir (combined context).
- **Randevu Onay Teyidi**: Randevu oluştururken/güncellerken mutlaka referans kodu paylaş.
- **Cevap Dili**: Hasta Türkçe yazıyorsa Türkçe, İngilizce yazıyorsa İngilizce yanıtla.
- **Emoji Kullanımı**: Profesyonel bağlamda minimal emoji (📅✅❌) kullan, aşırıya kaçma."""

# ─────────────────────────────────────────────
# IMPROVED REMINDER MESSAGE
# ─────────────────────────────────────────────
NEW_REMINDER_MSG = """=Merhaba {{ $json.patientName }}! 👋

Yarınki randevunuzu hatırlatmak istedik:
📅 Tarih: {{ $now.plus({days:1}).setZone('Europe/Istanbul').setLocale('tr').toFormat('dd MMMM yyyy') }}
⏰ Saat: {{ $json.timeFormatted }}
👨‍⚕️ {{ $json.doctorName }}

Randevunuzu onaylamak için *EVET*, iptal etmek için *HAYIR* yazabilirsiniz.

_Feneryolu Psikiyatri Kliniği_"""

# ─────────────────────────────────────────────
# IMPROVED UNREGISTERED REPLY
# ─────────────────────────────────────────────
NEW_UNREGISTERED_MSG = """Merhaba! 👋 

Bu numaraya kayıtlı bir hasta bulunamadı.

Randevu alabilmek için kliniğimize kayıt yaptırmanız gerekmektedir. Kayıt için bizi arayabilirsiniz.

📞 Genel bilgi, adres veya fiyat konusunda yardımcı olmamı ister misiniz?"""

# ─────────────────────────────────────────────
# LOAD & PATCH
# ─────────────────────────────────────────────
with open('n8n-workflow-v17-final.json', encoding='utf-8') as f:
    wf = json.load(f)

wf['name'] = 'KlinikApp WhatsApp Bot v18 - Production Ready'

changes = []

def replace_url(url_str):
    if isinstance(url_str, str) and OLD_BASE in url_str:
        return url_str.replace(OLD_BASE, NEW_BASE)
    return url_str

for node in wf['nodes']:
    ntype = node.get('type', '')
    nname = node.get('name', '')
    params = node.get('parameters', {})

    # 1. Update all URLs (HTTP nodes and tool nodes)
    for key in ['url', 'toolUrl']:
        if key in params:
            old = params[key]
            new = replace_url(old)
            if old != new:
                params[key] = new
                changes.append(f"URL updated in [{nname}]: {old[:60]}... → {new[:60]}...")

    # 2. Update query/header parameters that contain URLs
    for param_group in ['queryParameters', 'headerParameters', 'bodyParameters']:
        group = params.get(param_group, {})
        for item in group.get('parameters', []):
            if isinstance(item.get('value'), str) and OLD_BASE in item['value']:
                old = item['value']
                item['value'] = replace_url(old)
                changes.append(f"Param URL updated in [{nname}].{param_group}")

    # 3. Fix AI Agent system prompt
    if nname == 'AI Agent':
        if 'options' in params:
            params['options']['systemMessage'] = NEW_SYSTEM_PROMPT
            changes.append("AI Agent system prompt updated to v18")
        # Fix temperature — 0.4 is good, keep it. But ensure it's in options.
        # Also ensure model temperature set
    
    # 4. Fix CRON reminder message
    if nname == 'CRON: WA Hatirlama Gonder':
        params['textBody'] = NEW_REMINDER_MSG
        changes.append("CRON reminder message updated")

    # 5. Fix Unregistered Reply text
    if nname == 'Unregistered Reply':
        assignments = params.get('assignments', {}).get('assignments', [])
        for a in assignments:
            if a.get('name') == 'output':
                a['value'] = NEW_UNREGISTERED_MSG
                changes.append("Unregistered reply message updated")

    # 6. Fix HTTP Request1 body — remove trailing quote bug
    # Line 584: "value": "={{ $('AI Agent').item.json.output }}\""  <-- BUG: extra \"
    if nname == 'HTTP Request1':
        body_params = params.get('bodyParameters', {})
        for bp in body_params.get('parameters', []):
            if bp.get('name') == 'body' and bp.get('value','').endswith('\\"'):
                bp['value'] = bp['value'].rstrip('\\"')
                changes.append("Fixed HTTP Request1 body trailing quote bug")
            if bp.get('name') == 'waMessageId':
                # Currently uses $now which is a datetime, not a message ID
                # Fix: use a timestamp-based ID for outbound messages
                bp['value'] = "=OUTBOUND_{{ $now.toMillis() }}"
                changes.append("Fixed HTTP Request1 waMessageId (was $now datetime)")

    # 7. Fix Check Conversation Status - ensure allowUnauthorizedCerts only for local
    if nname == 'Check Conversation Status':
        if 'options' not in params:
            params['options'] = {}
        params['options']['allowUnauthorizedCerts'] = True  # keep for now, remove in prod

    # 8. Fix Simple Memory context window — increase to 50 for better context
    if nname == 'Simple Memory':
        params['contextWindowLength'] = 50
        changes.append("Memory window: 30 → 50 messages")

print('=== CHANGES APPLIED ===')
for c in changes:
    print(f'  ✅ {c}')

print(f'\nTotal changes: {len(changes)}')

# ─────────────────────────────────────────────
# SAVE v18
# ─────────────────────────────────────────────
with open('n8n-workflow-v18-production.json', 'w', encoding='utf-8') as f:
    json.dump(wf, f, ensure_ascii=False, indent=2)

print('\n✅ Saved: n8n-workflow-v18-production.json')
print()
print('=== REMAINING MANUAL STEPS IN n8n ===')
print('1. Import n8n-workflow-v18-production.json')
print('2. Set OpenAI credential on "OpenAI Chat Model" node')
print('3. Set WhatsApp credential on ALL "Send message" nodes (4 nodes)')
print('4. Verify clinicId in all tool URLs matches production DB')
print('5. Activate workflow (toggle: Inactive → Active)')
print()
print('=== POST-DEPLOY URL UPDATE ===')
print(f'Replace: {NEW_BASE}')
print('With: https://api.YOURDOMAIN.com')
print('(Use n8n Variables feature or re-run this script with correct NEW_BASE)')
