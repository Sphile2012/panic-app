# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Node 20 Alpine — smallest image that includes npm
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first so Docker layer-caches the install step
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Copy source
COPY . .

ARG VITE_FRONTEND_URL=""
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_AUTH_ENABLED=true

RUN npm run build


# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
# Minimal Nginx Alpine — only the compiled static files end up in this image.
# No Node, no source code, no secrets.
FROM nginx:1.27-alpine AS runner

# Remove default site config
RUN rm -f /etc/nginx/conf.d/default.conf

# Add a non-root user for Nginx worker processes
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy our nginx config
COPY nginx.conf /etc/nginx/templates/panic-ring.conf.template
ENV NGINX_ENVSUBST_FILTER=^(SUPABASE_ANON_KEY|WHAT3WORDS_API_KEY)$

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx needs to write to these dirs; give ownership to appuser
RUN chown -R appuser:appgroup /var/cache/nginx \
                               /var/log/nginx   \
                               /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

# Docker / Compose healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
