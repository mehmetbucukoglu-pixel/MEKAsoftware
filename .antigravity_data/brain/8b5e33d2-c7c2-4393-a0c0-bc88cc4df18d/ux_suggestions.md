# Dashboard UX Önerileri

## 1. Yeni KPI Kartları

Mevcut kartlar: **Bugünkü Randevular**, **Toplam Hasta**, **Aylık Net Gelir**, **Gelmeme Oranı**, **Ort. Seans Süresi**

### Önerilen Eklemeler

| KPI | Değer Örneği | Neden? |
|-----|-------------|--------|
| **Bugünkü Gelir** | `₺4.250` | Günlük performansı anlık gösterir |
| **Bekleyen Ödeme** | `₺12.800` | Tahsilat takibi için kritik |
| **Bu Hafta Yeni Hasta** | `3` | Büyüme trendini gösterir |
| **Doluluk Oranı** | `%72` | Randevu kapasitesi kullanımı |
| **Okunmamış Mesaj** | `5` | Cevap bekleyen hastalar  |

> [!TIP]
> En fazla **4 KPI** gösterilmesi önerilir. Fazlası dikkat dağıtır.

---

## 2. Kısayol Tuşları

Sade ve hatırlanabilir, modifier + tek tuş formatında:

| Kısayol | Aksiyon | Açıklama |
|---------|---------|----------|
| `Ctrl+K` | Hızlı Arama | ✅ Zaten mevcut |
| `Ctrl+N` | Yeni Hasta | En sık yapılan işlem |
| `Ctrl+R` | Yeni Randevu | İkinci en sık işlem |
| `Ctrl+T` | Yeni Tahsilat | Finans kısayolu |
| `Ctrl+/` | Kısayolları Göster | Yardım paneli (modal) |

> [!IMPORTANT]
> `Ctrl+/` ile açılan basit bir **kısayol cheat sheet** modalı, diğer tüm kısayolları keşfedilebilir yapar. Böylece kullanıcı sadece bunu ezberler, gerisini modal'dan görür.

---

## 3. Öğretici Pop-up'lar (Onboarding Tooltips)

Hedef: İlk giriş deneyimini iyileştirmek, **max 4-5 adım**. Spotlight tarzı, background dim ile hedef elementi vurgulayan basit tooltip'ler.

### Akış

```
Adım 1 → Sidebar'ı tanıt
"Buradan tüm modüllere erişebilirsiniz"

Adım 2 → Hızlı Arama
"Ctrl+K ile istediğiniz hastayı veya sayfayı anında bulun"

Adım 3 → KPI Kartları
"Bu kartları özelleştirebilirsiniz — Düzenle butonuna tıklayın"

Adım 4 → Workspace
"Ekibinizle notlar ve görevler oluşturmak için Workspace'i kullanın"
```

### Tasarım Kuralları

- **Bir kere göster**, localStorage ile `onboarding_completed` flag'i tut
- **"Atla" butonu** her zaman görünür olsun
- **İlerleme göstergesi**: `2/4` gibi basit sayaç
- Animasyonu hafif tut (300ms fade, overlay dim)
- Mobilde gösterme (sadece desktop)

> [!NOTE]
> Pop-up'ları ilgili sayfaya ilk girişte göstermek daha etkili olabilir. Örneğin: Takvim sayfasına ilk girişte "Doktor sütunları ve takvim görünümü arasından seçim yapabilirsiniz" gibi tek bir tooltip.
