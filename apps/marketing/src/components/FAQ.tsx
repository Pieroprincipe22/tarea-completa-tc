const faqs = [
  {
    q: '¿Qué incluye la prueba de 7 días?',
    a: 'Acceso a las funciones del MVP para validar el flujo: plantillas, reportes y órdenes de trabajo.',
  },
  {
    q: '¿Necesito tarjeta para empezar?',
    a: 'Para el MVP puedes iniciar sin tarjeta. Cuando integremos suscripción, podrás elegir plan al finalizar el trial.',
  },
  {
    q: '¿Mis datos quedan aislados por empresa?',
    a: 'Sí. El backend es multi-tenant y aplica filtros por companyId para evitar fugas de datos.',
  },
];

export function FAQ() {
  return (
    <div className="space-y-4">
      {faqs.map((f) => (
        <div
          key={f.q}
          className="rounded-2xl border border-neutral-200 bg-white p-5"
        >
          <div className="text-sm font-semibold">{f.q}</div>
          <div className="mt-2 text-sm text-neutral-600">{f.a}</div>
        </div>
      ))}
    </div>
  );
}
