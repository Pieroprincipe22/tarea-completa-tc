import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TenantGuard } from './common/tenant.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // pipes / cors / etc
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 👇 acá va tu guard global (antes de listen)
  app.useGlobalGuards(app.get(TenantGuard));

  await app.listen(process.env.PORT || 3002);
}
bootstrap();