# Chord Frontend Dockerfile
# Multi-stage build for React/Vite application

# ===========================================
# Stage 1: Build
# ===========================================
FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_SIGNALR_BASE_URL

# Set build-time environment variables
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SIGNALR_BASE_URL=${VITE_SIGNALR_BASE_URL}

# Build the application
RUN npm run build

# ===========================================
# Stage 2: Production
# ===========================================
FROM nginx:alpine@sha256:fb4658584bd9a916ffb6f6e365f97c25cfdb2923801f551ea08356e695f14ff7 AS production

# apk upgrade: nginx:alpine taban imaji Alpine guvenlik yamasindan sonra hemen
# yeniden derlenmiyor (Ekim 2026: brotli-libs 1.2.0-r1 tasiyordu, yamali
# 1.2.1-r0 cikmisti) -> derleme aninda guncel Alpine paketleri alinir.
RUN apk upgrade --no-cache

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


