export async function track(name: string, props?: Record<string, unknown>) {
  // 1) Si en el futuro usas Plausible:
  // if (typeof window !== 'undefined' && (window as any).plausible) {
  //   (window as any).plausible(name, { props });
  //   return;
  // }

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    });
  } catch {
    // no bloquea UX
  }
}
