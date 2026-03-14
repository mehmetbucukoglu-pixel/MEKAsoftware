# KlinikApp Görev Takibi

## Sprint 2: UX İyileştirmeleri (Tamamlandı)
- [x] Silinen hastaları listeleme + geri alma API
- [x] TC Kimlik KVKK şifreleme (AES-256 + hash)
- [x] TC duplicate kontrol endpoint, Form uyarısı
- [x] Telefon formatı, TC maskelemesi (Listede)
- [x] Ctrl+K hızlı arama + bilgilendirme popup
- [x] Arama sonuçları highlight
- [x] Son görüntülenen hastalar (sidebar/dashboard)
- [x] Hasta ekleme sonrası yönlendirme

---

## Sprint 3: Randevu Sistemi & Takvim (Planlanıyor)

### 1. API & Altyapı
- [x] Frontend `lib/api.ts` dosyasına `appointmentApi` metotlarının eklenmesi
- [x] Frontend `lib/api.ts` dosyasına `doctorScheduleApi` metotlarının eklenmesi
- [x] Gerekli takvim kütüphanesinin (örn. `@fullcalendar/react` veya `react-big-calendar`) kurulması

### 2. Doktor Çalışma Saatleri (Schedule) Yönetimi
- [x] `doctors/[id]/schedule/page.tsx` sayfasının oluşturulması (Sadece Admin & İlgili Doktor)
- [x] Haftalık çalışma saatleri, mola başlangıç/bitiş ve randevu aralığı (dk) tanımlama UI
- [x] Backend'e `PATCH /doctors/:id/schedule` isteğinin bağlanması

### 3. Randevu Modal UI (Ekleme/Düzenleme)
- [x] `appointment-modal.tsx` bileşeninin yapılması
- [x] Hasta arama (Async select/autocomplete tarzı)
- [x] Uygun saat dilimlerinin (`availableSlots`) dinamik çekilip seçtirilmesi
- [x] Çakışma hata kontrollerinin formda gösterimi

### 4. Takvim Görünümü (Calendar View)
- [x] `appointments/page.tsx` ana takvim sayfasının tasarlanması
- [x] Gün, Hafta ve Ay görünümleri
- [x] Randevu kutucuklarında renk kodlaması (Onaylı, İptal, vs.)
- [ ] Sürükle-Bırak (Drag & Drop) ile randevu saati değiştirme (Opsiyonel/Kütüphane destekliyse)
- [x] Takvim üzerinden tıklayarak boş saate randevu verme

### 5. Dashboard Entegrasyonu
- [x] Dashboard üzerindeki `Yaklaşan Randevular` listesinin `GET /appointments` API'si ile gerçek verilere bağlanması
- [x] Ana ekranda Doktor filtresi veya Tüm Klinik bazlı özetler

---

## Sprint 3.5: Gelişmiş Takvim Özellikleri

### 1. Takvim UX İyileştirmeleri
- [x] `@fullcalendar/resource-timegrid` paketi ile "Tüm Doktorlar Günlük" (Resource) görünümünün eklenmesi
- [x] Takvime **Doktor Filtresi** eklenmesi (Tüm Doktorlar veya tekil hekim)
- [x] Takvimde randevuları ilgili saate/güne taşıma **Sürükle & Bırak (Drag&Drop)** desteğinin açılması

### 2. İptal Sebebi 
- [x] `appointment-modal` içinde durum `CANCELLED` yapıldığında `textarea` gösterilmesi (Opsiyonel olarak)
- [x] `appointmentApi.updateStatus` backend'e iptal sebebini opsiyonel parametre olarak geçmesi

### 3. Kullanım Simülasyonu
- [x] Frontend üzerinden farklı doktorlara manuel randevular atanarak Resource ekranında test edilmesi
