#!/bin/sh
set -e

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

echo "Starting VYTA API..."
exec node dist/src/main.js
