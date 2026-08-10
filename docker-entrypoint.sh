#!/bin/sh
set -e

echo "Waiting for Postgres at ${DATABASE_HOST:-db}:${DATABASE_PORT:-5432}..."
host="${DATABASE_HOST:-db}"
port="${DATABASE_PORT:-5432}"
i=0
while ! nc -z "$host" "$port"; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "Postgres did not become ready in time"
    exit 1
  fi
  sleep 1
done
echo "Postgres is up"

echo "Applying Prisma schema..."
npx prisma db push --skip-generate

echo "Starting Referral Hub on port ${PORT:-4001}..."
exec node server.js
