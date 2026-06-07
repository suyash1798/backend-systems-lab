#!/usr/bin/env sh
set -e

echo "Running slot-service migrations in the existing container..."
docker compose exec -T slot-service npm run db:migrate

echo "Seeding small slot-service demo data in the existing container..."
docker compose exec -T slot-service npm run db:seed

echo "Done."
