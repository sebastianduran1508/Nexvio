'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, API_URL } from '@/lib/supabase';

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
        <h1 className="text-2xl font-semibold text-zinc-900">Congresos</h1>
        <button
          onClick={cerrarSesion}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Cerrar sesión
        </button>
      </header>

      {cargando && <p className="text-zinc-500">Cargando…</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!cargando && !error && congresos.length === 0 && (
        <p className="text-zinc-500">Tu organización aún no tiene congresos.</p>
      )}

      <ul className="space-y-3">
        {congresos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/congresos/${c.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900">{c.nombre}</span>
                {c.estado && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {c.estado}
                  </span>
                )}
              </div>
              <span className="mt-1 block text-sm text-indigo-600">Moderar sesiones ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
