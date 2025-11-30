#!/usr/bin/env bash

# Redis Sentinel helpers: uses env from nest-redis-sentinel/.env for password and other values.
_rs_init_paths() {
  if [ -z "${REDIS_SENTINEL_ROOT:-}" ]; then
    REDIS_SENTINEL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  fi
  : "${REDIS_SENTINEL_ENV:=${REDIS_SENTINEL_ROOT}/nest-redis-sentinel/.env}"
  : "${REDIS_SENTINEL_RELEASE:=my-redis}"
  : "${REDIS_REDIS_SVC:=redis}"
  : "${REDIS_SENTINEL_SVC:=sentinel}"
  : "${REDIS_SENTINEL_NS:=default}"
  : "${REDIS_LOCAL_PORT:=6380}"
  : "${REDIS_SENTINEL_LOCAL_PORT:=26379}"
  : "${REDIS_SENTINEL_MASTER_SET:=mymaster}"
  : "${REDIS_SENTINEL_SERVICE_PORT:=26379}"
}

_rs_load_env() {
  _rs_init_paths
  if [ -f "$REDIS_SENTINEL_ENV" ]; then
    set -o allexport
    # shellcheck disable=SC1090
    source "$REDIS_SENTINEL_ENV"
    set +o allexport
  else
    echo "Warning: missing env file at $REDIS_SENTINEL_ENV" >&2
  fi
}

_rs_pod_base() {
  echo "${REDIS_SENTINEL_RELEASE}-redis-sentinel-redis"
}

alias docker-build='(cd "$(dirname "${BASH_SOURCE[0]}")/nest-redis-sentinel" && docker build -t nest-redis-sentinel:latest .)'
alias install='(_rs_load_env; helm upgrade --install "$REDIS_SENTINEL_RELEASE" ./helm-redis-sentinel -n "$REDIS_SENTINEL_NS" --create-namespace --set redis.password="${REDIS_PASSWORD:-}")'
alias upgrade='(_rs_load_env; kubectl delete --ignore-not-found=true cm -n "$REDIS_SENTINEL_NS" my-redis-redis-sentinel-api; helm upgrade "$REDIS_SENTINEL_RELEASE" ./helm-redis-sentinel -n "$REDIS_SENTINEL_NS" --set redis.password="${REDIS_PASSWORD:-}")'
alias uninstall='(_rs_init_paths; helm uninstall "$REDIS_SENTINEL_RELEASE" -n "$REDIS_SENTINEL_NS")'
alias rollout='(_rs_load_env; sts="$(_rs_pod_base)"; kubectl -n "$REDIS_SENTINEL_NS" rollout restart statefulset/"$sts" && kubectl -n "$REDIS_SENTINEL_NS" rollout status statefulset/"$sts")'
alias dry='(_rs_load_env; helm upgrade --install "$REDIS_SENTINEL_RELEASE" ./helm-redis-sentinel -n "$REDIS_SENTINEL_NS" --set redis.password="${REDIS_PASSWORD:-}" --dry-run=client --debug)'
alias bashn='(_rs_load_env; pod=$(kubectl -n "$REDIS_SENTINEL_NS" get pod -l app.kubernetes.io/name=redis-sentinel-api,app.kubernetes.io/instance="$REDIS_SENTINEL_RELEASE" -o jsonpath="{.items[0].metadata.name}"); kubectl -n "$REDIS_SENTINEL_NS" exec -it "$pod" -c nest-api -- /bin/sh)'
alias events='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" get events --sort-by=.lastTimestamp | tail -n 101)'

alias node0-info='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-0" -c redis -- redis-cli -a "$REDIS_PASSWORD" INFO replication)'
alias node1-info='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-1" -c redis -- redis-cli -a "$REDIS_PASSWORD" INFO replication)'
alias node2-info='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-2" -c redis -- redis-cli -a "$REDIS_PASSWORD" INFO replication)'
alias bash0='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-0" -c sentinel -- /bin/bash)'
alias bash1='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-1" -c sentinel -- /bin/bash)'
alias bash2='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" exec -it "$(_rs_pod_base)-2" -c sentinel -- /bin/bash)'
alias logs='(_rs_load_env; pids=""; tail_lines="${LOGS_TAIL:-200}"; for i in 0 1 2; do kubectl -n "$REDIS_SENTINEL_NS" logs -f --tail="$tail_lines" "$(_rs_pod_base)-$i" -c redis & pids="$pids $!"; done; trap "kill $pids 2>/dev/null" INT TERM EXIT; wait)'
alias port='(_rs_load_env; kubectl -n "$REDIS_SENTINEL_NS" port-forward svc/"${REDIS_REDIS_SVC}" "${REDIS_LOCAL_PORT:-6380}:6379" & kubectl -n "$REDIS_SENTINEL_NS" port-forward svc/"${REDIS_SENTINEL_SVC}" "${REDIS_SENTINEL_LOCAL_PORT:-26380}:26379" & kubectl -n "$REDIS_SENTINEL_NS" port-forward pod/"$(_rs_pod_base)-0" "26381:26379" & kubectl -n "$REDIS_SENTINEL_NS" port-forward pod/"$(_rs_pod_base)-1" "26382:26379" & kubectl -n "$REDIS_SENTINEL_NS" port-forward pod/"$(_rs_pod_base)-2" "26383:26379" & wait)'
alias master='(_rs_load_env; line=$(redis-cli -p "${REDIS_SENTINEL_LOCAL_PORT:-26379}" SENTINEL get-master-addr-by-name "${REDIS_SENTINEL_MASTER_SET:-mymaster}");host=$(echo "$line" | head -n 1); port=$(echo "$line" | tail -n 1); echo "$host:$port")'
alias loop='(_rs_load_env; while true; do echo "$(date): Master: $(master)"; sleep 1; done)'

alias write='curl -XPOST http://localhost:8080/example/user/42 -H "Content-Type: application/json" -d "{\"name\":\"Lolo\"}"'
alias writeRnd='r=$((RANDOM % 30)); echo -n "$(date): "; curl -XPOST http://localhost:8080/example/user/$r -H "Content-Type: application/json" -d "{\"id\":\"$r\",\"name\":\"Lolo\"}";echo ""'
alias read='curl -XGET -s http://localhost:8080/example/user/42'
alias test-read='while true; do echo "$(date): $(read)"; sleep 1; done'
alias test-writeRnd='while true; do writeRnd; sleep 1; done'
alias build-and-upgrade='docker-build && upgrade'
alias health='curl -s http://localhost:8080/health/redis'
alias test-health='while true; do echo "$(date): $(health)"; sleep 1; done'