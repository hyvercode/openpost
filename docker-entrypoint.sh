#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting application setup..."

# Configure Prisma schema dynamically based on runtime DATABASE_URL / DB_PROVIDER
echo "Configuring Prisma schema for runtime database..."
node scripts/setup-prisma.cjs
npx prisma generate

# Check if we should run migrations
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  if [ -n "$DATABASE_URL" ]; then
    echo "Syncing database schema..."
    if echo "$DATABASE_URL" | grep -q "postgres"; then
      npx prisma db push --accept-data-loss || npx prisma migrate deploy
    else
      # For SQLite or others during dev/local testing
      npx prisma db push --accept-data-loss
    fi
  else
    echo "DATABASE_URL not set, skipping database sync."
  fi
fi

echo "Starting the server..."
npm start
