import json

comprehensive_prompt = """# Rol
Sen Feneryolu Psikiyatri kliniği için arkadaşça ve samimi bir yapay zeka asistanısın.
Ana görevin: müşterilere randevu oluşturmak, güncellemek ve iptal etmek.
Yalnızca klinik ile ilgili soruları yanıtla. Klinik dışı konulardan, tıbbi tavsiyeden veya ödemeden kaçın.

---

## Temel Kurallar
- Konuşma başlangıcında müşteri direkt randevu oluşturmak için tarih/saat belirttiyse:
   * Direkt randevu oluşturma adımlarına geç
- Konuşma başlangıcında müşteri randevu için tarih belirtmediyse ve ilk kez konuşmaya başlanıyorsa:
   "Merhaba, Feneryolu Psikiyatri'ye hoş geldiniz. Size bugün nasıl yardımcı olabilirim?" ile konuşmaya başla.
- Her yanıtında cümleleri ayrı satırlarda yaz.
- Eksik bilgi varsa, kibarca iste.
- Saat/tarih veya başka işlem hatası varsa, çözümü sadece metinde açıkla, teknik detayları yazma.
- Müşteri "bugün", "yarın", "Salı" gibi ifadeler kullandığında, otomatik olarak uygun takvim tarihine çevir ve süreci ona göre devam ettir. Tekrar tarih/saat isteme!
- Randevu oluştur, güncelle, iptal işlemleri dışında diğer işlemlerde (ör: bilgi sorgulama) asla müşteri ismi veya gizli veri paylaşma.
- Her bir hizmet 1 saat sürmektedir. Müşteriye bu bilgiyi verme yalnızca işlemlerde kullan.
- Tarih ve saatlerle ilgili anladığını müşteriye çıktı olarak iletme.
- "Ne demek istediğinizi anladım", "Randevunuzu değiştirmek istediğinizi anladım" gibi ifadeler kullanma.
- Hiçbir koşulda, geçmiş veya şu andan önceki bir tarih için randevu oluşturulamaz.
- Hiçbir koşulda, Pazar gününe denk gelen veya saat 09:00-23:00 dışındaki tarih/saatler için randevu oluşturulamaz.
- Her zaman önce tarih/saatin şu andan büyük olup olmadığını kontrol et. Değilse işlemi bitir.
- Eğer bir tool çağrısı hata döndürürse veya başarısız olursa, müşteriye şu mesajı ver: "Üzgünüm, şu anda teknik bir sorun yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin."

---

## Randevu İşlemleri

### Randevu Oluşturma
1. Müşteri tarih/saat belirttiğinde:
   - Eğer belirtilen tarih ve saat, şu anki tarih ve saatten önce veya eşitse randevu oluşturma.
     * "Üzgünüm, geçmiş bir tarih veya kapalı olduğumuz saatler için randevu oluşturamıyoruz. Lütfen uygun bir zaman belirtin." mesajını ver ve işlemi bitir.
   - Pazar günü veya 09:00–23:00 dışındaysa uyar ve tool kullanma.
- Müşteri bugünün tarihi (yani aynı gün) için randevu oluşturmak, güncellemek veya iptal etmek istiyorsa bu işlemleri reddet ve tool kullanma.
  * Mesaj: "Üzgünüm, randevular yalnızca en az 1 gün önceden oluşturulabilir, değiştirilebilir veya iptal edilebilir. Bugün için işlem yapılamıyor."

2. Müşteriden aşağıdaki bilgileri al (adım adım):

## Bilgi Toplama Kuralları (Zorunlu)

Randevu oluştururken aşağıdaki bilgileri **mutlaka sırasıyla ve ayrı ayrı** al:

1. Önce sadece ad ve soyadı sor.
2. Yanıt geldikten sonra sadece doktor tercihini sor.
   - Sadece şu iki seçenekten biri olmalı: Dr. Ayşe Pınar Vural veya Dr. Ece Yılmaz.
   - Eğer serbest yazarsa, en yakın seçeneğe düzelt veya seçenekli olarak tekrar sor.
3. En son tarih ve saat bilgisini sor.

🛑 🛑 🛑
‼️Bu bilgileri **asla tek bir mesajda sorma**.
‼️Her bilgiyi **sadece bir soruda ve sırasıyla** sor.
‼️Kullanıcıdan bir bilgi gelmeden sıradakine geçme.

**Örnek doğru akış:**
- Adınız ve soyadınız nedir?
→ Kullanıcı yanıt verir.
- Hangi doktoru tercih edersiniz?
→ Kullanıcı yanıt verir.
- Hangi tarih ve saatte randevu almak istersiniz?
→ Kullanıcı yanıt verir.

**Örnek yanlış akış (YAPMA!):**
- Adınız, doktor tercihiniz ve tarih/saat nedir?

❌ Böyle bir birleşik soru kesinlikle yasaktır.
Aksi davranış, sistemin bozulmasına yol açar. Bu kurala katı şekilde uyulmalıdır.

3. Tüm bilgiler toplandıktan sonra:
   - Önce **musaitlik_kontrol** tool ile seçilen doktor ve tarih/saat için çakışma kontrolü yap.
   - Uygun değilse müşteriden farklı tarih/saat iste ve bu adımı tekrar et.

4. Onay öncesi özet paylaş:
📋 *Randevu Özeti*

👤 *Ad Soyad:* [Ad Soyad]
👩‍⚕️ *Doktor:* Dr. [Seçilen Doktor]
🗓️ *Tarih:* [dd/mm/yyyy] [GÜN_ADI] [HH:MM]

📌 Randevunuzu bu şekilde oluşturacağım. Onaylıyor musunuz?

- GÜN_ADI: Tarihin haftanın hangi gününe geldiğini Türkçe olarak yaz (Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar).
- Örnek çıktı formatı: "15/09/2025 Pazartesi 14:00"
- Gün adı mutlaka Türkçe ve ilk harfi büyük yazılmalı.

5. Onay alınca oluştur:
   - **randevu_olustur** tool'unu çağır. Gerekli parametreler:
     * clinicId: "135460d3-f612-457f-89e8-8ead3181c562"
     * patientName: Müşterinin ad soyadı
     * patientPhone: Müşterinin telefon numarası (aşağıdaki Müşteri Bilgileri bölümünden al)
     * doctorName: Seçilen doktorun adı ("Ayşe Pınar Vural" veya "Ece Yılmaz")
     * startTime: ISO 8601 formatında tarih/saat (UTC+3 varsayımıyla)
     * durationMin: 60

6. Son mesaj:
   - Randevunuz başarıyla oluşturuldu.
   - Randevu No: [Backend'den dönen referenceCode]
   - Bu kod ile randevularınızı sorgulayabilir, düzenleyebilir veya iptal edebilirsiniz.
   - Başka bir isteğiniz var mı?

### Randevu Güncelleme
Bu adımları yalnızca müşteri randevusunu güncellemek istediğinde uygula.
1. Müşteriden "randevu no" (referans kodu) bilgisini al.
2. KESİNLİKLE **randevu_sorgula** tool ile müşteri randevu bilgisine ulaş. Tool kullanmadan diğer işlemlere geçme.
   - Bulunamazsa:
     "Üzgünüm, bu randevu numarasına ait bir randevu bulunamadı."
     ve işlemi sonlandır.
   - Randevu daha önce iptal edildiyse (status: CANCELLED):
     "Bu randevu daha önce iptal edilmiş. İptal edilen randevuyu güncelleyemezsiniz."
     ve işlemi sonlandır.
3. Müşteri tarih/saat güncellemek istediğinde:
     - Eğer müşteri göreli ifadeler ("aynı gün", "o gün", "bu saat", "aynı saat", "3 olsun" vb.) kullanırsa, mutlaka referans olarak orijinal randevunun tarihini al ve yeni saat bilgisini bununla birleştirerek tam tarih/saat oluştur.
     - Eğer müşteri yeni bir gün belirtirse ("yarın", "pazartesi" vs.), bunu yeni tarih olarak değerlendir.
     - Geçmiş tarih/saat olup olmadığını bu şekilde oluşturulan tam tarih/saat üzerinden kontrol et.
     - Eğer müşteri bugünün tarihi için bir güncelleme istiyorsa (yani orijinal randevu bugüne aitse), işlemi reddet.
     - **musaitlik_kontrol** ile çakışma kontrolü yap. Uygun değilse yeni tarih/saat iste.
     - Güncelleme işleminde Doktor alanı değiştirilemez. Kullanıcı doktora dair değişiklik isterse, mevcut randevuyu iptal edip yeni randevu oluşturmalıdır.

4. Son onay için müşteri datasını güncellenmiş alanlar ile paylaş:
📋 *Randevu Özeti*

👤 *Ad Soyad:* [Müşteri Ad Soyad]
👩‍⚕️ *Doktor:* Dr. [Doktor Ad Soyad]
🗓️ *Tarih:* [dd/mm/yyyy] [GÜN_ADI] [HH:MM]
🔢 *Randevu No:* [No]

Randevunuz bu şekilde güncellenecektir, onaylıyor musunuz?

5. Onay alındıktan sonra **randevu_guncelle** tool ile güncelleme işlemini yap.
   Parametreler:
   - appointmentId: randevu_sorgula'dan dönen randevunun id değeri
   - startTime: Yeni ISO 8601 tarih/saat
   - durationMin: 60

6. Son mesaj:
   Randevunuz başarıyla güncellendi. Bizi tercih ettiğiniz için teşekkürler!

### Randevu İptal
Bu adımları yalnızca müşteri randevusunu iptal etmek istediğinde uygula.
1. Müşteriden randevu no al.
2. **randevu_sorgula** tool ile müşteri randevu bilgisine ulaş.
   - Randevu bulunmazsa: "Üzgünüm, bu randevu no'ya ait bir randevu bulunamadı." ve işlemi sonlandır.
   - Zaten iptal ise: "Bu randevu daha önce iptal edilmiş."
   - Bugünün tarihi ise reddet.
3. Son onay özetini paylaş:
📋 *Randevu Özeti*

👤 *Ad Soyad:* [Müşteri Ad Soyad]
👩‍⚕️ *Doktor:* Dr. [Doktor Ad Soyad]
🗓️ *Tarih:* [dd/mm/yyyy] [GÜN_ADI] [HH:MM]
🔢 *Randevu No:* [No]

Randevunuz iptal edilecektir. Onaylıyor musunuz?

4. Onay alındıktan sonra **randevu_guncelle** tool'unu cancel modunda çağır:
   - appointmentId: randevu_sorgula'dan dönen randevunun id değeri
   - action: "/cancel" (URL sonuna eklenecek yol)
5. Son mesaj:
   - Başarıyla iptal edildiyse: Randevunuz başarıyla iptal edildi.

---

## Tarih ve Saat Kuralları
- 24 saatlik sisteme çevir: "1" = "13:00", "3" = "15:00".
- Çalışma saatleri dışındaysa randevu verme (09:00 - 23:00 arası).
- Pazar günleri kapalıyız.

## Doktorlar
Dr. Ayşe Pınar Vural
Dr. Ece Yılmaz

## Çalışma Saatleri
- Feneryolu Psikiyatri Pazar günleri hariç 09:00 ile 23:00 saatleri arasında hizmet vermektedir.

## Tools (Araçlar)
- **randevu_sorgula**: Müşterinin randevularını referans kodu ile sorgular. Dönen veri: id, referenceCode, status, startTime, endTime, vs.
- **randevu_olustur**: Yeni randevu oluşturur.
- **randevu_guncelle**: Randevuyu günceller veya iptal eder. İptal ederken action parametresine "/cancel" koymalısın.
- **musaitlik_kontrol**: Belirtilen doktor ve tarih için müsaitlik durumunu döner.

## Yanıt Formatı
- Liste/seçenek verirken her maddeyi * ile başlat.
- Tüm özetlerde istenen formatı uygula.

## Müşteri Bilgileri
Telefon Numarası: {{ $node['Data Normalization'].json.messages[0].from }}
Bugünün Tarihi: {{ $now }}
"""

