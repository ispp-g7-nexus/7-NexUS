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
    await expect(page.getByText('Filtros de analítica')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los filtros de fecha', async ({ page }) => {
    await goToPackagesAnalytics(page)
    await expect(page.getByText('Desde')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Hasta')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: resumen', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { packageAnalytics: MOCK_PACKAGE_ANALYTICS })
    await goToPackagesAnalytics(page)
  })

  test('muestra el total de paquetes recibidos', async ({ page }) => {
    await expect(page.getByText('Recibidos en el periodo')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('12')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el total de paquetes entregados', async ({ page }) => {
    await expect(page.getByText('Entregados en el periodo')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('8')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los paquetes pendientes en conserjería', async ({ page }) => {
    await expect(page.getByText('En conserjería ahora')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('4')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Paquetería: gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { packageAnalytics: MOCK_PACKAGE_ANALYTICS })
    await goToPackagesAnalytics(page)
  })

  test('muestra el gráfico de actividad diaria', async ({ page }) => {
    await expect(page.getByText('Actividad diaria de paquetes')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el gráfico de paquetes por residente', async ({ page }) => {
    await expect(page.getByText('Paquetes por residente')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los nombres de residentes en el gráfico', async ({ page }) => {
    await expect(page.getByText('Ana García')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Luis Martínez')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Sofía Rodríguez')).toBeVisible({ timeout: 10000 })
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
  test('muestra mensaje de error y botón reintentar cuando el servicio falla', async ({ page }) => {
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
