# Stage 1: Base & Builder
FROM node:22-slim AS builder
WORKDIR /app

# Install dependencies sistem untuk Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy konfigurasi package dan prisma terlebih dahulu (untuk caching layer)
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install semua dependencies (termasuk devDependencies untuk build)
RUN npm install

# Copy SISA seluruh source code aplikasi (Ditaruh SEBELUM build)
COPY . .

# Build aplikasi (Vite / Server bundle)
RUN npm run build

# Hapus devDependencies untuk memperkecil ukuran image akhir
RUN npm prune --production


# Stage 2: Final Runner Image
FROM node:22-slim AS runner
WORKDIR /app

# Install dependencies runtime yang dibutuhkan
RUN apt-get update && apt-get install -y openssl ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy hasil build dan node_modules yang sudah bersih dari builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/agent ./agent

# Buat direktori data untuk SQLite dan uploads
RUN mkdir -p /app/data /app/uploads && chmod -R 777 /app/data /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV DB_PROVIDER=postgresql
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]