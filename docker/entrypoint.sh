#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

DB_WAIT_TIMEOUT_SECONDS="${DB_WAIT_TIMEOUT_SECONDS:-90}"
DB_WAIT_INTERVAL_SECONDS="${DB_WAIT_INTERVAL_SECONDS:-2}"

echo "Waiting for database to accept connections..."
if ! node - <<'NODE'
const net = require('node:net');

const databaseUrl = process.env.DATABASE_URL;
const timeoutSeconds = Number(process.env.DB_WAIT_TIMEOUT_SECONDS || 90);
const intervalSeconds = Number(process.env.DB_WAIT_INTERVAL_SECONDS || 2);

const parsed = new URL(databaseUrl);
const host = parsed.hostname;
const port = Number(parsed.port || 5432);
const deadline = Date.now() + timeoutSeconds * 1000;

function tryConnect() {
  const socket = net.createConnection({ host, port });

  socket.setTimeout(3000);

  socket.once('connect', () => {
    socket.end();
    console.log(`Database is reachable at ${host}:${port}`);
    process.exit(0);
  });

  socket.once('timeout', () => socket.destroy());
  socket.once('error', retry);
  socket.once('close', (hadError) => {
    if (!hadError) {
      return;
    }
  });
}

function retry() {
  if (Date.now() >= deadline) {
    console.error(`Timed out waiting for database at ${host}:${port}`);
    process.exit(1);
  }

  setTimeout(tryConnect, intervalSeconds * 1000);
}

tryConnect();
NODE
then
  echo "Database did not become reachable in time"
  exit 1
fi

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

echo "Starting VYTA API..."
exec node dist/main.js
