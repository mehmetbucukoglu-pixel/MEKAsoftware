# KlinikApp — Sprint 0 & 1 Tamamlandı ✅

## Sprint 0 — Backend Altyapısı ✅

NestJS backend, 10 modül, 14 tablo Prisma şeması, Docker Compose, JWT auth, Swagger docs, ve seed data oluşturuldu. `tsc --noEmit` ile 0 hata.

## Sprint 1 — Frontend & Auth ✅

### Oluşturulan Bileşenler

| Bileşen | Dosya |
|---|---|
| Design System | `globals.css` (dark theme, CSS variables, tüm UI sınıfları) |
| API Client | `lib/api.ts` (Axios, JWT auto-refresh) |
| Auth Store | `lib/auth-store.ts` (Zustand) |
| Login Sayfası | `app/login/page.tsx` |
| Sidebar Layout | `app/(app)/layout.tsx` (Adobe-style) |
| Dashboard | `app/(app)/dashboard/page.tsx` |
| Hastalar | `app/(app)/patients/page.tsx` (arama + tablo) |
| + 5 placeholder | calendar, messages, finance, notes, settings |

### Login Sayfası

![KlinikApp Login Sayfası](file:///C:/Users/Lenovo/.gemini/antigravity/brain/f21b712c-4d05-40d3-b660-3cc34965c5b8/login_page_preview_1772318348736.png)

### Doğrulama

- ✅ Next.js dev server çalışıyor (port 3001)
- ✅ Login sayfası render ediliyor
- ✅ Auth guard çalışıyor (`/dashboard` → `/login` redirect)
- ✅ Dark theme, teal gradient, smooth animations

## Nasıl Çalıştırılır?

```bash
# Backend
cd klinikapp/backend
npm run start:dev          # port 3000

# Frontend
cd klinikapp/frontend
npm run dev -- -p 3001     # port 3001
```

## Sonraki Adım: Sprint 2

Hasta yönetimi — API entegrasyonu, detay sayfası, form, ve Excel import.
