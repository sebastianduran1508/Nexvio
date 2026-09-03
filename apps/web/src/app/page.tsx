import { redirect } from 'next/navigation';

/**
 * Página raíz: no muestra nada, solo redirige a /congresos.
 * Si el usuario no tiene sesión, /congresos lo mandará a /login.
 */
export default function Home() {
  redirect('/congresos');
}
