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
ENV PORT=6001

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Copy source utilities, configuration, and microservices directory
COPY src ./src
COPY microservices/user-service ./microservices/user-service
COPY scripts ./scripts

# Expose REST port (6001) and gRPC port (50051)
EXPOSE 6001 50051

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node scripts/docker-healthcheck.js

CMD ["node", "microservices/user-service/index.js"]
