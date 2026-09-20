import { expect, test } from '@playwright/test';

// Flujo crítico de plataforma: el super-admin da de alta una empresa nueva
// desde el panel, le crea un usuario admin, y ese admin puede iniciar
// sesión y llega al panel normal (no al de plataforma). Esto es justo el
// "daremos de alta a todos desde ahí" que motivó la Fase 1.

const SUPERADMIN_EMAIL = process.env.E2E_SUPERADMIN_EMAIL ?? 'superadmin@tc.local';
const SUPERADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? 'SuperAdmin#2026';

function uniqueSuffix(): string {
  return Date.now().toString(36);
}

test.describe('Onboarding de plataforma (super-admin)', () => {
  test('login de super-admin no muestra el sidebar de la app', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Iniciar sesión')).toBeVisible();
    // El bug que arreglamos: /login no debe traer el shell del panel.
    await expect(page.getByRole('link', { name: /panel principal/i })).toHaveCount(0);
  });

  test('el super-admin puede dar de alta una empresa y un usuario, y ese usuario puede entrar', async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const companyName = `E2E Hotel ${suffix}`;
    const adminEmail = `e2e-admin-${suffix}@tc-mantenimiento.test`;
    const adminPassword = 'TestAdmin123';

    // 1) Login como super-admin.
    await page.goto('/login');
    await page.getByPlaceholder('nombre@empresa.com').fill(SUPERADMIN_EMAIL);
    await page.getByPlaceholder('••••••••').fill(SUPERADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();

    // 2) Dar de alta una empresa nueva con su admin.
    await page.getByRole('button', { name: '+ Nueva empresa' }).click();
    await page.getByPlaceholder('Hotel Miramar').fill(companyName);
    await page.getByPlaceholder('admin@empresa.com').fill(adminEmail);
    await page.getByPlaceholder('••••••••').last().fill(adminPassword);
    await page.getByRole('button', { name: 'Crear empresa' }).click();

    await expect(page.getByText(`Empresa "${companyName}" creada`)).toBeVisible();
    await expect(page.getByRole('cell', { name: companyName })).toBeVisible();

    // 3) Cerrar sesión de super-admin y entrar como el admin recién creado.
    // La sesión vive en sessionStorage (writeTcSession en lib/tc/session.ts),
    // no en localStorage — solo usa localStorage como fallback legacy.
    await page.evaluate(() => {
      window.sessionStorage.clear();
      window.localStorage.clear();
    });
    await page.goto('/login');
    await page.getByPlaceholder('nombre@empresa.com').fill(adminEmail);
    await page.getByPlaceholder('••••••••').fill(adminPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // El admin de una empresa normal cae en el panel normal, no en /super-admin.
    await expect(page).not.toHaveURL(/\/super-admin/);
    await expect(page.getByRole('heading', { name: 'Panel principal' })).toBeVisible();
  });
});
