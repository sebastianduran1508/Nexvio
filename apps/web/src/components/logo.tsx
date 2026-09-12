import { cn } from '@/lib/utils';

/**
 * El símbolo de Nexvio: la letra N dibujada como una red de nodos.
 * Usa los tokens de marca (var(--primary) violeta, var(--coral) coral), así se
 * ve bien en claro y en oscuro sin cambiar nada.
 */
export function NexvioMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-8 w-8', className)}
      fill="none"
      role="img"
      aria-label="Nexvio"
    >
      <path
        d="M16 48 L16 16 L48 48 L48 16"
        stroke="var(--primary)"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle cx="16" cy="48" r="5.4" fill="var(--primary)" />
      <circle cx="16" cy="16" r="5.4" fill="var(--primary)" />
      <circle cx="32" cy="32" r="4.4" fill="var(--primary)" />
      <circle cx="48" cy="48" r="5.4" fill="var(--primary)" />
      <circle cx="48" cy="16" r="5.6" fill="var(--coral)" />
    </svg>
  );
}

/**
 * Logo completo = símbolo + wordmark "Nexvio" en Space Grotesk (font-heading).
 * Pon wordmark={false} si solo quieres el símbolo.
 */
export function Logo({
  className,
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <NexvioMark />
      {wordmark && (
        <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Nexvio
        </span>
      )}
    </span>
  );
}
