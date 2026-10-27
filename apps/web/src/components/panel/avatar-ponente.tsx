import { cn } from '@/lib/utils';

/**
 * Foto del ponente o, si no tiene, sus iniciales sobre un fondo suave.
 * Se usa en Speakers, en la Agenda y en el detalle del congreso.
 */
export function AvatarPonente({
  nombre,
  fotoUrl,
  className,
}: {
  nombre: string;
  fotoUrl?: string | null;
  className?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt="" className={cn('h-12 w-12 shrink-0 rounded-xl object-cover', className)} />
    );
  }
  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-primary',
        className,
      )}
    >
      {iniciales(nombre)}
    </div>
  );
}

/** "Dra. Ana Ríos" -> "AR" (sin contar el título). */
export function iniciales(nombre: string): string {
  const partes = nombre.replace(/^(dr|dra)\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return ((partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

/** "CO" -> 🇨🇴, con los "regional indicators" de Unicode. */
export function bandera(codigo?: string | null): string {
  if (!codigo || codigo.length !== 2) return '';
  const base = 0x1f1e6 - 65;
  const c = codigo.toUpperCase();
  return String.fromCodePoint(base + c.charCodeAt(0), base + c.charCodeAt(1));
}
