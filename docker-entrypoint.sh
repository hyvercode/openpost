#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting application setup..."

# Check if we should run migrations
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    # Check if it's a postgres database
    if echo "$DATABASE_URL" | grep -q "postgres"; then
      npx prisma migrate deploy
    else
      # For SQLite or others during dev/local testing
      npx prisma db push --accept-data-loss
    fi
  else
    echo "DATABASE_URL not set, skipping migrations."
  fi
fi

echo "Starting the server..."
npm start