# Define individual nodes
memory_node = {
    "parameters": {
        "sessionIdType": "customKey",
        "sessionKey": "={{ $node['Data Normalization'].json.contacts[0].wa_id }}\n",
        "contextWindowLength": 50
    },
    "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
    "typeVersion": 1.3,
    "position": [208, 864],
    "id": "4e3deed2-f4ce-4bf9-9db7-3d96091f2898",
    "name": "Simple Memory"
}

gemini_node = {
    "parameters": {
        "options": {"temperature": 0.4}
    },
    "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
    "typeVersion": 1,
    "position": [48, 864],
    "id": "7b73824c-1b5b-43c5-be86-91f91f3ea4b7",
    "name": "Google Gemini Chat Model",
    "credentials": {
        "googlePalmApi": {"id": "du6DhOGanBik7R68", "name": "Google Gemini(PaLM) Api account"}
    }
}

ai_agent = {
    "parameters": {
        "promptType": "define",
        "text": "={{ $node['Data Normalization'].json.messages[0].text.body }}",
        "options": {
            "systemMessage": comprehensive_prompt
        }
    },
    "type": "@n8n/n8n-nodes-langchain.agent",
    "typeVersion": 2,
    "position": [624, 640],
    "id": "AI-Agent-Node",
    "name": "AI Agent"
}

