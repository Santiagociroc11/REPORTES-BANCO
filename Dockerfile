# Build stage
FROM node:18-alpine AS builder


WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build frontend and server
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG TELEGRAM_BOT_TOKEN

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start both the server and the Telegram bot
CMD ["node", "api/index.js"]