import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { MongoHealthIndicator } from './indicators/mongo.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { WhatsappHealthIndicator } from './indicators/whatsapp.health';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [MongoHealthIndicator, RedisHealthIndicator, WhatsappHealthIndicator],
})
export class HealthModule {}