data_normalization = {
    "parameters": {
        "mode": "manual",
        "assignments": {
            "assignments": [
                {
                    "id": "set-messages",
                    "name": "messages",
                    "value": "={{ $json.body.entry[0].changes[0].value.messages }}",
                    "type": "string" 
                },
                {
                    "id": "set-contacts",
                    "name": "contacts",
                    "value": "={{ $json.body.entry[0].changes[0].value.contacts }}",
                    "type": "string"
                }
            ]
        },
        "options": {}
    },
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.4,
    "position": [-720, 640],
    "id": "data-normalization-set",
    "name": "Data Normalization"
}


webhook_get = {
    "parameters": {
        "path": "whatsapp/webhook",
        "responseMode": "responseNode",
        "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2,
    "position": [-960, 480],
    "id": "webhook-get-handshake",
    "name": "Webhook (GET Handshake)"
}

webhook_post = {
    "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp/webhook",
        "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2,
    "position": [-960, 640],
    "id": "webhook-post-messages",
    "name": "Webhook (POST Messages)"
}

check_handshake = {
    "parameters": {
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 2
            },
            "conditions": [
                {
                    "id": "check-mode",
                    "leftValue": "={{ $json.query['hub.mode'] }}",
                    "rightValue": "subscribe",
                    "operator": {"type": "string", "operation": "equals"}
                }
            ],
            "combinator": "and"
        },
        "options": {}
    },
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [-720, 480],
    "id": "check-handshake",
    "name": "Check Handshake"
}

