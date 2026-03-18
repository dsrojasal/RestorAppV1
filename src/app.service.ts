import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string } {
    return {
      message: 'Hello Carqa de nalga!',
    };
  }

  healthCheck(): { message: string } {
    return {
      message: 'up',
    };
  }
}
