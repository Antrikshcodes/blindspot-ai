# Multi-stage production Dockerfile for Blindspot AI Frontend SPA
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root dependencies if needed, or frontend package
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY lib/ ./lib/

WORKDIR /app/frontend
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: High-Performance Nginx Web Server
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
