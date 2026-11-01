// Rutas que se ven sin sesión y sin el marco de la app (barra lateral, cabecera).
export const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
