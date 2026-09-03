'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Sesion = { id: string; titulo: string; inicio: string; fin: string; sala?: string | null };
type CongresoDetalle = { id: string; nombre: string; sesiones: Sesion[] };

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Detalle de un congreso en el panel: sus sesiones. Cada una lleva a la pantalla
 * de moderacion en vivo (preguntas y encuestas).
 */
export default function CongresoDetallePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<CongresoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setDetalle(await apiFetch<CongresoDetalle>('GET', `/congresos/${params.id}`));
      } catch (e: any) {
        if (String(e.message).includes('401')) router.replace('/login');
        else setError('No se pudo cargar el congreso');
      }
    })();
  }, [params.id, router]);

  if (error) return <p className="p-8 text-red-700">{error}</p>;
  if (!detalle) return <p className="p-8 text-zinc-500">Cargando…</p>;

  return (
    <div className="mx-auto w-full max-w-2xl p-8">
      <Link href="/congresos" className="text-sm text-indigo-600">
        ‹ Congresos
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold text-zinc-900">{detalle.nombre}</h1>

      <h2 className="mb-3 text-lg font-medium text-zinc-800">Sesiones</h2>
      {detalle.sesiones.length === 0 ? (
        <p className="text-zinc-500">Este congreso aún no tiene sesiones.</p>
      ) : (
        <ul className="space-y-3">
          {detalle.sesiones.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sesiones/${s.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow"
              >
                <span className="text-sm text-indigo-600">
                  {hora(s.inicio)} - {hora(s.fin)}
                  {s.sala ? `  ·  ${s.sala}` : ''}
                </span>
                <p className="font-medium text-zinc-900">{s.titulo}</p>
                <span className="mt-1 block text-sm text-indigo-600">
                  Moderar en vivo ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
