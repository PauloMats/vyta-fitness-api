#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

echo "Starting VYTA API..."
exec node dist/src/main.js
