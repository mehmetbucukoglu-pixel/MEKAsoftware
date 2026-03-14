# Sprint 2 — Hasta Yönetimi

## Backend ✅
- [x] DTO'lar: `CreatePatientDto`, `UpdatePatientDto` (class-validator)
- [x] `patient.service.ts` iyileştirme (soft delete, email filtreleme)
- [x] `patient.controller.ts` iyileştirme (DTO tipi, Swagger dekoratörleri)
- [x] Roles dekoratörü ekleme (ADMIN, ASSISTANT oluşturabilir; herkes listeleyebilir)

## Frontend — Hasta Listesi ✅
- [x] API entegrasyonu (mock data → gerçek API)
- [x] Arama (debounce 300ms)
- [x] Sayfalama (pagination)
- [x] Boş durum (empty state)
- [x] Yükleniyor durumu (loading state)

## Frontend — Hasta Ekleme/Düzenleme ✅
- [x] Hasta ekleme modal
- [x] Hasta düzenleme (mevcut verilerin doldurulması)
- [x] Form validasyonu (frontend tarafında)
- [x] Başarı/hata bildirimleri (toast)

## Frontend — Hasta Detay ✅
- [x] `/patients/[id]` dinamik sayfa
- [x] Hasta bilgileri kartı
- [x] Geçmiş randevular sekmesi
- [x] Klinik notları sekmesi
- [x] Düzenleme butonu → modal bağlama

## Doğrulama ✅
- [x] Backend TypeScript derleme kontrolü (0 hata)
- [x] Frontend build kontrolü (12/12 sayfa, 0 hata)