respond_challenge = {
    "parameters": {
        "respondWith": "text",
        "responseBody": "={{ $json.query['hub.challenge'] }}",
        "options": {}
    },
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1.1,
    "position": [-480, 440],
    "id": "respond-challenge",
    "name": "Respond Challenge"
}

send_message = {
    "parameters": {
        "operation": "send",
        "phoneNumberId": "1038350189365408",
        "recipientPhoneNumber": "={{ $node['Data Normalization'].json.messages[0].from }}",
        "textBody": "={{ $json.output }}",
        "additionalFields": {}
    },
    "type": "n8n-nodes-base.whatsApp",
    "typeVersion": 1,
    "position": [1088, 560],
    "id": "send-message-node",
    "name": "Send message",
    "credentials": {
        "whatsAppApi": {"id": "pAHu8UjOiUUJ4ORt", "name": "WhatsApp account"}
    }
}

# Tools
tools_urls = {
    "sorgula": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments/lookup",
    "olustur": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments",
    "guncelle": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments/{{ $fromAI('appointmentId', 'id', 'string') }}{{ $fromAI('action', 'cancel if canceling', 'string') }}",
    "musaitlik": "https://rebuff-husband-legibly.ngrok-free.dev/api/v1/whatsapp/appointments/availability"
}

sorgula_tool = {
    "parameters": {
        "method": "GET",
        "url": tools_urls["sorgula"],
        "sendQuery": True,
        "queryParameters": {
            "parameters": [
                {"name": "clinicId", "value": "135460d3-f612-457f-89e8-8ead3181c562"},
                {"name": "referenceCode", "value": "={{ $fromAI('referenceCode', 'Code', 'string') }}"}
            ]
        },
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [{"name": "x-n8n-secret", "value": "klinikapp-n8n-secret-2024"}]
        },
        "options": {}
    },
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [384, 864],
    "id": "randevu-sorgula-tool",
    "name": "randevu_sorgula"
}

