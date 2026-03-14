# Sprint 3 Randevu Sistemi (Appointments) — Implementation Plan

Sprint 3 kapsamında Randevu Sistemi entegrasyonu, klinik hekimlerinin çalışma saatlerinin ayarlanması ve gelişmiş bir Takvim UI arayüzü yapılacaktır.
Backend altyapısı (Controller, Service, Prisma Schema) halihazırda mevcuttur ve çifre rezervasyonu (double booking conflict) kontrol etmektedir. Geliştirme tamamen **Frontend** odaklı devam edecektir.

---

## Aşama 1: API Tüketicileri (Frontend API Layer)

### [MODIFY] [api.ts](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/lib/api.ts)
- `appointmentApi` objesi eklenecek:
  - `list(filters)`
  - `get(id)`
  - `create(data)`
  - `update(id, data)`
  - `updateStatus(id, status)` (CANCELLED, COMPLETED, NO_SHOW vs.)
  - `getAvailableSlots(doctorId, date)`
- `doctorScheduleApi` objesi eklenecek:
  - `get(doctorId)`
  - `update(doctorId, schedules)`

---

## Aşama 2: Doktor Çalışma Saatleri (Schedule)

### [NEW] [settings/schedule/page.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/settings/schedule/page.tsx)
- Kliniğe bağlı doktorların çalışma saatlerinin yönetileceği Admin paneli sayfası.
- **Form Yapısı**: Pazartesiden pazara kadar (0-6 index) çalışma ve mola saatleri eklenebilecek (`startTime`, `endTime`, `breakStart`, `breakEnd`, `slotDuration`). 
- **Zorunlu Alanlar**: Sadece çalışılan günler için `isActive: true` yapılarak kaydedilecek.

---

## Aşama 3: Takvim Modülü ve Randevu Sayfası (Kütüphane)

Kullanıcı deneyimini hızlandırmak ve görselleştirmeyi güçlendirmek için `@fullcalendar/react` kütüphanesi kullanılacaktır. (Gün/Hafta/Ay görünümlerini standart hale getirir).

### [NEW] [appointments/page.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/appointments/page.tsx)
- **Görünümler**: Day, Week ve Month butonları eklenecek.
- **Veri Çekme**: FullCalendar `events` prop'una, API'den dönen `appointments` maplenerek geçirilecek (`title`, `start`, `end`, `backgroundColor`).
- Randevuların durumu renk kodlarına dönüştürülecek (örn. CONFIRMED -> mavi, COMPLETED -> yeşil, CANCELLED -> gri/kırmızı, NO_SHOW -> turuncu).
- Sürükle-bırak (Drag&Drop) etkinleştirilerek gün/saat değişimi API isteğine (`appointmentApi.update`) bağlanacak.
- Takvimde boş saate tıklandığında (dateClick) Randevu Ekleme Modalı açılacak.

---

## Aşama 4: Randevu Modal UI (Ekleme/Düzenleme)

### [NEW] [appointment-modal.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/appointments/appointment-modal.tsx)
- **Hasta Arama**: Mevcut `QuickSearch` mantığı veya bir dropdown/autocomplete bileşeni ile hasta (`patientId`) seçimi.
- **Doktor Seçimi**: `doctorId` seçimi.
- **Tarih & Saat Dilimi Seçimi**:
  - Tarih seçildiğinde `appointmentApi.getAvailableSlots()` çağrılarak doktorun ilgili gündeki uygun slotları getirilecek.
  - Seçilen saat (`startTime`) ve süre (`durationMin`) backend payload'una eklenecek.
- **Kaydetme ve Çakışma Yönetimi**: API'den `409 Conflict` gelirse (Bu zaman aralığında doktorun başka bir randevusu var), modal içinde form-error mesajı olarak gösterilecek.

---

## Aşama 5: Dashboard Entegrasyonu

### [MODIFY] [dashboard/page.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/dashboard/page.tsx)
- Mevcut `upcomingAppointments` mock değişkeni silinecek.
- Bugüne ait randevular (`appointmentApi.list({ date: today })`) çekilerek sadece `startTime` itibariyle yaklaşan/henüz geçmemiş olanlar listelenecek.
- Eğer onaylı ise yeşil `badge` gösterilecek.

---

## Aşama 6: Sprint 3 Ek Geliştirmeleri ve UI/UX (Sprint 3.5)

### [MODIFY] [appointments/page.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/appointments/page.tsx)
- **Tüm Doktorlar Günlük Görünüm (Resource View)**: `@fullcalendar/resource-timegrid` paketi kurularak, günlük görünümde her doktorun kendi sütununun olduğu bir arayüz eklenecek. Asistanlar tüm kliniğin durumunu tek ekranda görebilecek.
- **Doktor Filtresi**: Takvimin üst kısmına doktor seçimi (Select) eklenecek. Sadece istenen doktor(lar) görüntülenebilecek.
- **Sürükle & Bırak (Drag&Drop)**: FullCalendar'da `editable={true}` yapılarak `eventDrop` event'i yakalanacak. Randevu saati değiştiğinde API üzerinde `appointmentApi.update` çağrılacak. Çakışma durumunda (409) işlem `info.revert()` ile eski haline dönecek ve hata gösterilecek.

### [MODIFY] [appointments/appointment-modal.tsx](file:///C:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/appointments/appointment-modal.tsx)
- **İptal Sebebi (Cancel Reason)**: Randevu durumu `CANCELLED` seçildiğinde bir `textarea` açılacak ancak doldurulması **opsiyonel** olacak. Bu bilgi API'ye iletilecek.

### [Simülasyon]
- N8N webhook yerine, el ile birkaç farklı hasta ve doktora randevular oluşturularak sistemin işleyişi (Tüm doktorlar görünümü, çakışma vb.) simüle edilecek.
