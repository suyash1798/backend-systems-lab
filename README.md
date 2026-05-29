# Trying-SD

A learning project for a realtime slot-style backend.

The system uses WebSockets for game actions, Redis for realtime fanout and short-lived state, Postgres/Prisma for round and spin history, DynamoDB for flexible game/player data, and a wallet service for balance changes.

## Services

```text
user-service       Device identity and JWT issuing
lobby-service      HTTP room assignment before WebSocket join
game-service       WebSocket game API
wallet-service     Wallet ledger, deduct/credit, jackpot contribution
redis              Pub/Sub, idempotency, current round state
postgres           Durable round/spin history
dynamodb           Flexible game-player persistent data
ws-load-tester     WebSocket load testing client
```

## Code Structure

`game-service` is structured so WebSocket is only the transport layer. The same service layer can be reused later by REST APIs.

```text
src/websocket/       WebSocket controller/gateway, room registry, validation
src/http/            HTTP health app, future REST APIs
src/game/actions/    WebSocket action controllers
src/game/services/   Business logic
src/repositories/    Redis, Postgres, DynamoDB persistence access
src/game/models/     Domain models/interfaces
src/infra/           Low-level clients
src/observability/   Logs and request tracing
```

Flow:

```text
WebSocket message
  -> messageValidator
  -> GameActions router
  -> action controller
  -> game service
  -> repository/client
```

## Local Setup

Start everything locally:

```bash
sh scripts/start-local.sh
```

Health checks:

```bash
curl http://localhost:8080
curl http://localhost:3000
curl http://localhost:4000
curl http://localhost:5000
curl http://localhost:6000
```

Local gateway routes:

```text
http://localhost:8080/app/*    -> app-service
ws://localhost:8080/game/ws    -> game-service
```

## App Launch Flow

The app-facing BFF can launch a game in one call. It creates/fetches the player, assigns a room, and returns the WebSocket URL.

```bash
curl -X POST http://localhost:8080/app/games/slot-1/launch \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"device-1"}'
```

Response:

```json
{
  "playerId": "123456",
  "accessToken": "...",
  "room": {
    "roomId": "room-...",
    "gameId": "slot-1",
    "status": "OPEN",
    "capacity": 5,
    "playerCount": 1,
    "players": ["123456"]
  },
  "websocketUrl": "ws://localhost:8080/game/ws"
}
```

## Internal Device Login

Create or fetch a player for a device:

```bash
curl -X POST http://localhost:6000/devices \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"device-1"}'
```

Response:

```json
{
  "playerId": "123456",
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

## Internal Lobby Flow

Load a game before opening the WebSocket connection.

Lobby reads the player from the JWT, then adds the player to an existing open room for the game if the room has fewer than 5 players. If no room is available, it creates a new room.

```bash
curl -X POST http://localhost:5000/games/slot-1/load \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Response:

```json
{
  "roomId": "room-...",
  "gameId": "slot-1",
  "status": "OPEN",
  "capacity": 5,
  "playerCount": 1,
  "players": ["123456"]
}
```

Call the same endpoint for another player. They will join the same room until it reaches 5 players.

```bash
curl -X POST http://localhost:5000/games/slot-1/load \
  -H "Authorization: Bearer ACCESS_TOKEN_2"
```

Then connect to your configured WebSocket URL and join with the returned `roomId`.

## WebSocket URL

Local:

```text
ws://localhost:8080/game/ws
```

Inside Docker network:

```text
ws://game-service:3000
```

## WebSocket Actions

### Join Room

Join must happen before game actions. The socket stores authenticated `userId` and `roomId`.

```json
{
  "action": "join",
  "requestId": "join-1",
  "roomId": "room-1",
  "token": "ACCESS_TOKEN"
}
```

### Spin

The first spin creates an active round if one does not exist. More spins reuse the same active round until `end_round`.

```json
{
  "action": "spin",
  "requestId": "req-1",
  "gameId": "slot-1",
  "spinId": "spin-1",
  "betAmount": 10
}
```

Response includes `roundId`:

```json
{
  "status": "ok",
  "action": "spin",
  "requestId": "req-1",
  "roundId": "...",
  "gameId": "slot-1",
  "spinId": "spin-1",
  "betAmount": 10,
  "symbols": ["CHERRY", "LEMON", "BELL"],
  "winAmount": 0,
  "balance": 9990
}
```

### End Round

Marks the current active round as done. The next spin starts a new round.

```json
{
  "action": "end_round",
  "requestId": "end-1"
}
```

### Persistent Game Data

Stores flexible game/player data in DynamoDB by `userId + gameId`.

