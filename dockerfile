# Monolito: Frontend + API en un solo contenedor
FROM node:18

WORKDIR /app

# 1. Dependencias del frontend
COPY package.json package-lock.json ./
RUN npm ci

# 2. Construir frontend (API URL relativa para mismo origen)
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 3. Dependencias del servidor
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

# 4. Código del servidor
COPY server/ .

# 5. Ejecutar (dist está en /app/dist)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
