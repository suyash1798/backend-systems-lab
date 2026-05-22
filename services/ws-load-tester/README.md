# WebSocket Load Tester

Run from the repo root.

## Room Play Load Test

This joins each connection to a room and sends `play` messages with `roomId`.

```bash
docker compose --profile loadtest run --rm --build \
  -e ACTION=play \
  -e CONNECTIONS=100 \
  -e ROOMS=10 \
  -e JOIN_ON_OPEN=true \
  -e RAMP_UP_MS=10000 \
  -e DURATION_MS=60000 \
  -e MESSAGE_INTERVAL_MS=1000 \
  ws-load-tester
```

## Useful Metrics

- `activeConnections`: currently open sockets
- `sentPerSec` / `receivedPerSec`: current throughput
- `notifications`: room notifications received from other players
- `pending`: requests waiting for response
- `timeouts`: requests that did not receive response in time
- `p95LatencyMs` / `p99LatencyMs`: tail latency
