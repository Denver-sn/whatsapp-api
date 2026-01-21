import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Connect if not connected
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }

      // Ping Redis
      const pong = await this.redis.ping();

      if (pong !== 'PONG') {
        throw new Error(`Unexpected ping response: ${pong}`);
      }

      // Get Redis info
      const info = await this.redis.info('server');
      const versionMatch = info.match(/redis_version:(.+)/);
      const version = versionMatch ? versionMatch[1].trim() : 'unknown';

      return this.getStatus(key, true, {
        status: 'connected',
        version,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Redis health check failed: ${err.message}`);
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, {
          status: 'disconnected',
          error: err.message,
        }),
      );
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
