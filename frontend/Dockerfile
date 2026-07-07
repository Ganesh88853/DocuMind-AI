# =============================================================================
# DocuMind AI — Frontend Dockerfile
# Multi-stage build: deps → build → production nginx
# =============================================================================

# ── Stage 1: Dependency installer ────────────────────────────────────────────
# Use Node LTS (22) on Alpine for smallest possible base
FROM node:22-alpine AS deps

WORKDIR /app

# Install only package files first for Docker cache efficiency
# node_modules layer is only rebuilt when package.json changes
COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps needed for build)
RUN npm ci --frozen-lockfile

# ── Stage 2: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build arguments to inject at build time (available as VITE_* env vars)
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_APP_NAME="DocuMind AI"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Run the Vite production build — output goes to /app/dist
RUN npm run build

# ── Stage 3: Production nginx ─────────────────────────────────────────────────
# Serve static assets with nginx — no Node.js in final image
FROM nginx:1.27-alpine AS runner

LABEL maintainer="DocuMind AI Team"
LABEL description="DocuMind AI Frontend — React SPA served via nginx"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check — confirm nginx is serving requests
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

# nginx foreground mode (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
