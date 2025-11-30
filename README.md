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
- Behavior toggles: `REDIS_LAZY_CONNECT`, `REDIS_ENABLE_READY_CHECK`, `REDIS_ENABLE_AUTO_PIPELINING`, `REDIS_FAILOVER_DETECTOR`, `REDIS_AUTO_RESUBSCRIBE`, `REDIS_SHOW_FRIENDLY_ERROR_STACK`, `REDIS_ENABLE_OFFLINE_QUEUE`, `REDIS_RETRY_STRATEGY`, `REDIS_SENTINEL_RETRY_STRATEGY`.
- Timeouts/limits: `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_MAX_RETRIES_PER_REQUEST`, `REDIS_KEEP_ALIVE_MS`, `REDIS_CACHE_TTL`.
- Misc: `REDIS_DB`, `REDIS_ENABLE_TLS`, `DEBUG`.

## Helpful aliases (`.bash_aliases`)
Source the file or add to your shell. Common commands:
- `install` / `upgrade` / `uninstall`: Helm lifecycle for Redis/Sentinel release.
- `n-install` / `n-upgrade` / `n-uninstall`: Helm lifecycle with Nest enabled.
- `rollout` / `n-rollout`: Restart and watch Redis statefulset or Nest deployment.
- `docker-build`: Build the Nest API image locally (`nest-redis-sentinel:latest`).
- `bash0` / `bash1` / `bash2`: Shell into Sentinel containers on pods 0/1/2.
- `bashn`: Shell into the Nest API pod.
- `logs`: Tail Redis logs on all pods.
- `port`: Port-forward Redis/Sentinel services and each pod’s Sentinel port.
- `master`: Print current master host:port via Sentinel.
- `loop`: Continuously print the current master each second.
- `events`: Show the last ~100 Kubernetes events in the target namespace.
- `dry`: Helm dry-run (client-side) for the release.
- `test-read`: Curl the sample `GET /example/user/1` every second (expects API on localhost:3000).

## Deployment
- Helm chart: `helm-redis-sentinel`
- Nest image: multi-stage Node 24 build in `nest-redis-sentinel/Dockerfile` (includes redis-cli for diagnostics).
- Probes and ConfigMaps are wired with checksums; config changes trigger rollouts automatically.
