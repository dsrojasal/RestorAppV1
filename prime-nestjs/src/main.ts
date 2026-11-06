import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { crearValidadorOrigenes } from './common/cors-origin';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Security middleware
    app.use(helmet());

    // Detrás de un proxy inverso (Nginx/Caddy) se confía en X-Forwarded-For
    // para que el rate limiting use la IP real del cliente.
    if (process.env.TRUST_PROXY === 'true') {
      app.getHttpAdapter().getInstance().set('trust proxy', 1);
    }

    const allowedOrigins = configService.get<string[]>('allowedOrigins', ['http://localhost:3000']);
    app.enableCors({
      // Acepta los orígenes configurados y, además, localhost y rangos de red
      // privada en cualquier puerto. Así el sistema sigue funcionando cuando
      // se instala en otra máquina o cambia la IP del servidor.
      origin: crearValidadorOrigenes(allowedOrigins),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    // Errores de base de datos traducidos a respuestas claras (sin SQL ni detalles internos)
    app.useGlobalFilters(new DatabaseExceptionFilter());

    // Swagger - only enable in non-production environments
    if (configService.get('env') !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Prime Nestjs')
        .setDescription('Boilerplate for nestjs')
        .setVersion('2.0.0')
        .addBearerAuth()
        .addTag('api')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, document);
    }

    const port = configService.get('port', 3000);
    // HOST=127.0.0.1 en producción detrás del proxy: el backend deja de ser
    // accesible desde la red y solo el proxy puede hablar con él.
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    logger.log(`Application is running on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  } catch (error) {
    logger.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}

bootstrap();
