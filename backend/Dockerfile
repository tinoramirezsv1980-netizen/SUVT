# RNPN Backend — build multi-stage
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tzdata ca-certificates && rm -rf /var/lib/apt/lists/*
ENV TZ=America/El_Salvador
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN mkdir -p uploads/misiones
VOLUME /app/uploads

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
