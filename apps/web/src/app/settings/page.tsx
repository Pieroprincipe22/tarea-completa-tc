import { redirect } from 'next/navigation';

// De momento Configuración solo tiene la sección de Empresa.
export default function SettingsPage() {
  redirect('/settings/company');
}