```json
{
  "action": "persistent_data",
  "requestId": "data-1",
  "gameId": "slot-1",
  "data": {
    "freeSpinsLeft": 5,
    "bonusMultiplier": 2
  }
}
```

## Idempotency

Redis stores request state so retries are safe across multiple `game-service` instances.

Current keys:

```text
join:{userId}:{roomId}:{requestId}
spin:{userId}:{requestId}
end-round:{userId}:{roomId}:{requestId}
persistent-data:{userId}:{gameId}:{requestId}
```

For spin, `requestId` protects retries for a short Redis window. `spinId` is persisted with the spin record and scoped inside the active round.

State shape:

```json
{ "status": "pending" }
```

or:

```json
{ "status": "completed", "response": { "...": "..." } }
```

For `spin`, `spinId` is the business idempotency key. Retrying the same `spinId` returns the same result. Reusing the same `spinId` with a different bet amount returns an idempotency conflict.

## Realtime Room Fanout

Each `game-service` instance keeps local room membership:

```text
roomId -> sockets connected to this instance
```

When a player acts:

```text
game-service publishes Redis event with roomId
all game-service instances receive it
each instance notifies only local sockets in that room
```

The actual WebSocket object is never stored in Redis.

## Data Stores

### Postgres

Postgres stores durable game history:

```text
wallets
wallet_transactions
jackpot_configs
jackpot_contributions
game_rounds
game_spins
```

Prisma schema:

```text
services/game-service/prisma/schema.prisma
```

Migrations:

```text
services/game-service/prisma/migrations
```

Run migrations:

```bash
docker compose run --rm game-service npm run db:migrate
```

### Redis

Redis is used for:

```text
Pub/Sub room events
Idempotency state
Current active round state
```

### DynamoDB

DynamoDB is used for flexible game/player data:

```text
Table: GamePlayerData
PK: userId
SK: gameId
```

Local DynamoDB runs in memory, so data is lost when the container restarts.

## Admin Tools

### Prisma Studio

Use this for Postgres tables:

```bash
docker compose run --rm --service-ports game-service npx prisma studio --hostname 0.0.0.0
```

Open:

```text
http://localhost:5555
```

### DynamoDB Admin

Start DynamoDB local first:

```bash
docker compose up -d dynamodb
```

Run admin UI:

```bash
docker run --rm -p 8001:8001 \
  -e DYNAMO_ENDPOINT=http://host.docker.internal:8000 \
  aaronshaf/dynamodb-admin
```

Open:

```text
http://localhost:8001
```

## Load Testing

Run a local spin load test:

```bash
docker compose --profile loadtest run --rm --build \
  -e TARGET_URL=ws://game-service:3000 \
  -e ACTION=spin \
  -e JOIN_ON_OPEN=true \
  -e GAME_ID=slot-1 \
  -e CONNECTIONS=100 \
  -e ROOMS=10 \
  -e BET_AMOUNT=10 \
  -e RAMP_UP_MS=10000 \
  -e DURATION_MS=60000 \
  -e MESSAGE_INTERVAL_MS=1000 \
  ws-load-tester
```

Useful metrics:

```text
opened              successful WebSocket connections
connectionErrors    failed WebSocket connections
sent                messages sent
ok                  successful action responses
appErrors           application-level errors
timeouts            requests with no response in time
p95LatencyMs        95% of requests completed within this latency
p99LatencyMs        99% of requests completed within this latency
notifications       room fanout messages received
```

## AWS Notes

This repo has AWS Copilot files under:

```text
copilot/
```

Manual deploy pattern:

```bash
copilot env deploy --name prod
copilot svc deploy --name wallet-service --env prod
copilot svc deploy --name game-service --env prod
```

For AWS, replace local dependencies with managed services over time:

```text
Postgres   -> RDS Postgres
Redis      -> ElastiCache Redis
DynamoDB   -> AWS DynamoDB
ECS        -> game-service and wallet-service tasks
```

Keep `ws-load-tester` count at `0` when not testing to avoid unnecessary cost.

## Wallet And Jackpot APIs

Wallet service owns balance changes and jackpot contribution.

Create or update a jackpot for a game:

```bash
curl -X POST http://localhost:4000/jackpots \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "slot-1",
    "jackpotName": "grand",
    "initialAmount": 10000,
    "contributionPercent": 2
  }'
```

List jackpots:

```bash
curl http://localhost:4000/jackpots/slot-1
```

Spin calls wallet `/deduct` internally. If jackpots are configured for that `gameId`, a percentage of the bet is added to each active jackpot.
