# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

# --- Stage 2: Production Runner ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=6000

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Copy source utilities, configuration, and microservices directory
COPY src ./src
COPY microservices/api-gateway ./microservices/api-gateway
COPY microservices/user-service/user.proto ./microservices/user-service/user.proto
COPY scripts ./scripts

EXPOSE 6000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node scripts/docker-healthcheck.js

CMD ["node", "microservices/api-gateway/index.js"]
