import { expect, test } from '@playwright/test'
import { mockAdminApi } from './helpers/mockApi'

/**
 * [NX-S2.08] Vista de usuario activo en el menú lateral
 * [NX-S1.15] Interfaz de visualización de ocupación en tiempo real
 */
test.describe('Dashboard admin', () => {
  // ── S2.08 ──────────────────────────────────────────────────────────────────

  test('muestra el nombre del usuario en el saludo del dashboard', async ({ page }) => {
    await mockAdminApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Carlos Admin')).toBeVisible({ timeout: 10000 })
  })

  test('muestra "Bienvenido/a" en el saludo', async ({ page }) => {
    await mockAdminApi(page)
    await page.goto('/dashboard')
    await expect(page.getByText(/Bienvenido\/a/)).toBeVisible({ timeout: 10000 })
  })

  // ── S1.15 ──────────────────────────────────────────────────────────────────

  test('muestra el porcentaje de ocupación correcto en la métrica Habitaciones', async ({ page }) => {
    // 4+2=6 plazas totales, 2+2=4 ocupadas → 67%
    await mockAdminApi(page, {
      bedrooms: [
        { id: 1, numero: '101', edificio: 'A', planta: 1, tipo: 'Doble', capacidad_maxima: 4, ocupantes_actuales: 2, is_active: true, residentes: [] },
        { id: 2, numero: '102', edificio: 'A', planta: 1, tipo: 'Doble', capacidad_maxima: 2, ocupantes_actuales: 2, is_active: true, residentes: [] },
      ],
    })
    await page.goto('/dashboard')
    await expect(page.getByText('67%')).toBeVisible({ timeout: 10000 })
  })

  test('muestra 0% cuando todas las habitaciones están libres', async ({ page }) => {
    await mockAdminApi(page, {
      bedrooms: [
        { id: 1, numero: '101', edificio: 'A', planta: 1, tipo: 'Doble', capacidad_maxima: 2, ocupantes_actuales: 0, is_active: true, residentes: [] },
      ],
    })
    await page.goto('/dashboard')
    await expect(page.getByText('0%')).toBeVisible({ timeout: 10000 })
  })

  test('muestra "—" cuando el servicio de habitaciones falla', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me/') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 1, roles: ['residence_admin'], first_name: 'Carlos', last_name: 'Admin', email: 'c@test.com' } }) })
      } else if (path === '/api/bedrooms/') {
        await route.fulfill({ status: 500, body: '' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })
    await page.goto('/dashboard')
    await expect(page.getByText('—')).toBeVisible({ timeout: 10000 })
  })
})
