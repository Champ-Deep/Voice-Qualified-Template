# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY package.json package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY index.html tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js tailwind.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build args for Vite (baked in at build time)
ARG VITE_VOICE_API_URL=https://api.elevenlabs.io/v1
ARG VITE_VOICE_API_KEY
ARG VITE_AGENT_ID
ARG VITE_PHONE_NUMBER_ID

# Frontend talks to same origin (backend serves it), so VITE_BACKEND_URL is empty
ENV VITE_VOICE_API_URL=$VITE_VOICE_API_URL
ENV VITE_VOICE_API_KEY=$VITE_VOICE_API_KEY
ENV VITE_AGENT_ID=$VITE_AGENT_ID
ENV VITE_PHONE_NUMBER_ID=$VITE_PHONE_NUMBER_ID
ENV VITE_BACKEND_URL=

# Build frontend
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source
COPY backend/src/ ./src/
COPY backend/tsconfig.json ./

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install production deps only
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Railway provides PORT via env var
EXPOSE ${PORT:-3001}

CMD ["node", "dist/server.js"]
