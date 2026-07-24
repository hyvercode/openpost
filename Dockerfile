# Build Stage
FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the application (Vite + Server bundle)
RUN npm run build

# Production Dependencies Stage
FROM node:20-slim AS deps
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm install prisma -D
RUN npx prisma generate
RUN npm uninstall prisma

# Production Stage
FROM node:20-slim AS runner

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Copy node_modules from deps (includes production Prisma client)
COPY --from=deps /app/node_modules ./node_modules

# Copy built assets and server bundle from builder
COPY --from=builder /app/dist ./dist

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Use the entrypoint script to handle migrations
ENTRYPOINT ["./docker-entrypoint.sh"]
