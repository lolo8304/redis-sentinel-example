# redis-sentinel-example

A small Redis HA demo using Sentinel and a NestJS API. The Helm chart deploys a Redis/Sentinel stateful set and an optional NestJS service that talks to Redis through Sentinel (via ioredis), so it follows master changes automatically.

## Why Redis Sentinel for HA?
- Sentinel monitors the Redis master and replicas, elects a new master on failure, and publishes the updated master address.
- Clients (ioredis in this project) connect to Sentinels, which hand out the current master; when failover happens the client reconnects to the new master automatically.
- This avoids hard-coding a single Redis host and keeps writes flowing during failover.

## Example API (NestJS)
- Location: `nest-redis-sentinel`
- Uses ioredis with Sentinel discovery; master changes are handled transparently by the client.
- Sample endpoint: `POST /example/user/:id` stores a JSON payload; `GET /example/user/:id` reads it back.
- Health check: `/health/redis` (used by probes).

## Environment variables
All env variables are documented in `env.txt` (kept in sync with `nest-redis-sentinel/.env` and Helm `values.yaml`). Key groups:
- Auth/discovery: `REDIS_PASSWORD`, `REDIS_SENTINEL_PASSWORD`, `REDIS_SENTINEL_MASTER_SET`, `REDIS_SENTINEL_HOSTS`.
- Behavior toggles: `REDIS_LAZY_CONNECT`, `REDIS_ENABLE_READY_CHECK`, `REDIS_ENABLE_AUTO_PIPELINING`, `REDIS_FAILOVER_DETECTOR`, `REDIS_AUTO_RESUBSCRIBE`, `REDIS_SHOW_FRIENDLY_ERROR_STACK`, `REDIS_ENABLE_OFFLINE_QUEUE`, `REDIS_RETRY_STRATEGY`, `REDIS_SENTINEL_RETRY_STRATEGY`, `REDIS_SENTINEL_RECONNECT_STRATEGY`.
- Timeouts/limits: `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_MAX_RETRIES_PER_REQUEST`, `REDIS_KEEP_ALIVE_MS`, `REDIS_CACHE_TTL`.
- Misc: `REDIS_DB`, `REDIS_ENABLE_TLS`, `DEBUG`.

## Helpful aliases (`.bash_aliases`)
Source the file or add to your shell. Grouped cheat sheet:
- Build: `docker-build` (build Nest image), `build-and-upgrade` (build then helm upgrade).
- Deployment: `install`, `upgrade`, `uninstall`, `rollout` (Redis StatefulSet), `dry` (helm dry-run).
- Debugging: `node0-info` / `node1-info` / `node2-info` (redis INFO replication), `bash0` / `bash1` / `bash2` (Sentinel shells), `bashn` (Nest shell), `events`, `logs`.
- Local debugging: `port` (port-forward Redis + Sentinel services/pods), `master` (current master from Sentinel).
- Redis HA testing (single probes): `write`, `writeRnd`, `writeAll`, `read`, `readRnd`, `health`.
- Redis HA testing (continuous): `test-write`, `test-writeRnd`, `test-read`, `test-readRnd`, `test-health`.

### HA testing quick reference
- Single probes:
  - `write`: POST a fixed user (id 42) via Nest (`localhost:8080`).
  - `writeRnd`: POST a random user id/name.
  - `writeAll`: Seed ids 0-29.
  - `read`: GET user 42.
  - `readRnd`: GET a random user id.
  - `health`: GET `/health/redis`.
- Continuous loops (handy during failover testing):
  - `test-write`, `test-writeRnd`: continuous writes.
  - `test-read`, `test-readRnd`: continuous reads.
  - `test-health`: continuous health checks.
- Each call prints the API’s latency in the response body, so you can watch performance while inducing failovers.

## Deployment
- Helm chart: `helm-redis-sentinel`
- Nest image: multi-stage Node 24 build in `nest-redis-sentinel/Dockerfile` (includes redis-cli for diagnostics).
- Probes and ConfigMaps are wired with checksums; config changes trigger rollouts automatically.
