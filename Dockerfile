FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Copy the rest of the application
COPY . .

# 2. Install ALL dependencies (including @prisma/client)
RUN npm install

# Generate Prisma Client
RUN npm run db:setup

# Build the application (Vite + Server bundle)
RUN npm run build:agent
# Build the application (Vite + Server bundle)
RUN npm run build

# Production Dependencies Stage
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files and prisma configurations
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

 npm install --omit=dev && npm install --no-save prisma

RUN npm run db:setup

# Production Stage
FROM node:20-slim AS runner

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and scripts
COPY package*.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/

# Copy node_modules from deps (includes production Prisma client)
COPY --from=deps /app/node_modules ./node_modules

# 5. Copy the rest of your application code
COPY . .

FROM base AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

COPY . .

RUN npm run build

RUN npm prune --production

FROM node:22-slim AS runner
WORKDIR /app

# Install system dependencies needed for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy package configuration and generated Prisma client
COPY --from=builder /app/package*.json ./
# KITA AMBIL NODE_MODULES DARI BUILDER (Yang sudah di-prune/dibersihkan dari dev deps)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy built server and static frontend assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/agent ./agent

# Create storage directory for SQLite database and uploads
RUN mkdir -p /app/data /app/uploads && chmod -R 777 /app/data /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV DB_PROVIDER=postgresql
ENV PORT=3000

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.cjs"]