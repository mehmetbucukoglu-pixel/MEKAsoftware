FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=https://api.mekapanel.com/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Standalone mode requires static files to be copied manually
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public

WORKDIR /app/.next/standalone
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
CMD ["node", "server.js"]
