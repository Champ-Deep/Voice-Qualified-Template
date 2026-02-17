# ============================================
# Single container: Frontend + Backend combined
# ============================================

# Stage 1: Build the frontend (React + Vite)
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js tailwind.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Vite env vars are baked in at build time
ARG VITE_VOICE_API_URL=https://api.elevenlabs.io/v1
ARG VITE_VOICE_API_KEY
ARG VITE_AGENT_ID
ARG VITE_PHONE_NUMBER_ID

ENV VITE_VOICE_API_URL=$VITE_VOICE_API_URL
ENV VITE_VOICE_API_KEY=$VITE_VOICE_API_KEY
ENV VITE_AGENT_ID=$VITE_AGENT_ID
ENV VITE_PHONE_NUMBER_ID=$VITE_PHONE_NUMBER_ID
# Frontend talks to same origin — backend serves everything
ENV VITE_BACKEND_URL=

RUN npm run build

# Stage 2: Build the backend (Express + TypeScript)
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/src/ ./src/
COPY backend/tsconfig.json ./

RUN npm run build

# Stage 3: Production image — single container serving both
FROM node:20-alpine

WORKDIR /app

# Install production backend deps only
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend into /app/public (backend serves this as static)
COPY --from=frontend-builder /app/frontend/dist ./public

# Railway injects PORT at runtime; default to 3001 for local Docker
EXPOSE 3001

# Health check uses $PORT so it works on any platform
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/health || exit 1

CMD ["node", "dist/server.js"]
