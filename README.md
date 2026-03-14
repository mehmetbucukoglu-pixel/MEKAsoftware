# KlinikApp

Multi-tenant Klinik Yönetim SaaS — Randevu Merkezli Organizer

## Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- Docker & Docker Compose
- npm

### Kurulum

```bash
# 1. Veritabanı ve Redis'i başlat
docker-compose up -d

# 2. Backend bağımlılıklarını yükle
cd backend
npm install

# 3. Veritabanı migration
npx prisma migrate dev --name init

# 4. Demo veri yükle
npx prisma db seed

# 5. Uygulamayı başlat
npm run start:dev
```

### Giriş Bilgileri (Demo)
| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@demo.com | Admin123! |
| Doktor | doctor@demo.com | Doctor123! |
| Asistan | asistan@demo.com | Assist123! |

### API Dokümantasyonu
Uygulama çalışırken: http://localhost:3000/api/docs

## Proje Yapısı

```
klinikapp/
├── docker-compose.yml          # PostgreSQL + Redis
├── backend/
│   ├── src/
│   │   ├── common/             # Guard, Decorator, Filter, Interceptor
│   │   └── modules/
│   │       ├── auth/           # JWT kimlik doğrulama
│   │       ├── tenant/         # Klinik yönetimi
│   │       ├── user/           # Kullanıcı CRUD
│   │       ├── patient/        # Hasta yönetimi
│   │       ├── appointment/    # Randevu sistemi ⭐
│   │       ├── messaging/      # WhatsApp mesajlaşma
│   │       ├── finance/        # Ödeme takibi
│   │       ├── clinical-note/  # Doktor notları
│   │       ├── notification/   # Uygulama içi bildirimler
│   │       └── audit/          # Denetim kaydı
│   └── prisma/
│       ├── schema.prisma       # Veritabanı şeması
│       └── seed.ts             # Demo veri
└── frontend/                   # (Sonraki sprint)
```

## Tech Stack
- **Backend:** NestJS + TypeScript + Prisma
- **Veritabanı:** PostgreSQL 16
- **Cache/Queue:** Redis 7
- **API Docs:** Swagger/OpenAPI
- **Auth:** JWT (access + refresh token)
