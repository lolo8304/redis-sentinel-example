// src/redis/redis.service.ts
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from "@nestjs/common";
import { Redis as RedisClient } from "ioredis";
import { REDIS_CLIENTS } from "./redis.constants";

@Injectable()
export class RedisService implements OnApplicationShutdown {
  readonly logger = new Logger();
  clientMaster: RedisClient;
  client: RedisClient;
  constructor(
    @Inject(REDIS_CLIENTS)
    clients: RedisClient[]
  ) {
    this.clientMaster = clients[0];
    this.client = clients[1];
  }

  get raw(): RedisClient {
    return this.client;
  }

  get rawMaster(): RedisClient {
    return this.clientMaster;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number
  ): Promise<"OK" | null> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.clientMaster.set(key, value, "EX", ttlSeconds);
    }
    return this.clientMaster.set(key, value);
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.clientMaster.del(...key);
    }
    return this.clientMaster.del(key);
  }

  /*
  async onApplicationShutdown(signal?: string) {
    console.log("[redis] shutting down", signal || "");
    try {
      // quit waits for pending replies; nicer than disconnect()
      await this.client.quit();
    } catch (e) {
      // in case Redis is already gone
      this.client.disconnect();
    }
  }
  */
  onApplicationShutdown(signal?: string) {
    this.logger.log("[redis] shutting down " + (signal || ""));
  }
}
