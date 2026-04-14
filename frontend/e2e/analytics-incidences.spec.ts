import { expect, test } from '@playwright/test'
import {
  MOCK_INCIDENCE_ANALYTICS,
  mockAdminApi,
} from './helpers/mockApi'

/**
 * [NX-S3.22] Analíticas de Incidencias
 */

async function goToIncidencesAnalytics(page: Parameters<typeof mockAdminApi>[0]) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Analíticas/i }).first().click()
  await page.getByRole('button', { name: /^Incidencias$/i }).click()
}

test.describe('Analíticas — Incidencias: carga', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('muestra la sección de analíticas de incidencias', async ({ page }) => {
    await goToIncidencesAnalytics(page)
    await expect(page.getByText('Filtros de analítica')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los filtros de fecha Desde y Hasta', async ({ page }) => {
    await goToIncidencesAnalytics(page)
    await expect(page.getByText('Desde')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Hasta')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Incidencias: resumen', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { incidenceAnalytics: MOCK_INCIDENCE_ANALYTICS })
    await goToIncidencesAnalytics(page)
  })

  test('muestra el total de incidencias creadas en el periodo', async ({ page }) => {
    await expect(page.getByText('Creadas en el periodo')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('10')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el total de incidencias resueltas en el periodo', async ({ page }) => {
    await expect(page.getByText('Resueltas en el periodo')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('7')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el total de incidencias abiertas actualmente', async ({ page }) => {
    await expect(page.getByText('Abiertas actualmente')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('3')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el tiempo medio de resolución', async ({ page }) => {
    await expect(page.getByText('Tiempo medio de resolución')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/48\.5\s*h/)).toBeVisible({ timeout: 10000 })
  })

  test('muestra "—" cuando no hay tiempo medio de resolución', async ({ page }) => {
    await mockAdminApi(page, {
      incidenceAnalytics: {
        ...MOCK_INCIDENCE_ANALYTICS,
        summary: { ...MOCK_INCIDENCE_ANALYTICS.summary, avg_resolution_hours: null },
      },
    })
    await goToIncidencesAnalytics(page)
    await expect(page.getByText('—')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Incidencias: gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { incidenceAnalytics: MOCK_INCIDENCE_ANALYTICS })
    await goToIncidencesAnalytics(page)
  })

  test('muestra el gráfico de incidencias abiertas por día', async ({ page }) => {
    await expect(page.getByText('Incidencias abiertas por día')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el gráfico de incidencias resueltas por staff', async ({ page }) => {
    await expect(page.getByText('Incidencias resueltas por staff')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los nombres del staff en el gráfico', async ({ page }) => {
    await expect(page.getByText('María García')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Carlos López')).toBeVisible({ timeout: 10000 })
  })

  test('muestra botones de exportar CSV', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Exportar CSV/i }).first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Incidencias: estado vacío', () => {
  test('muestra mensaje cuando no hay incidencias abiertas en el rango', async ({ page }) => {
    await mockAdminApi(page, {
      incidenceAnalytics: {
        ...MOCK_INCIDENCE_ANALYTICS,
        open_by_day: [
          { date: '2026-03-15', open_count: 0 },
          { date: '2026-03-16', open_count: 0 },
        ],
      },
    })
    await goToIncidencesAnalytics(page)
    await expect(page.getByText(/No hay incidencias abiertas/i)).toBeVisible({ timeout: 10000 })
  })

  test('muestra mensaje cuando no hay incidencias resueltas en el periodo', async ({ page }) => {
    await mockAdminApi(page, {
      incidenceAnalytics: {
        ...MOCK_INCIDENCE_ANALYTICS,
        resolved_by_staff: [],
      },
    })
    await goToIncidencesAnalytics(page)
    await expect(page.getByText(/No hay incidencias resueltas/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Incidencias: rango inválido', () => {
  test('muestra advertencia cuando la fecha inicial es posterior a la final', async ({ page }) => {
    await mockAdminApi(page, { incidenceAnalytics: MOCK_INCIDENCE_ANALYTICS })
    await goToIncidencesAnalytics(page)
    // Set from > to via inputs
    const inputs = page.getByLabel(/Desde|Hasta/i)
    // Use direct fill on date inputs
    const fromInput = page.locator('input[type="date"]').first()
    const toInput = page.locator('input[type="date"]').last()
    await fromInput.fill('2026-04-10')
    await toInput.fill('2026-04-01')
    await expect(page.getByText(/rango temporal no es válido/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Incidencias: error de servicio', () => {
  test('muestra botón reintentar cuando el servicio falla', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me/') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 1, username: 'carlos.admin', email: 'carlos@nexus.test', first_name: 'Carlos', last_name: 'Admin', roles: ['residence_admin'] } }) })
      } else if (path === '/api/incidences/analytics/') {
        await route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error interno' }) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })
    await goToIncidencesAnalytics(page)
    await expect(page.getByRole('button', { name: /Reintentar/i })).toBeVisible({ timeout: 10000 })
  })
})
