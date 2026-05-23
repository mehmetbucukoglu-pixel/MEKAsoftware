# 📧 Mail Taslağı & Şirket Kurma Analizi

---

## 1. Hocaya Mail Taslağı

Aşağıdaki maili kendi bilgilerine göre düzenleyip gönderebilirsin:

---

**Kime:** [Hocanın e-posta adresi]
**Konu:** Sağlık Yazılımı Projesi — Bilişim Hukuku Danışmanlık Talebi

---

Sayın [Hocanın Adı] Hocam,

Merhaba, ben [Adın Soyadın] — [Üniversite Adı] [Bölüm Adı] bölümünden bu dönem mezun oldum. Bilişim Teknolojileri ve Hukuk dersini sizinle aldım.

Size bir konuda danışmanlık/yönlendirme rica etmek istiyorum. Kısa tutmaya çalışacağım:

**Proje:** Psikiyatri ve psikoloji klinikleri için bir klinik yönetim yazılımı (KlinikApp) geliştiriyorum. Hasta kayıt, randevu, seans takibi ve WhatsApp AI asistanı gibi modülleri var.

**Entegrasyon:** Yazılımı e-Nabız (Sağlık Bakanlığı) sistemine entegre etmem gerekiyor. Ancak KTS (Kayıt Tescil Sistemi) onayım olmadığı için, Bakanlık onaylı bir yazılım firması (Veta Yazılım — 56 onaylı firmadan biri) ile ortaklık kurarak, onların API'ı üzerinden e-Nabız bildirimlerini yapmayı planlıyorum.

**Hukuki belirsizliklerim:**

1. KTS onaylı bir firmanın API'ını kullanarak e-Nabız'a hasta verisi göndermek yasal olarak mümkün mü? Bakanlık buna nasıl bakıyor?

2. KVKK kapsamında bu modelde veri sorumlusu ve veri işleyen rolleri nasıl dağılır? (Ben hasta verisini topluyorum, Veta Bakanlık'a iletiyor)

3. Ruh sağlığı verileri (psikiyatri tanısı gibi F kodları) özel nitelikli kişisel veri — bunların üçüncü taraf API ile transferinde açık rıza yeterli mi, yoksa ek yükümlülükler var mı?

4. Veta ile aramızda nasıl bir sözleşme yapılmalı? Standart veri işleyen sözleşmesi yeterli mi?

5. Henüz şirketim kurulu değil — bu aşamada şahıs olarak böyle bir sözleşme imzalanabilir mi?

Derste öğrendiğimiz KVKK, kişisel verilerin korunması ve bilişim suçları konularının tam da bu projeye denk geldiğini fark ettim. Eğer uygun görürseniz kısa bir online görüşme veya mail üzerinden yönlendirmenizi çok değerli bulurdum.

Zamanınız için şimdiden teşekkür ederim.

Saygılarımla,
[Adın Soyadın]
[Telefon Numaran]
[LinkedIn veya Portfolio linkin — varsa]

---

## 2. Şirket Kurma: Hemen Gerekli mi?

### Kısa cevap: **Şu an değil, ama Veta ile sözleşme imzalarken gerekecek.**

Startup danışmanının söylediği doğru — ama bir nüans var:

| Aşama | Şirket Gerekli mi? | Neden |
|-------|-------|-------|
| **Geliştirme** (şu an) | ❌ Hayır | Kod yazıyorsun, kimseye satmıyorsun |
| **Veta ile teknik test** | ❌ Hayır | Sandbox'ta deneme, para akışı yok |
| **Veta ile sözleşme** | ⚠️ **Muhtemelen evet** | Veta tüzel kişilikle çalışmak isteyecek |
| **Kliniklere satış** | ✅ **Kesinlikle evet** | Fatura kesmek zorunlu |
| **KVKK Veri Sorumlusu** | 🟡 Şart değil ama önerilir | Gerçek kişi de olabilir ama tüzel daha güvenli |

### Detaylı Durum:

**KVKK açısından:**
- Veri sorumlusu olmak için şirket **şart değil** — gerçek kişi (yani sen) de olabilirsin
- AMA: Sağlık verisi işliyorsan VERBİS kaydı gerekebilir
- Bir ihlalde kişisel malvarlığın risk altında olur (şirket olunca sınırlı sorumluluk)

**Vergi açısından:**
- Yazılım satışı = ticari faaliyet = vergi mükellefiyeti gerekli
- En basiti: **Şahıs şirketi** (1 günde açılır, maliyeti düşük)

**Veta açısından:**
- Profesyonel bir firma seninle bireysel çalışmak istemeyebilir
- "Karşımda bir tüzel kişilik olsun" diyebilir — bu çok normal

### Önerim: Aşamalı Yaklaşım

```
ŞİMDİ (Mayıs-Haziran):
  → Veta ile teknik detayları konuş
  → Hukuk hocasından yönlendirme al
  → Geliştirmeye devam et
  → Şirket kurmana GEREK YOK

SÖZLEŞME AŞAMASI (Temmuz civarı):
  → Şahıs şirketi aç (1 gün, ~2-3K TL masraf)
  → Veta ile sözleşme imzala
  → VERBİS kaydı yap

SATIŞ AŞAMASI:
  → Fatura kes
  → Gerekirse Limited Şirket'e geç (daha profesyonel, sınırlı sorumluluk)
```

> **Hocaya sorulacak ek soru (şirket ile ilgili):** "Bu iş modeli için hangi aşamada şirket kurmam gerekir? Şahıs şirketi yeterli mi yoksa Limited Şirket mi olmalı?"

Bu soru Master Plan'ın BÖLÜM 11'ine 7. soru olarak zaten eklendi.
