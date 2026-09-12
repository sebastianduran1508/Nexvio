"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Botón que alterna entre modo claro y oscuro.
 * - useTheme() de next-themes nos da el tema actual y una función para cambiarlo.
 * - resolvedTheme resuelve "system" al valor real (light/dark) según el SO.
 * - Los íconos se cruzan con la variante dark: en claro se ve la luna
 *   (para "irte a oscuro") y en oscuro el sol.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
