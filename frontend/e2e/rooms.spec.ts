import { expect, test } from '@playwright/test'
import { MOCK_BEDROOM, mockAdminApi } from './helpers/mockApi'

/**
 * [NX-S2.03] Ver detalle de una habitación
 */
test.describe('Habitaciones — detalle', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { bedrooms: [MOCK_BEDROOM] })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Habitaciones/i }).first().click()
  })

  test('muestra la habitación en la lista', async ({ page }) => {
    await expect(page.getByText('101-A')).toBeVisible()
  })

  test('muestra tipo y ocupación en la tarjeta', async ({ page }) => {
    await expect(page.getByText(/1\/2 ocupantes/)).toBeVisible()
  })

  test('abre el panel de detalle al hacer clic en "Ver detalles"', async ({ page }) => {
    await page.getByRole('button', { name: /Ver detalles/i }).click()
    await expect(page.getByText('Habitación 101')).toBeVisible()
  })

  test('el panel de detalle muestra el tipo de habitación', async ({ page }) => {
    await page.getByRole('button', { name: /Ver detalles/i }).click()
    await expect(page.getByText('Doble', { exact: true })).toBeVisible()
  })

  test('el panel de detalle muestra la lista de residentes', async ({ page }) => {
    await page.getByRole('button', { name: /Ver detalles/i }).click()
    const detailPanel = page.locator('.max-w-sm')
    await expect(detailPanel.getByText('Ana García')).toBeVisible()
  })

  test('el panel de detalle se cierra con el botón Cerrar', async ({ page }) => {
    await page.getByRole('button', { name: /Ver detalles/i }).click()
    await expect(page.getByText('Habitación 101')).toBeVisible()
    // El overlay bloquea el clic normal; dispatchEvent fuerza el evento React sin pasar por Playwright
    await page.getByRole('button', { name: /Cerrar detalle/i }).dispatchEvent('click')
    await expect(page.getByText('Habitación 101')).not.toBeVisible()
  })
})
