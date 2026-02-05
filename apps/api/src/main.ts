import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validationExceptionFactory } from './common/validation-error.util';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { AppConfig } from './config/app-config.interface';
import { AppModule } from './app.module';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const logger = new Logger('Bootstrap');
const PREFIX = {
  info: '🚀',
  shutdown: '🛑',
  error: '❌',
};

async function bootstrap() {
  const possiblePaths = [
    join(process.cwd(), '.docker-status.txt'),
    join(process.cwd(), '..', '.docker-status.txt'),
    join(process.cwd(), '..', '..', '.docker-status.txt'),
  ];
  for (const statusPath of possiblePaths) {
    if (existsSync(statusPath)) {
      try {
        const message = readFileSync(statusPath, 'utf8').trim();
        if (message) logger.log(`${PREFIX.info} ${message}`);
        unlinkSync(statusPath);
      } catch {}
      break;
    }
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');
  const port = appConfig?.server.port ?? 4000;

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('KDS API')
    .setDescription('KDS API for order management')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const server = await app.listen(port);
  const shutdownTimeoutMs = 30_000;

  const gracefulShutdown = (signal: string) => {
    logger.log(
      `${PREFIX.shutdown} Received ${signal}, starting graceful shutdown...`,
    );
    server.close(() => {
      app
        .close()
        .then(() => {
          logger.log(`${PREFIX.shutdown} Application closed`);
          process.exit(0);
        })
        .catch((err) => {
          logger.error(
            `${PREFIX.error} Error during shutdown`,
            err?.stack ?? err,
          );
          process.exit(1);
        });
    });
    setTimeout(() => {
      logger.error(`${PREFIX.error} Forced shutdown after timeout`);
      process.exit(1);
    }, shutdownTimeoutMs).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  logger.log(
    `${PREFIX.info} Application is running on: http://localhost:${port}`,
  );
  logger.log(
    `${PREFIX.info} Swagger is running on: http://localhost:${port}/docs`,
  );
}
bootstrap().catch((err) => {
  logger.error(`${PREFIX.error} Bootstrap failed`, err?.stack ?? err);
  process.exit(1);
});
