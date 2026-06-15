FROM node:20-alpine AS builder
WORKDIR /app

# Önce prisma schema'yı kopyala ki npm ci postinstall'da prisma generate çalışsın
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Tüm kaynak kodu kopyala ve build et
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
