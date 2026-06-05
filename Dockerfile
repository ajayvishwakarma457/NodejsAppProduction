# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build tools in case of native addons
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Generate Prisma client for SQLite/SQLite driver
RUN npx prisma generate

# --- Stage 2: Production Runner ---
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma client artifacts from builder stage
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

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
