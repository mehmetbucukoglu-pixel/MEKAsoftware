import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KlinikApp API')
    .setDescription('Multi-tenant Klinik Yönetim Sistemi API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Parse port safely — Coolify may inject extra text into APP_PORT env var
  const rawPort = configService.get<string>('APP_PORT', '3000');
  const port = parseInt(String(rawPort), 10) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KlinikApp API running on http://0.0.0.0:${port}`);
  console.log(`📖 Swagger docs: http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
