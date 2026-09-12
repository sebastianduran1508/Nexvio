'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, API_URL } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

// Forma de un congreso tal como lo devuelve la API.
type Congreso = {
  id: string;
  nombre: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  organizacion_id?: string;
};

/**
 * Página que lista los congresos de la organización del usuario.
 *
 * Flujo:
 *  1. Al montar, pide la sesión a supabase. Si no hay -> a /login.
 *  2. Con el token de la sesión, llama a GET /congresos del backend con la
 *     cabecera Authorization: Bearer <token>.
 *  3. El backend verifica el token, fija el tenant y el RLS filtra: solo llegan
 *     los congresos de ESA organización. Aquí solo los pintamos.
 */
export default function CongresosPage() {
  const router = useRouter();
  const [congresos, setCongresos] = useState<Congreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      // Sin sesión -> a login.
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/congresos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setCongresos(await res.json());
      } catch {
        setError('No se pudieron cargar los congresos');
      } finally {
        setCargando(false);
      }
    })();
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Congresos</h1>
        <Button variant="outline" size="sm" onClick={cerrarSesion}>
          Cerrar sesión
        </Button>
      </header>

      {cargando && <p className="text-muted-foreground">Cargando…</p>}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!cargando && !error && congresos.length === 0 && (
        <p className="text-muted-foreground">Tu organización aún no tiene congresos.</p>
      )}

      <ul className="space-y-3">
        {congresos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/congresos/${c.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-card-foreground">{c.nombre}</span>
                {c.estado && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {c.estado}
                  </span>
                )}
              </div>
              <span className="mt-1 block text-sm text-primary">Moderar sesiones ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