olustur_tool = {
    "parameters": {
        "method": "POST",
        "url": tools_urls["olustur"],
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "x-n8n-secret", "value": "klinikapp-n8n-secret-2024"},
                {"name": "Content-Type", "value": "application/json"}
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "clinicId", "value": "135460d3-f612-457f-89e8-8ead3181c562"},
                {"name": "patientName", "value": "={{ $fromAI('patientName', 'Name', 'string') }}"},
                {"name": "patientPhone", "value": "={{ $fromAI('patientPhone', 'Phone', 'string') }}"},
                {"name": "doctorName", "value": "={{ $fromAI('doctorName', 'Doctor', 'string') }}"},
                {"name": "startTime", "value": "={{ $fromAI('startTime', 'ISO', 'string') }}"},
                {"name": "durationMin", "value": "60"}
            ]
        },
        "options": {}
    },
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [592, 864],
    "id": "randevu-olustur-tool",
    "name": "randevu_olustur"
}

guncelle_tool = {
    "parameters": {
        "method": "PATCH",
        "url": tools_urls["guncelle"],
        "sendQuery": True,
        "queryParameters": {
            "parameters": [{"name": "clinicId", "value": "135460d3-f612-457f-89e8-8ead3181c562"}]
        },
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "x-n8n-secret", "value": "klinikapp-n8n-secret-2024"},
                {"name": "Content-Type", "value": "application/json"}
            ]
        },
        "sendBody": True,
        "bodyParameters": {
            "parameters": [
                {"name": "startTime", "value": "={{ $fromAI('startTime', 'ISO', 'string') }}"},
                {"name": "durationMin", "value": "60"}
            ]
        },
        "options": {}
    },
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [768, 864],
    "id": "randevu-guncelle-tool",
    "name": "randevu_guncelle"
}

musaitlik_tool = {
    "parameters": {
        "method": "GET",
        "url": tools_urls["musaitlik"],
        "sendQuery": True,
        "queryParameters": {
            "parameters": [
                {"name": "clinicId", "value": "135460d3-f612-457f-89e8-8ead3181c562"},
                {"name": "doctorName", "value": "={{ $fromAI('doctorName', 'Doctor', 'string') }}"},
                {"name": "date", "value": "={{ $fromAI('date', 'YYYY-MM-DD', 'string') }}"}
            ]
        },
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [{"name": "x-n8n-secret", "value": "klinikapp-n8n-secret-2024"}]
        },
        "options": {}
    },
    "type": "@n8n/n8n-nodes-langchain.toolHttpRequest",
    "typeVersion": 1.1,
    "position": [928, 864],
    "id": "availability-tool",
    "name": "musaitlik_kontrol"
}

nodes = [
    memory_node, gemini_node, ai_agent, 
    webhook_get, webhook_post, 
    check_handshake, respond_challenge, 
    data_normalization, send_message,
    sorgula_tool, olustur_tool, guncelle_tool, musaitlik_tool
]

connections = {
    "Simple Memory": {"ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]},
    "Google Gemini Chat Model": {"ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]},
    "randevu_sorgula": {"ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]},
    "randevu_olustur": {"ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]},
    "randevu_guncelle": {"ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]},
    "musaitlik_kontrol": {"ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]},
    "AI Agent": {"main": [[{"node": "Send message", "type": "main", "index": 0}]]},
    "webhook-get-handshake": {"main": [[{"node": "Check Handshake", "type": "main", "index": 0}]]},
    "Check Handshake": {"main": [[{"node": "Respond Challenge", "type": "main", "index": 0}]]},
    "webhook-post-messages": {"main": [[{"node": "Data Normalization", "type": "main", "index": 0}]]},
    "Data Normalization": {"main": [[{"node": "AI Agent", "type": "main", "index": 0}]]}
}

workflow = {
    "name": "KlinikApp WhatsApp Bot v7 (Detailed Prompt)",
    "nodes": nodes,
    "connections": connections,
    "active": False,
    "settings": {"executionOrder": "v1"},
    "versionId": "v7",
    "meta": {"templateCredsSetupCompleted": True}
}

path = r'c:\Users\Lenovo\.gemini\antigravity\scratch\klinikapp\n8n-workflow-v2.json'
with open(path, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=4, ensure_ascii=False)
print("File written successfully")
