# Chord Frontend Dockerfile
# Multi-stage build for React/Vite application

# ===========================================
# Stage 1: Build
# ===========================================
FROM node:20-alpine AS build

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
FROM nginx:alpine AS production

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
    CMD wget -q --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

