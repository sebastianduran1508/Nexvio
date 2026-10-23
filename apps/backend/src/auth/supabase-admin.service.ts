import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Habla con la Admin API de Supabase Auth (rutas /auth/v1/admin/*).
 *
 * Usa la clave SECRETA `service_role` (SUPABASE_SERVICE_ROLE_KEY), que tiene
 * privilegios totales sobre Auth. Por eso este service vive SOLO en el backend
 * y esa clave NUNCA debe salir al frontend.
 *
 * Sirve para crear cuentas de login "a mano" (ya confirmadas, listas para entrar)
 * durante el alta de una organización o el seed del admin global.
 */
@Injectable()
export class SupabaseAdminService {
  private readonly url = process.env.SUPABASE_URL;
  private readonly serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private headers() {
    if (!this.serviceKey) {
      throw new InternalServerErrorException(
        'Falta SUPABASE_SERVICE_ROLE_KEY en el .env',
      );
    }
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crea una cuenta de login y devuelve su id (que usaremos como usuario.id).
   * email_confirm: true -> queda confirmada de inmediato (puede loguearse ya).
   */
  async crearUsuario(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Supabase responde 422 si el correo ya está registrado.
      const msg = (data?.msg || data?.error_description || '').toLowerCase();
      if (res.status === 422 || msg.includes('already')) {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw new InternalServerErrorException(
        'No se pudo crear la cuenta en Supabase Auth',
      );
    }

    // La respuesta trae el usuario en la raíz (id) o dentro de { user }.
    const id = data?.id ?? data?.user?.id;
    if (!id) {
      throw new InternalServerErrorException(
        'Supabase no devolvió el id del usuario creado',
      );
    }
    return id;
  }

  /**
   * Borra una cuenta de Auth. Se usa como "compensación": si el guardado en la
   * base falla tras haber creado la cuenta, la eliminamos para no dejar huérfanos.
   */
  async borrarUsuario(id: string): Promise<void> {
    await fetch(`${this.url}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }

  /**
   * Cambia el correo de una cuenta (Bloque 8.3).
   *
   * Hace falta porque el correo es con lo que la persona inicia sesión: si solo
   * lo corrigiéramos en nuestra tabla, el login seguiría pidiendo el viejo y
   * nadie entendería por qué. `email_confirm: true` evita que Supabase mande un
   * correo de verificación al nuevo (muchos de los nuestros son sintéticos y no
   * existen).
   */
  async cambiarEmail(id: string, email: string): Promise<void> {
    const res = await fetch(`${this.url}/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ email, email_confirm: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data?.msg || data?.error_description || '').toLowerCase();
      if (res.status === 422 || msg.includes('already')) {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw new InternalServerErrorException(
        'No se pudo actualizar el correo en Supabase Auth',
      );
    }
  }

  /**
   * Reemplaza la contraseña de una cuenta (Bloque 8.3).
   *
   * Se usa cuando el asistente cambia su contraseña temporal en el primer
   * ingreso. Va por la Admin API y no por supabase.auth.updateUser() del
   * cliente porque así el backend es el único que decide cuándo se cambia, y
   * puede apagar `debe_cambiar_password` en la MISMA operación.
   */
  async cambiarPassword(id: string, password: string): Promise<void> {
    const res = await fetch(`${this.url}/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(
        'No se pudo actualizar la contraseña en Supabase Auth',
      );
    }
  }
}
