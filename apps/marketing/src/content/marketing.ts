export const marketing = {
  nav: [
    { label: "Producto", href: "#producto" },
    { label: "Casos", href: "#casos" },
    { label: "Precios", href: "#precios" },
    { label: "FAQ", href: "#faq" },
  ],
  hero: {
    title: "Mantenimiento ordenado. Evidencia clara. Reportes listos.",
    subtitle:
      "Gestiona órdenes, checklists, fotos, firmas y PDFs en un solo lugar. Multiempresa, multisede y trazabilidad completa.",
    primaryCta: { label: "Pedir demo", href: "#demo" },
    secondaryCta: { label: "Ver cómo funciona", href: "#producto" },
    note: "Ideal para pymes con técnicos en campo.",
  },
  features: [
    { title: "Órdenes de trabajo", desc: "Crea, asigna y sigue el estado de cada visita." },
    { title: "Plantillas de checklist", desc: "Estandariza inspecciones y mantenimientos." },
    { title: "Fotos y evidencia", desc: "Adjunta fotos por ítem y por visita." },
    { title: "Firmas en campo", desc: "Cierre con firma del cliente y del técnico." },
    { title: "PDF automático", desc: "Genera reportes claros para enviar al cliente." },
    { title: "Multiempresa", desc: "Separación por compañía, roles y auditoría." },
  ],
  howItWorks: [
    { title: "Crea la orden", desc: "Selecciona cliente, sitio y plantilla." },
    { title: "Ejecuta en campo", desc: "Checklist + fotos + comentarios + firma." },
    { title: "Cierra y envía", desc: "PDF listo y trazabilidad guardada." },
  ],
  pricing: [
    {
      name: "Starter",
      price: "$19",
      period: "/mes",
      features: ["1 empresa", "Hasta 3 técnicos", "PDF y fotos", "Soporte email"],
      cta: "Empezar",
    },
    {
      name: "Pro",
      price: "$49",
      period: "/mes",
      highlight: true,
      features: ["Multi-sede", "Hasta 15 técnicos", "Roles", "Plantillas avanzadas"],
      cta: "Pedir demo",
    },
    {
      name: "Enterprise",
      price: "A medida",
      period: "",
      features: ["SLA", "SSO (opcional)", "Integraciones", "Soporte prioritario"],
      cta: "Hablemos",
    },
  ],
  faqs: [
    { q: "¿Funciona para multiempresa?", a: "Sí, con separación por tenant y roles." },
    { q: "¿Genera PDF automáticamente?", a: "Sí, al cierre de la orden o reporte." },
    { q: "¿Se puede usar desde el móvil?", a: "Sí, pensado para técnicos en campo." },
    { q: "¿Tienen modo offline?", a: "MVP con borradores y cola de envío (offline parcial)." },
  ],
  footer: {
    product: ["Órdenes", "Checklists", "Reportes PDF", "Evidencia"],
    company: ["Privacidad", "Términos"],
    contactEmail: "contacto@tu-dominio.com",
  },
} as const;