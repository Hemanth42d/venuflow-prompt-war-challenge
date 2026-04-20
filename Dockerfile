# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production server ──
FROM node:20-alpine
WORKDIR /app

# Install backend deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy frontend build into backend's public folder
COPY --from=frontend-build /app/frontend/dist ./public

# Express will serve static files from ./public
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server.js"]
