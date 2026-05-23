# 🎯 MASTER PLAN: KlinikApp × Veta Yazılım — E-Nabız Entegrasyonu

> **Bu doküman Veta toplantısına hazırlık için tek kaynak. Her şey burada.**
> Son güncelleme: 16 Mayıs 2026 (v3 — Sunum Hazır)
>
> **Hedef Sektör:** Psikiyatri, Psikoloji ve Psikoterapi Klinikleri

---

## BÖLÜM 1: KİM KİMDİR?

| | KlinikApp (Sen) | Veta Yazılım (Partner) | Sağlık Bakanlığı |
|---|---|---|---|
| **Rol** | Ruh sağlığı klinik yönetim yazılımı | KTS onaylı HBYS firması (56 firmadan biri) | Düzenleyici otorite |
| **DB** | PostgreSQL (senin sunucun) | PostgreSQL (onların sunucusu) | SağlıkNET / e-Nabız |
| **Ne saklar** | Hasta, Randevu, Vizit, `vetaVisitId` | SYS Takip No, SKRS verileri, Bakanlık referansları | Tüm ulusal sağlık kayıtları |
| **KVKK Rolü** | Veri Sorumlusu | Veri İşleyen | Veri Sorumlusu (kendi sisteminde) |
| **KTS Onayı** | ❌ Yok (almayacağız) | ✅ Var | — |

**Neden ortak çalışıyoruz:** KTS onayı almak yıllar sürer. Veta'nın onayını kullanarak hızla satışa çıkmak istiyoruz. Veta için de her yeni klinik = yeni gelir.

> [!IMPORTANT]
> **Neden Psikiyatri/Psikoloji?** Bu alan dijitalleşmede geride kalmış, WhatsApp ile randevu alan klinikler çoğunlukta. Seans takibi, terapi süreci yönetimi ve hassas veri güvenliği için özel çözüm ihtiyacı çok yüksek. Ayrıca ruh sağlığı verileri KVKK'da **en hassas kategori** — bunu doğru yönetmek büyük rekabet avantajı.

---

## BÖLÜM 2: VERİ PAKETLERİ — SADECE 4 PAKET

| Kod | Paket | Bir Cümleyle | Ne Zaman |
|-----|-------|-------------|----------|
| **101** | Hasta Kayıt | "Bu hasta geldi" | Hasta kliniğe geldiğinde |
| **103** | Muayene | "Şu tanıyı koyduk" | Muayene bittiğinde |
| **102** | Hizmet | "Şu işlemi yaptık" | İşlem/seans yapıldığında |
| **106** | Çıkış | "Hasta gitti" | Hasta çıkışında |

Bu kadar. Reçete (107), fatura (104), lab (105), ameliyat (108) **şimdilik kapsam dışı**.

---

## BÖLÜM 3: VERİ AKIŞI — ÇOK BASİT

Tüm akış 4 adım. İki taraf da minimum iş yapıyor:

```
  KlinikApp                        Veta API                     Bakanlık
  ─────────                        ────────                     ────────
      │                                │                            │
  1.  │── hasta bilgisi + SKRS ───────>│                            │
      │                                │── 101 paketi ─────────────>│
      │                                │<── SYS Takip No ───────────│
      │<── visitId + "tamam" ──────────│                            │
      │                                │                            │
  2.  │── visitId + tanı kodu ────────>│                            │
      │                                │── 103 paketi ─────────────>│
      │<── "tamam" ────────────────────│                            │
      │                                │                            │
  3.  │── visitId + işlem kodu ───────>│                            │
      │                                │── 102 paketi ─────────────>│
      │<── "tamam" ────────────────────│                            │
      │                                │                            │
  4.  │── visitId + çıkış kodu ───────>│                            │
      │                                │── 106 paketi ─────────────>│
      │<── "tamam" ────────────────────│                            │
```

**Bu kadar.** KlinikApp doğru veriyi gönderiyor, Veta Bakanlık'a iletiyor.

---

## BÖLÜM 3.5: visitId — TEKNİK OPSİYONLAR (Sunuma Hazır)

