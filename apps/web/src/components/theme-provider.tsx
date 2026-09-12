"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Envoltorio de next-themes. Vive en un archivo "use client" propio porque
 * el layout es un componente de servidor y el provider necesita ejecutarse
 * en el navegador (guarda la preferencia y pone la clase .dark en <html>).
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
