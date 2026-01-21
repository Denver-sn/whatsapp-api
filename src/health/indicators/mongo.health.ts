import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongoHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(MongoHealthIndicator.name);

  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if connection is ready
      const isConnected = this.connection.readyState === 1;

      if (!isConnected) {
        throw new Error('MongoDB connection is not ready');
      }

      // Ping the database to verify connectivity
      await this.connection.db?.admin().ping();

      return this.getStatus(key, true, {
        status: 'connected',
        readyState: this.connection.readyState,
        host: this.connection.host,
        name: this.connection.name,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`MongoDB health check failed: ${err.message}`);
      throw new HealthCheckError(
        'MongoDB health check failed',
        this.getStatus(key, false, {
          status: 'disconnected',
          error: err.message,
          readyState: this.connection.readyState,
        }),
      );
    }
  }
}
