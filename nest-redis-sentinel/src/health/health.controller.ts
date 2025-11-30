// src/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from "@nestjs/terminus";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisService: RedisService
  ) {}

  @Get("redis")
  //@HealthCheck()
  async checkRedis(): Promise<HealthCheckResult> {
    // Simple but effective: PING and verify answer = PONG
    return this.health.check([
      async () => {
        const client = this.redisService.raw;
        try {
          const start = Date.now();
          const res = await client.ping();
          const latency = Date.now() - start;

          if (res !== "PONG") {
            throw new Error(`Unexpected PING response: ${res}`);
          }

          // Small latency guard (optional)
          if (latency > 500) {
            return {
              redis: {
                status: "up",
                ping: res,
                message: `High latency detected - ${latency}ms. Maybe a rollout is in progress?`,
                latency,
              },
            };
          }

          const role = await client.call("ROLE");
          // ROLE returns: ['master', replication_offset, [replica info...]]
          const isMaster =
            role && Array.isArray(role) && role.includes("master");
          if (!isMaster) {
            return {
              redis: {
                status: "up",
                message: "Connected to replica, not master",
              },
            };
          }

          return {
            redis: {
              status: "up",
              ping: res,
              latency,
            },
          };
        } catch (err: any) {
          return {
            redis: {
              status: "down",
              message: err?.message ?? "Unknown error",
            },
          };
        }
      },
    ]);
  }
}
