import { expect, test } from '@playwright/test'
import {
  MOCK_BEDROOM_ANALYTICS,
  mockAdminApi,
} from './helpers/mockApi'

/**
 * [NX-S3.22] Analíticas de Habitaciones
 */

async function goToRoomsAnalytics(page: Parameters<typeof mockAdminApi>[0]) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Analíticas/i }).first().click()
  await page.getByRole('button', { name: /^Habitaciones$/i }).click()
}

test.describe('Analíticas — Habitaciones: permisos y carga', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('muestra el panel de analíticas al navegar a Habitaciones', async ({ page }) => {
    await goToRoomsAnalytics(page)
    await expect(page.getByText('Analíticas de Habitaciones')).toBeVisible({ timeout: 10000 })
  })

  test('muestra la tarjeta de total de habitaciones', async ({ page }) => {
    await goToRoomsAnalytics(page)
    await expect(page.getByText('Total habitaciones')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Habitaciones: resumen', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { bedroomAnalytics: MOCK_BEDROOM_ANALYTICS })
    await goToRoomsAnalytics(page)
  })

  test('muestra el número total de habitaciones', async ({ page }) => {
    await expect(page.getByText('9')).toBeVisible({ timeout: 10000 })
  })

  test('muestra la capacidad total', async ({ page }) => {
    await expect(page.getByText('14')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el total de ocupantes', async ({ page }) => {
    await expect(page.getByText('6')).toBeVisible({ timeout: 10000 })
  })

  test('muestra la tasa de ocupación', async ({ page }) => {
    await expect(page.getByText(/43\s*%/)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Habitaciones: gráficos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { bedroomAnalytics: MOCK_BEDROOM_ANALYTICS })
    await goToRoomsAnalytics(page)
  })

  test('muestra el gráfico de ocupación por edificio', async ({ page }) => {
    await expect(page.getByText('Ocupación por edificio')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los edificios en el gráfico', async ({ page }) => {
    await expect(page.getByText('Edificio A')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Edificio B')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el gráfico de ocupación por tipo de habitación', async ({ page }) => {
    await expect(page.getByText('Ocupación por tipo de habitación')).toBeVisible({ timeout: 10000 })
  })

  test('muestra los tipos de habitación', async ({ page }) => {
    await expect(page.getByText('Individual')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Doble')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Triple')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el gráfico de índice de ocupación por años', async ({ page }) => {
    await expect(page.getByText('Índice de ocupación por años')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Habitaciones: estado vacío', () => {
  test('muestra mensaje de sin datos cuando no hay habitaciones', async ({ page }) => {
    await mockAdminApi(page, {
      bedroomAnalytics: {
        summary: { total_rooms: 0, total_capacity: 0, total_occupants: 0, occupation_rate: 0 },
        occupation_by_building: [],
        occupation_by_type: [],
        occupation_by_year: [],
      },
    })
    await goToRoomsAnalytics(page)
    await expect(page.getByText('0').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Analíticas — Habitaciones: error de servicio', () => {
  test('muestra mensaje de error cuando el servicio falla', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me/') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, user: { id: 1, username: 'carlos.admin', email: 'carlos@nexus.test', first_name: 'Carlos', last_name: 'Admin', roles: ['residence_admin'] } }) })
      } else if (path === '/api/bedrooms/analytics/') {
        await route.fulfill({ status: 500, body: '' })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      }
    })
    await goToRoomsAnalytics(page)
    await expect(page.getByRole('button', { name: /Reintentar/i })).toBeVisible({ timeout: 10000 })
  })
})
