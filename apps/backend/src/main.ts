import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TenantContextMiddleware } from './auth/tenant-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de TODOS los cuerpos de petición contra sus DTOs.
  //  - whitelist: elimina campos que el DTO no declara (limpia datos basura).
  //  - forbidNonWhitelisted: si mandan un campo de más, responde 400.
  //  - transform: convierte el JSON en una instancia real del DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Middleware global: valida el JWT y fija el contexto de tenant en CADA petición.
  const tenantMiddleware = new TenantContextMiddleware();
  app.use(tenantMiddleware.use.bind(tenantMiddleware));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
