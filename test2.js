const Redis = require("ioredis");

const redis = new Redis({
  name: "mymaster", // Sentinel master name
  sentinels: [{ host: "sentinel.default.svc.cluster.local", port: 26379 }],
  // Optional tuning:
  enableReadyCheck: true,
  showFriendlyErrorStack: true,

  lazyConnect: true,



  sentinelRetryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: (err) => {
    console.error("ReconnectOnError:", err);
    return true;
  },
});

redis.on("connect", () => {
  console.log("[ioredis] connect");
});

redis.on("ready", () => {
  console.log("[ioredis] ready (master resolved)");
});

redis.on("error", (err) => {
  console.error("[ioredis] error:", err);
});

redis.on("close", () => {
  console.log("[ioredis] close");
});

redis.on("reconnecting", (time) => {
  console.log("[ioredis] reconnecting in", time, "ms");
});

redis.on("end", () => {
  console.log("[ioredis] end");
});
