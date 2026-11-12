# Multi-stage production Dockerfile for Blindspot AI Backend API
# ==============================================================================

# Stage 1: Build & compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and configuration
COPY tsconfig*.json ./
COPY src/ ./src/

# Compile production bundles
RUN npm run build

# Prune devDependencies to keep container minimal
RUN npm prune --production

# ==============================================================================
# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install wget for container healthcheck
RUN apk add --no-cache wget

# Create non-root application user
USER node

# Copy production artifacts from builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
# Copy migration SQL files required for runtime schema operations
COPY --chown=node:node src/phase01/db/migrations ./src/phase01/db/migrations

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/phase01/server.js"]
