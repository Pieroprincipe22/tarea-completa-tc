import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TenantGuard } from './common/tenant.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3003'],
    credentials: true,
    allowedHeaders: ['content-type', 'x-company-id', 'x-user-id', 'x-admin-key'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalGuards(app.get(TenantGuard));

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
}

void bootstrap();