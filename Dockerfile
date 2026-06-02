# =============================================================================
# nowen-blog Dockerfile - Multi-stage build
# =============================================================================

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/react-frontend

COPY react-frontend/package.json react-frontend/package-lock.json ./

RUN npm ci --prefer-offline

COPY react-frontend/ ./

RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.26-alpine AS backend-builder

WORKDIR /app/go-backend

COPY go-backend/go.mod go-backend/go.sum ./

RUN go mod download

COPY go-backend/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/nowen-blog-backend .

# Stage 3: Runtime
FROM nginx:alpine

# Install supervisord (manages nginx + Go backend)
RUN apk add --no-cache supervisor

# Copy frontend build artifacts
COPY --from=frontend-builder /app/react-frontend/dist /usr/share/nginx/html

# Copy Go backend binary
COPY --from=backend-builder /app/nowen-blog-backend /app/nowen-blog-backend

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy supervisord config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create uploads directory
RUN mkdir -p /app/uploads

WORKDIR /app

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
