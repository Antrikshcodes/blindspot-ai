# Build the frontend with its root pnpm workspace so the shared API client resolves.
FROM node:22-alpine AS builder

WORKDIR /app
ARG VITE_CLERK_PUBLISHABLE_KEY=
ARG VITE_API_BASE_URL=
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile --filter blindspot-ai-frontend...
RUN pnpm --filter blindspot-ai-frontend build

# Serve the static SPA from Nginx.
FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
