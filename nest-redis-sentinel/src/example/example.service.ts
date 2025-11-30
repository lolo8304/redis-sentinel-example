// src/example/example.service.ts
import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class ExampleService {
  ttl: number;
  constructor(private readonly redis: RedisService) {
    this.ttl = process.env.REDIS_CACHE_TTL
      ? parseInt(process.env.REDIS_CACHE_TTL, 10)
      : 60; // default 1 hour
  }

  async cacheUser(userId: string, payload: unknown) {
    await this.redis.set(
      `user:${userId}`,
      JSON.stringify(payload),
      this.ttl // TTL seconds
    );
  }

  async getCachedUser(userId: string) {
    const v = await this.redis.get(`user:${userId}`);
    return v ? JSON.parse(v) : null;
  }
}
