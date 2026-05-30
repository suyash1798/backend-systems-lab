#!/usr/bin/env sh
set -e


echo "Starting infrastructure..."
docker compose up -d redis postgres dynamodb kafka

echo "Waiting for Postgres..."
until docker compose exec postgres pg_isready -U postgres -d game_service >/dev/null 2>&1; do
  sleep 1
done

echo "Building game-service for migrations..."
docker compose build game-service

echo "Running game-service database migrations..."
docker compose run --rm game-service npm run db:migrate

echo "Starting Prisma Studio in background: http://localhost:5555"
docker compose run --rm -p 5555:5555 game-service npx prisma studio --hostname 0.0.0.0 &

echo "Starting DynamoDB Admin in background: http://localhost:8001"
docker run --rm -p 8001:8001 -e DYNAMO_ENDPOINT=http://host.docker.internal:8000 aaronshaf/dynamodb-admin &

echo "Starting services..."
docker compose up --build user-service lobby-service app-service wallet-service game-service analytics-service nginx-gateway
