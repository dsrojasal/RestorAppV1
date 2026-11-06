import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'up';
  database: 'up';
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): { message: string } {
    return {
      message: 'Hello nestjs!',
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }

    return {
      status: 'up',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