SYS Takip No'yu bizim DB'mizde saklamamamız lazım. Bunun yerine Veta'nın bize döneceği bir **referans ID** kullanacağız. İşte 3 opsiyon:

### Opsiyon A: Veta Kendi ID'sini Üretir ✅ (Önerilen)

```
KlinikApp → Veta: "TC 12345678901, Ad: Ali Yılmaz, Branş: 1700"
Veta → Bakanlık: 101 paketi → SYS Takip No alır
Veta → KlinikApp: { visitId: "VT-2026-00847", status: "ok" }
```

- Veta kendi sisteminde `VT-2026-00847 = SYS-XXXXX` eşleştirmesini tutar
- KlinikApp sadece `VT-2026-00847`'yi saklar
- **Artısı:** En basit. Veta'nın mevcut sistemine en uygun. Bakanlık verisi bize hiç gelmiyor
- **Veta'nın işi:** Kendi ID üret, SYS eşleştirmesini tut
- **Bizim işimiz:** visitId'yi kaydet, sonraki isteklerde gönder

### Opsiyon B: Biz ID Üretir, Veta Kabul Eder

```
KlinikApp → Veta: { clientVisitId: "KA-a3f7b2c1", TC: ..., Ad: ... }
Veta → KlinikApp: { clientVisitId: "KA-a3f7b2c1", status: "ok" }
```

