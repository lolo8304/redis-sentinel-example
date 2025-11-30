import { Module } from '@nestjs/common';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    RedisModule,
  ],
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
