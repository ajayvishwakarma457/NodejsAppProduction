# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build tools in case of native addons
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install all dependencies
RUN npm ci

# --- Stage 2: Production Runner ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code and scripts
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY swagger.json ./

EXPOSE 5000

# Production-grade native health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node scripts/docker-healthcheck.js

CMD ["node", "src/server.js"]
