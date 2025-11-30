// src/redis/redis.module.ts
import { DynamicModule, Global, Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis, { Redis as RedisClient, RedisOptions } from "ioredis";

import { RedisService } from "./redis.service";
import { REDIS_CLIENTS } from "./redis.constants";

@Global()
@Module({})
export class RedisModule {
  static readonly logger = new Logger("RedisModule");
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_CLIENTS,
          useFactory: async (config: ConfigService): Promise<RedisClient[]> => {
            RedisModule.logger.log(
              "[redis] initializing Redis Sentinel client... v 1.1.0"
            );
            const password = config.get<string>("REDIS_PASSWORD", "");
            const sentinelPassword = config.get<string>(
              "REDIS_SENTINEL_PASSWORD",
              ""
            );
            const masterSet = config.get<string>(
              "REDIS_SENTINEL_MASTER_SET",
              "mymaster"
            );
            const db = Number(config.get<string>("REDIS_DB", "0"));

            const hostsRaw = config.get<string>(
              "REDIS_SENTINEL_HOSTS",
              "sentinel:26379"
            );
            const sentinels = hostsRaw.split(",").map((h) => {
              const [host, portStr] = h.trim().split(":");
              return { host, port: Number(portStr || 26379) };
            });
            const enableTls =
              config.get<string>("REDIS_ENABLE_TLS", "false") === "true";
            const lazyConnect =
              config.get<string>("REDIS_LAZY_CONNECT", "false") === "true";
            const enableReadyCheck =
              config.get<string>("REDIS_ENABLE_READY_CHECK", "true") === "true";
            const enableRetryStrategy =
              config.get<string>("REDIS_RETRY_STRATEGY", "true") === "true";
            const enableSentinelRetryStrategy =
              config.get<string>("REDIS_SENTINEL_RETRY_STRATEGY", "true") ===
              "true";
            const enableAutoPipelining =
              config.get<string>("REDIS_ENABLE_AUTO_PIPELINING", "true") ===
              "true";
            const enableFailoverDetector =
              config.get<string>("REDIS_FAILOVER_DETECTOR", "true") === "true";
            const enableAutoResubscribe =
              config.get<string>("REDIS_AUTO_RESUBSCRIBE", "true") === "true";
            const enableFriendlyErrorStack =
              config.get<string>("REDIS_SHOW_FRIENDLY_ERROR_STACK", "true") ===
              "true";
            const enableOfflineQueue =
              config.get<string>("REDIS_ENABLE_OFFLINE_QUEUE", "true") ===
              "true";
            const connectTimeoutMs = Number(
              config.get<string>("REDIS_CONNECT_TIMEOUT_MS", "10000")
            );
            let maxRetriesRaw: string | null = config.get<string>(
              "REDIS_MAX_RETRIES_PER_REQUEST",
              "5"
            );
            if (maxRetriesRaw === "null") {
              maxRetriesRaw = null;
            }
            const maxRetriesPerRequest =
              maxRetriesRaw === "null" ? null : Number(maxRetriesRaw);
            const keepAliveMs = Number(
              config.get<string>("REDIS_KEEP_ALIVE_MS", "30000")
            );

            const options: RedisOptions = {
              sentinels,
              name: masterSet,

              // Auth
              password,
              sentinelPassword,

              // DB selection
              db,

              // Connection behavior
              lazyConnect,
              enableReadyCheck,
              connectTimeout: connectTimeoutMs, // ms

              enableAutoPipelining,
              failoverDetector: enableFailoverDetector,
              autoResubscribe: enableAutoResubscribe,

              showFriendlyErrorStack: enableFriendlyErrorStack,

              // Let commands wait in offline queue while we reconnect (good for failover)
              // If you prefer to fail fast, set this to false + maxRetriesPerRequest small.
              enableOfflineQueue,

              // When certain errors happen, force reconnect (and optionally re-send command)
              reconnectOnError: (err) => {
                const msg = (err?.message || "").toLowerCase();
                RedisModule.logger.warn("[redis] reconnectOnError check:", msg);

                // Classic during failover / wrong master
                if (msg.includes("readonly")) {
                  // reconnect and re-send command (see docs on returning 2):contentReference[oaicite:8]{index=8}
                  return 2;
                }

                // Transient routing / cluster-ish errors (if any)
                if (
                  msg.includes("moved") ||
                  msg.includes("clusterdown") ||
                  msg.includes("tryagain") ||
                  msg.includes("connection is closed")
                ) {
                  return true;
                }

                return false;
              },

              // If you want truly “wait forever until Redis is back”, set to null.
              // Be careful: this can make callers wait a long time.
              maxRetriesPerRequest, // number or null

              // Keep TCP alive to avoid idle disconnects in some environments
              keepAlive: keepAliveMs,

              // TLS if you front Redis with TLS (not typical inside cluster)
              ...(enableTls ? { tls: { rejectUnauthorized: false } } : {}),
              ...(enableTls
                ? { sentinelTLS: { rejectUnauthorized: false } }
                : {}),
            };

            if (enableRetryStrategy) {
              options.retryStrategy = (times) => {
                RedisModule.logger.warn(
                  `[redis] retryStrategy attempt #${times}`
                );
                return Math.min(times * 50, 2000);
              };
            }

            if (enableSentinelRetryStrategy) {
              options.sentinelRetryStrategy = (retryAttempts) => {
                RedisModule.logger.warn(
                  `[redis] sentinelRetryStrategy attempt #${retryAttempts}`
                );
                return Math.min(retryAttempts * 100, 5000);
              };
            }

            const clientMaster = new Redis({
              ...options,
              role: "master",
              readOnly: false,
            });
            const clientReplica = new Redis({
              ...options,
              readOnly: true,
            });
            const onConnect = () => {
              RedisModule.logger.log("[redis] connected");
            };
            clientMaster.on("connect", onConnect);
            clientReplica.on("connect", onConnect);

            const onReady = () => {
              RedisModule.logger.log(
                "[redis] ready (sentinel master resolved)"
              );
            };
            clientMaster.on("ready", onReady);
            clientReplica.on("ready", onReady);

            const onReconnecting = () => {
              RedisModule.logger.warn(`[redis] reconnecting...`);
            };
            clientMaster.on("reconnecting", onReconnecting);
            clientReplica.on("reconnecting", onReconnecting);

            const onError = (err: Error) => {
              RedisModule.logger.error("[redis] error", err);
            };
            clientMaster.on("error", onError);
            clientReplica.on("error", onError);

            const onEnd = () => {
              RedisModule.logger.warn(
                "[redis] connection closed - no more reconnections"
              );
            };
            clientMaster.on("end", onEnd);
            clientReplica.on("end", onEnd);

            // Actually establish the connection before we mark app as ready
            RedisModule.logger.log(
              `[redis] connecting to sentinel master... ${JSON.stringify(
                sentinels
              )}`
            );
            if (lazyConnect) {
              await clientMaster.connect();
              await clientReplica.connect();
            } else {
              // Already connecting in constructor; wait for first ready/error
              await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                  clientMaster.off("ready", onReady);
                  clientMaster.off("error", onError);

                  clientReplica.off("ready", onReady);
                  clientReplica.off("error", onError);
                };
                const onReady = () => {
                  cleanup();
                  resolve();
                };
                const onError = (err: Error) => {
                  cleanup();
                  reject(err);
                };
                clientMaster.once("ready", onReady);
                clientReplica.once("ready", onReady);

                clientMaster.once("error", onError);
                clientReplica.once("error", onError);
              });
            }
            RedisModule.logger.log(
              `[redis] options: ${JSON.stringify(options)}`
            );

            return [clientMaster, clientReplica];
          },
          inject: [ConfigService],
        },
        RedisService,
      ],
      exports: [REDIS_CLIENTS, RedisService],
    };
  }
}
