import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UserId } from './user-id.decorator';
import { OrgIdOpcional } from './org-id.decorator';

class ResolverUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;
}

class CambiarPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72) // tope de bcrypt
  password: string;
}

/**
 * Rutas de autenticación propias de Nexvio (Bloque 8.3).
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * PÚBLICA (sin token, a propósito): la app la llama ANTES de entrar para
   * traducir "JPGarcia" al correo con el que hablará con Supabase.
   */
  @Post('resolver-usuario')
  async resolver(@Body() dto: ResolverUsuarioDto) {
    return { email: await this.auth.correoDeUsuario(dto.username) };
  }

  /** Quién soy (lo pide la app al entrar, para saber si debe cambiar la clave). */
  @Get('yo')
  @UseGuards(AuthGuard)
  yo(@UserId() usuarioId: string, @OrgIdOpcional() orgId?: string) {
    return this.auth.yo(usuarioId, orgId);
  }

  /** Cambio de la contraseña temporal. Solo sobre la cuenta propia. */
  @Post('cambiar-password')
  @UseGuards(AuthGuard)
  cambiar(
    @UserId() usuarioId: string,
    @Body() dto: CambiarPasswordDto,
    @OrgIdOpcional() orgId?: string,
  ) {
    return this.auth.cambiarPassword(usuarioId, orgId, dto.password);
  }
}
