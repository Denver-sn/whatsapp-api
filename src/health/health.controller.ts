import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { MongoHealthIndicator } from './indicators/mongo.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { WhatsappHealthIndicator } from './indicators/whatsapp.health';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Health checks should not be rate limited
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private mongo: MongoHealthIndicator,
    private redis: RedisHealthIndicator,
    private whatsapp: WhatsappHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  check() {
    return this.health.check([
      // Check MongoDB connection
      () => this.mongo.isHealthy('mongodb'),
      // Check Redis connection
      () => this.redis.isHealthy('redis'),
      // Check memory usage (heap should be under 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe - is the app running?' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  liveness() {
    return this.health.check([
      // Basic liveness - just check memory
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - is the app ready to serve traffic?' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  readiness() {
    return this.health.check([
      // Check all dependencies
      () => this.mongo.isHealthy('mongodb'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check with all indicators' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  detailed() {
    return this.health.check([
      // Database
      () => this.mongo.isHealthy('mongodb'),
      // Cache/Queue
      () => this.redis.isHealthy('redis'),
      // External API
      () => this.whatsapp.isHealthy('whatsapp_api'),
      // Memory
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
      // Disk (check root partition has at least 10% free)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
