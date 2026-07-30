import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantContextMiddleware } from './auth/tenant-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middleware global: valida el JWT y fija el contexto de tenant en CADA petición.
  const tenantMiddleware = new TenantContextMiddleware();
  app.use(tenantMiddleware.use.bind(tenantMiddleware));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
