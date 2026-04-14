import { expect, test } from '@playwright/test'
import {
  MOCK_PACKAGE_ANALYTICS,
  mockAdminApi,
} from './helpers/mockApi'

/**
 * [NX-S3.22] Analíticas de Paquetería
 */

async function goToPackagesAnalytics(page: Parameters<typeof mockAdminApi>[0]) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Analíticas/i }).first().click()
  await page.getByRole('button', { name: /^Paquetería$/i }).click()
}

test.describe('Analíticas — Paquetería: carga', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('muestra la sección de analíticas de paquetería', async ({ page }) => {
    await goToPackagesAnalytics(page)
    await expect(page.getByText('Filtros de analítica', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra los filtros de fecha', async ({ page }) => {
    await goToPackagesAnalytics(page)
    await expect(page.getByText('Desde', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Hasta', { exact: true })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: resumen', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { packageAnalytics: MOCK_PACKAGE_ANALYTICS })
    await goToPackagesAnalytics(page)
  })

  test('muestra el total de paquetes recibidos', async ({ page }) => {
    await expect(page.getByText('Paquetes recibidos en el periodo', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('12', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el total de paquetes recogidos', async ({ page }) => {
    await expect(page.getByText('Paquetes recogidos en el periodo', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('8', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra los paquetes pendientes en conserjería', async ({ page }) => {
    await expect(page.getByText('Pendientes ahora en conserjería', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: '4' })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { packageAnalytics: MOCK_PACKAGE_ANALYTICS })
    await goToPackagesAnalytics(page)
  })

  test('muestra el gráfico de actividad diaria', async ({ page }) => {
    await expect(page.getByText('Paquetes recogidos por día y acumulados en conserjería', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el gráfico de paquetes por persona', async ({ page }) => {
    await expect(page.getByText('Número de paquetes por persona', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra los nombres de residentes en el gráfico', async ({ page }) => {
    // Recharts creates an aria-hidden measurement span — use first() to get the visible one
    await expect(page.getByText('Ana García').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Luis Martínez').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Sofía Rodríguez').first()).toBeVisible({ timeout: 10000 })
  })

  test('muestra botones de exportar CSV', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Exportar CSV/i }).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: estado vacío', () => {
  test('muestra mensaje cuando no hay actividad diaria', async ({ page }) => {
    await mockAdminApi(page, {
      packageAnalytics: {
        summary: { total_received_in_period: 0, total_delivered_in_period: 0, currently_pending: 0 },
        daily_activity: [],
        by_resident: [],
        meta: { from: '2026-03-15', to: '2026-03-17' },
      },
    })
    await goToPackagesAnalytics(page)
    await expect(page.getByText(/No hay actividad de paquetes/i)).toBeVisible({ timeout: 10000 })
  })

  test('muestra mensaje cuando no hay paquetes por residente', async ({ page }) => {
    await mockAdminApi(page, {
      packageAnalytics: {
        summary: { total_received_in_period: 0, total_delivered_in_period: 0, currently_pending: 0 },
        daily_activity: [],
        by_resident: [],
        meta: { from: '2026-03-15', to: '2026-03-17' },
      },
    })
    await goToPackagesAnalytics(page)
    await expect(page.getByText(/No hay datos de paquetes por residente/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: error de servicio', () => {
  test('muestra botón reintentar cuando el servicio falla', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me/') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 1, username: 'carlos.admin', email: 'carlos@nexus.test', first_name: 'Carlos', last_name: 'Admin', roles: ['residence_admin'] } }) })
      } else if (path === '/api/packages/analytics/') {
        await route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error interno' }) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })
    await goToPackagesAnalytics(page)
    await expect(page.getByRole('button', { name: /Reintentar/i })).toBeVisible({ timeout: 10000 })
  })
})