- KlinikApp UUID üretir, Veta bunu kabul eder ve kendi SYS eşleştirmesinde kullanır
- **Artısı:** Bizim tarafta veri tutarlılığı daha kolay (ID'yi biz kontrol ediyoruz)
- **Eksisi:** Veta'nın kendi ID sistemiyle çakışma olabilir

### Opsiyon C: TC + Tarih Kombinasyonu (ID'siz)

```
KlinikApp → Veta: { TC: "12345678901", visitDate: "2026-05-16" }
Veta kendi tarafında TC+Tarih ile SYS eşleştirmesi yapar
```

- **Artısı:** Ekstra ID'ye gerek yok
- **Eksisi:** Aynı gün 2 ziyaret olursa çakışır. Saat eklemek gerekir. Kırılgan.

> [!TIP]
> **Sunumda Veta'ya sor:** "Sizin tercihiniz hangisi? Siz bize kendi referans ID'nizi döndürün, biz onu saklayalım — en temiz çözüm bu. Veya biz UUID üretelim, siz kabul edin. Hangisi sizin sisteminize daha uygun?"

---

## BÖLÜM 4: İKİ TARAFIN YAPACAKLARI

### KlinikApp (Biz) Ne Yapacak?

| # | İş | Detay |
|---|-----|-------|
| 1 | SKRS kodlarını gönder | ICD-10 (F kodları) ve SUT kodlarını API'a bas |
| 2 | visitId sakla | Veta'nın döndüğü referansı DB'de tut |
| 3 | Doğru sırada gönder | Önce 101, sonra 103/102, en son 106 |
| 4 | Hata yönet | API hata dönerse kullanıcıya göster |
| 5 | Güvenlik | HTTPS, API key/token, HMAC imza |

### Veta Ne Yapacak?

| # | İş | Detay |
|---|-----|-------|
| 1 | API endpoint'leri sun | REST/SOAP endpoint — biz çağıralım |
| 2 | Bakanlık'a ilet | 101/102/103/106 paketlerini SağlıkNET'e gönder |
| 3 | SYS Takip No yönet | Bakanlık referansını kendi DB'sinde tut |
| 4 | visitId döndür | Bize kendi referans ID'sini ver |
| 5 | Hata bildir | Bakanlık reddi olursa bize bildir |

### Kimse Ne Yapmayacak?

| ❌ | Açıklama |
|----|----------|
| KlinikApp SYS Takip No **saklamayacak** | Bakanlık verisi bizde kalmıyor |
| KlinikApp Bakanlık'a **doğrudan bağlanmayacak** | Her şey Veta üzerinden |
| Seans notları e-Nabız'a **gitmeyecek** | Sadece tanı kodu (F32.1) ve işlem kodu (702.700) |
| Veta hasta takibi **yapmayacak** | Onlar sadece veriyi iletir |

---

## BÖLÜM 5: SKRS KODLARI — PSİKİYATRİ/PSİKOLOJİ ÖZEL

### A) ICD-10 Tanı Kodları — F Kodları (103 Muayene paketi için)

Ruh sağlığı tanıları **F00-F99** aralığında:

| Kod | Tanı | Sıklık |
|-----|------|--------|
| **F32.0** | Hafif depresif epizod | ⭐ Çok sık |
| **F32.1** | Orta depresif epizod | ⭐ Çok sık |
| **F33.0** | Tekrarlayan depresif bozukluk | ⭐ Çok sık |
| **F41.0** | Panik bozukluk | ⭐ Sık |
| **F41.1** | Yaygın anksiyete bozukluğu | ⭐ Çok sık |
| **F43.1** | Travma sonrası stres bozukluğu (TSSB) | Sık |
| **F40.1** | Sosyal fobi | Sık |
| **F42** | Obsesif-kompulsif bozukluk (OKB) | Sık |
| **F31** | Bipolar affektif bozukluk | Orta |
| **F20** | Şizofreni | Düşük (poliklinikte) |
| **F50.0** | Anoreksiya nervoza | Orta |
| **F90.0** | Dikkat eksikliği (DEHB) | Çocuk/ergen |
| **F10-F19** | Madde kullanım bozuklukları | Özel klinik |

### B) SUT İşlem Kodları (102 Hizmet paketi için)

| Kod | İşlem | Kurallar |
|-----|-------|----------|
| **520.033** | Psikiyatri muayenesi | İlk 10 hasta farklı puanlanır |
| **702.700** | Bireysel psikoterapi | Min 30 dk, 10 günde 1 seans |
| **702.730** | Grup psikoterapisi | Kişi başına, seans başına |
| **702.720** | Gelişim testleri | Her bir test için |
| **702.740** | Kişilik testleri | Her bir test için |
| **702.710** | Elektrokonvülsiv tedavi (EKT) | Psikiyatri kliniğinde |
| **702.712** | TMS (Transkraniyal manyetik stimülasyon) | Uzman doktor |

> [!NOTE]
> **Terapi seansı kuralı:** SUT'a göre bireysel psikoterapi (702.700) **10 günde 1 seans** faturalandırılabilir. Madde bağımlılığı (F10-F19) tanılarında 10 günde 3'e çıkar.

### C) ATC İlaç Kodları (Psikiyatri reçeteleri)

| Kod | İlaç | Kullanım |
|-----|------|----------|
| N06AB06 | Sertralin | Antidepresan (SSRI) |
| N06AB04 | Sitalopram | Antidepresan (SSRI) |
| N06AB10 | Essitalopram | Antidepresan (SSRI) |
| N05AH03 | Olanzapin | Antipsikotik |
| N05BA06 | Lorazepam | Anksiyolitik |
| N05CF01 | Zopiklon | Uyku ilacı |
| N03AX16 | Pregabalin | Anksiyete / nöropatik ağrı |

### D) Diğer SKRS Kodları

| Tür | Örnek |
|-----|-------|
| Branş | **1700** = Ruh Sağlığı ve Hastalıkları (Psikiyatri) |
| Cinsiyet | 1 = Erkek, 2 = Kadın |
| Çıkış Durumu | 1 = Şifa, 3 = Tedavi devam, 6 = Sevk |

---

## BÖLÜM 5.5: ⚠️ RUH SAĞLIĞI VERİSİ — EKSTRA HASSAS!

> [!CAUTION]
> **Ruh sağlığı verileri, sağlık verileri içinde bile EN HASSAS kategoridir.** Bir kişinin psikiyatri tanısının sızması → iş kaybı, sosyal dışlanma, sigorta reddi. Bu yüzden güvenlik standartların diğer kliniklerden DAHA YÜKSEK olmalı.

### Psikiyatri/Psikoloji'ye Özel Dikkat Edilecekler:

| Konu | Detay |
|------|-------|
| **e-Nabız Gizlilik** | Hastalar e-Nabız'da "kayıtlarım görünmesin" diyebilir. Doktor SMS ile onay kodu alır |
| **Seans Notları** | Terapist notları e-Nabız'a GİTMEMELİ — sadece tanı kodu ve işlem kodu gider |
| **Açık Rıza** | Ruh sağlığı verisi için KVKK açık rıza formu ayrıca alınmalı |
| **Erişim Kısıtlaması** | Asistan bile tüm seans notlarını görmemeli — sadece doktor |
| **Log İzleme** | Kim hangi hasta dosyasına baktı — mutlaka loglanmalı |
| **Aile İle Paylaşım** | Hasta izni olmadan aileye BİLGİ VERİLEMEZ (intihar riski hariç) |

---

## BÖLÜM 6: GÜVENLİK — VETA'YI NASIL İKNA EDERSİN?

### Zaten Var Olan Güvenlik (KlinikApp'te)

| ✅ Önlem | Detay |
|----------|-------|
| AES-256-GCM şifreleme | TC Kimlik ve mesajlar DB'de şifreli |
| PBKDF2 (100K iterasyon) | Brute-force'a dayanıklı anahtar türetme |
| SHA-256 hashing | TC aramaları için geri dönüşsüz hash |
| JWT Authentication | Tüm endpoint'ler korunuyor |
| Role-Based Access | DOCTOR / ASSISTANT / ADMIN rolleri |
| Multi-tenant izolasyon | Her sorgu clinicId filtreli |

### Veta İçin Eklenecek Güvenlik

| 🔧 Önlem | Ne İşe Yarar |
|----------|-------------|
| **mTLS** | İki taraflı sertifika — başka biri API key çalsa bile bağlanamaz |
| **HMAC-SHA256 imzalama** | Her isteğin bozulmadığı ve senden geldiği kanıtlanır |
| **Audit Trail** | Kim, ne zaman, hangi veriye erişti — denetim logu |
| **IP Whitelist** | Sadece KlinikApp sunucusu Veta'ya bağlanabilir |
| **KVKK Sözleşmesi** | Veri İşleyen Sözleşmesi — roller, sorumluluklar, ihlal bildirimi |

### Veta'ya Söyleyeceğin Cümleler

✅ *"SYS Takip No ve Bakanlık verisini kendi DB'mizde saklamayacağız."*
✅ *"TC Kimlik DB'mizde AES-256-GCM ile şifreli. Transfer mTLS tünelinde."*
✅ *"KVKK Veri İşleyen Sözleşmesi imzalayacağız. İhlalde 72 saat bildirim."*
✅ *"Bakanlık denetiminde loglarımız eşleşecek — biz de audit trail tutuyoruz."*

---

## BÖLÜM 7: VETA'YA SORULACAK TÜM SORULAR

### 🔴 Kritik (İlk Toplantıda Netleşmeli)

| # | Soru |
|---|------|
| 1 | API formatınız REST mi, SOAP mı? |
| 2 | **visitId: Siz bize kendi referans ID'nizi döndürür müsünüz, yoksa biz mi üretelim?** |
| 3 | Authentication: API Key mi, OAuth2 mi? |
| 4 | Sandbox/test ortamınız var mı? |
| 5 | SKRS kodlarını biz mi göndereceğiz, siz metin dönüştürüyor musunuz? |
| 6 | 101, 102, 103, 106 için ayrı ayrı endpoint mi var? |

### 🟡 Önemli

| # | Soru |
|---|------|
| 8 | Bakanlık red durumunda webhook/callback mekanizmanız var mı? |
| 9 | Aynı gün 2. ziyarette yeni 101 mi gerekiyor? |
| 10 | API yanıt süresi garantiniz (SLA) var mı? |
| 11 | Rate limit var mı? |
| 12 | Gelir modeli: İşlem başı mı, aylık sabit mi? |

### 🟢 Bonus

| # | Soru |
|---|------|
| 13 | Batch (toplu) gönderim var mı? |
| 14 | Benzer bir 3. parti entegrasyonunuz oldu mu daha önce? |

---

## BÖLÜM 8: VETA'NIN OLASİ SORULARI & HAZIR CEVABIN

| Veta Sorusu | Senin Cevabın |
|-------------|---------------|
| "Uygulamanız hangi dilde?" | "Backend: NestJS (TypeScript), Frontend: Next.js, DB: PostgreSQL" |
| "KTS onayınız var mı?" | "Hayır, o yüzden sizinle çalışmak istiyoruz. Onayınızı birlikte kullanacağız." |
| "Veriyi nasıl saklıyorsunuz?" | "TC Kimlik AES-256-GCM ile şifreli, PBKDF2 ile anahtar türetme, SHA-256 hash. KVKK uyumlu." |
| "SYS Takip No'yu saklayacak mısınız?" | "Hayır. Sizin döneceğiniz referans ID'yi saklayacağız, Bakanlık verisi bizde kalmayacak." |
| "Hasta sayınız kaç?" | "Psikiyatri/psikoloji klinikleriyle pilotla başlıyoruz. Her klinik sizin için de yeni gelir." |
| "Şirketiniz var mı?" | "Pilot aşamasındayız, ilk müşterilerle sonuç alınca şirketleşeceğiz. Teknik entegrasyonu şimdiden hazırlayalım." |
| "KVKK sorumluluğu kimde?" | "Biz Veri Sorumlusu, siz Veri İşleyen. Sözleşme imzalayacağız." |
| "Neden psikiyatri?" | "Dijitalleşmede geride, WhatsApp ile randevu alıyorlar. Pazar büyük ve boş." |
| "Ruh sağlığı verisi hassas" | "Seans notları e-Nabız'a gitmeyecek. Sadece tanı + işlem kodu. Ekstra önlem alıyoruz." |
| "Neden kendiniz yapmıyorsunuz?" | "KTS onayı yıllar sürer. Sizin uzmanlığınızı kullanmak istiyoruz." |
| "Sizin için ne kadar iş?" | "Minimal — biz SKRS kodlarını hazır gönderiyoruz, siz Bakanlık'a iletiyorsunuz. Mevcut altyapınıza 1 API katmanı." |

---

## BÖLÜM 9: KLİNİKAPP'E EKLENECEK MODÜLLER

```
backend/src/modules/enabiz/
├── enabiz.module.ts          # Ana modül
├── enabiz.service.ts         # Veta API iletişimi
├── enabiz.controller.ts      # Veta webhook endpoint
├── guards/veta-webhook.guard.ts
├── interceptors/audit-log.interceptor.ts
├── dto/
│   ├── hasta-kayit.dto.ts    # 101
│   ├── hizmet.dto.ts         # 102
│   ├── muayene.dto.ts        # 103
│   └── cikis.dto.ts          # 106
└── utils/
    ├── hmac.util.ts
    └── mtls.config.ts
```

**DB'ye eklenecek tablolar:** Visit (Ziyaret), EnabizLog (Audit), SkrsCode (ICD-10/SUT cache)

**Tahmini süre:** 2-3 hafta (Veta API hazır olduktan sonra)

---

## BÖLÜM 10: ÖNCELİK SIRASI

| Adım | Ne Yapılacak | Şirket Lazım mı? | Ne Zaman |
|------|-------------|-------------------|----------|
| 1 | Hocaya mail at (hukuki yönlendirme) | ❌ | Bu hafta |
| 2 | Veta ile ilk toplantı — teknik detaylar | ❌ | Bu hafta |
| 3 | visitId modeli + API formatı netleşsin | ❌ | Toplantı sonrası |
| 4 | KlinikApp'e F kodları / SUT seçici ekle | ❌ | 1 hafta |
| 5 | Visit tablosu + Enabiz modülü geliştir | ❌ | 2 hafta |
| 6 | Veta sandbox'ta test | ❌ | 1 hafta |
| 7 | **2-3 pilot klinik bul, ücretsiz dene** | ❌ | 2-4 hafta |
| 8 | Pilot sonuçları iyi → **Şahıs şirketi aç** | ✅ | Sonuç alınca |
| 9 | Veta ile resmi sözleşme + KVKK sözleşmesi | ✅ | Şirket sonrası |
| 10 | Ücretli müşteri al, fatura kes | ✅ | Satış başlangıcı |

---

## BÖLÜM 12: ŞİRKETSİZ PİLOT — STRATEJİ

### Ne Yapabilirsin Şirketsiz?

| ✅ Yapabilirsin | ❌ Yapamazsın |
|-----------------|---------------|
| Yazılım geliştirmek | Fatura kesmek |
| Veta ile teknik görüşme yapmak | Resmi ticari sözleşme imzalamak |
| Pilot kliniklerle ücretsiz test yapmak | Para tahsil etmek |
| Ürünü sahada denemek | VERBİS'e kayıt olmak |
| Hukuk danışmanlığı almak | |

### Pilot Aşama Planı (Şirketsiz)

```
1. Veta ile TEKNIK GÖRÜŞME yap (sözleşme değil, sadece "bunu yapabilir miyiz?")
   → API detaylarını öğren, sandbox iste

2. KlinikApp'i geliştir (F kodları, visitId, Veta API entegrasyonu)
   → Kendi bilgisayarında, kimseye satmadan

3. 2-3 tanıdık psikolog/psikiyatrist bul
   → "Ücretsiz dene, geri bildirim ver" de
   → Para alma, sözleşme imzalama
   → Sadece yazılımı kullansınlar, e-Nabız entegrasyonunu sandbox'ta test et

4. Sonuçlar iyi mi?
   → Klinikler memnun mu?
   → Teknik sorun çıktı mı?
   → Veta entegrasyonu çalışıyor mu?

5. EVET → Şahıs şirketi aç (1 gün, ~3K TL)
   → Veta ile resmi sözleşme
   → Pilotları ücretli müşteriye çevir
   → Yeni müşteri al
```

### Veta'ya Ne Söylersin?

Veta "şirketin var mı?" diye sorarsa:

> *"Pilot aşamasındayız. İlk 2-3 klinikle ürünü sahada test ediyoruz. Sonuçlar pozitif gelince şirketleşeceğiz — bu noktada sizinle resmi sözleşme imzalarız. Şu an teknik entegrasyonu hazırlayalım, sandbox'ta test edelim. Sizin için sıfır risk — henüz canlıya geçmiyoruz."*

Bu cümle Veta'yı rahatlatır çünkü:
- Canlı hasta verisi yok (sandbox)
- Para akışı yok (ücretsiz pilot)
- Risk yok (test aşaması)
- Sen ciddi görünüyorsun (ürünü sahada deniyorsun)

> [!NOTE]
> **Gerçek:** KVKK'da veri sorumlusu olmak için şirket şart değil — gerçek kişi de olabilirsin. AMA Veta gibi profesyonel bir firma, sözleşme aşamasında tüzel kişilik isteyecektir. Bu yüzden pilot → sonuç → şirket sırası en mantıklı yol.

---

## BÖLÜM 11: HUKUKİ DANIŞMANLIK — SORULACAK SORULAR

Bilişim hukuku hocasına sorman gerekenler:

| # | Soru | Neden Önemli |
|---|------|-------------|
| 1 | KTS onaylı bir firmanın API'ını kullanarak e-Nabız'a veri göndermek yasal mı? | İş modelinin temeli |
| 2 | Veri Sorumlusu / Veri İşleyen rolleri bu senaryoda nasıl dağılır? | KVKK sözleşmesinin temeli |
| 3 | Ruh sağlığı verisi (psikiyatri tanısı) üçüncü taraf API ile transfer edilirken açık rıza yeterli mi? | Ekstra hassas veri |
| 4 | Seans notları e-Nabız'a gitmezse bile, tanı kodu (ör: F32.1 = depresyon) gitmeli mi? | Bakanlık zorunluluğu vs hasta mahremiyeti |
| 5 | Veta ile aramızdaki sözleşmede neler olmalı? Standart veri işleyen sözleşmesi yeterli mi? | Hukuki koruma |
| 6 | Bir veri ihlali olursa sorumluluk zinciri nasıl işler? | Risk yönetimi |
| 7 | Bu iş modeli için şirket kurma / ticari lisans gereksinimleri var mı? | Ticari boyut |
