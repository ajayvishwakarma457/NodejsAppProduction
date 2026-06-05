# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# --- Stage 2: Production Runner ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=6002

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Copy source utilities, configuration, and microservices directory
COPY src ./src
COPY microservices/notification-service ./microservices/notification-service
COPY scripts ./scripts

EXPOSE 6002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node scripts/docker-healthcheck.js

CMD ["node", "microservices/notification-service/index.js"]
