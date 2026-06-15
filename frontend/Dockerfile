FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC vars must be available at build time
ARG NEXT_PUBLIC_API_URL=https://api.mekapanel.com/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", ".next/standalone/server.js"]
