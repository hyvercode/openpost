# Stage 1: Base & Builder
FROM node:22-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm install

ENV DATABASE_URL="../data/dev.db"

RUN npx prisma generate

COPY . .

RUN npm run build
RUN npm prune --production


# Stage 2: Final Runner Image
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/agent ./agent

RUN mkdir -p /app/data /app/uploads && chown -R node:node /app/data /app/uploads && chmod 750 /app/data /app/uploads

USER node

# Set environment variables
ENV NODE_ENV=production
ENV DB_PROVIDER=postgresql
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]