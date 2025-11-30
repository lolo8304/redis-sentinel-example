import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ExampleService } from "./example.service";

@Controller("example")
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post("user/:id")
  async cacheUser(@Param("id") userId: string, @Body() payload: unknown) {
    const start = Date.now();
    await this.exampleService.cacheUser(userId, payload);
    const took = Date.now() - start;
    return { id: userId, status: "ok", took: `${took}ms` };
  }

  @Get("user/:id")
  async getCachedUser(@Param("id") userId: string) {
    const start = Date.now();
    const user = await this.exampleService.getCachedUser(userId);
    const took = Date.now() - start;
    return { user, took: `${took}ms` };
  }
}
