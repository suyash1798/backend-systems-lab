#!/usr/bin/env sh
set -e

echo "Starting databases..."
docker compose up -d redis postgres dynamodb

echo "Waiting for Postgres..."
until docker compose exec postgres pg_isready -U postgres -d game_service >/dev/null 2>&1; do
  sleep 1
done

echo "Building game-service for migrations..."
docker compose build game-service

echo "Running game-service database migrations..."
docker compose run --rm game-service npm run db:migrate

echo "Starting services..."
docker compose up --build user-service lobby-service app-service wallet-service game-service nginx-gateway
