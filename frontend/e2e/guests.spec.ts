import { expect, test, type Page } from '@playwright/test'
import { MOCK_PASSES, mockAdminApi } from './helpers/mockApi'

/**
 * [NX-S2.39] Listado de pases de invitados
 * [NX-S2.40] Visualizar detalles de un pase de invitado
 */
test.describe('Visitantes — pases de invitado', () => {
  let adminPasses = MOCK_PASSES.map((pass) => ({ ...pass }))
  let policy = {
    max_duration_hours: 24,
    max_concurrent_passes: 3,
    visit_start_time: null as string | null,
    visit_end_time: null as string | null,
  }

  async function mockGuestAdminCrudApi(page: Page) {
    await page.route('**/api/admin/guest-passes/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()

      if (path === '/api/admin/guest-passes/' && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(adminPasses),
        })
        return
      }

      if (path === '/api/admin/guest-passes/notifications/' && method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        return
      }

      if (path === '/api/admin/guest-passes/policy/' && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(policy),
        })
        return
      }

      if (path === '/api/admin/guest-passes/policy/' && method === 'PATCH') {
        const payload = JSON.parse(route.request().postData() || '{}')
        policy = {
          ...policy,
          ...payload,
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(policy),
        })
        return
      }

      const rejectMatch = path.match(/^\/api\/admin\/guest-passes\/(\d+)\/reject\/$/)
      if (rejectMatch && method === 'POST') {
        const passId = Number(rejectMatch[1])
        adminPasses = adminPasses.map((item) =>
          item.id === passId ? { ...item, status: 'REJECTED' } : item,
        )
        const updated = adminPasses.find((item) => item.id === passId)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updated),
        })
        return
      }

      const unrejectMatch = path.match(/^\/api\/admin\/guest-passes\/(\d+)\/unreject\/$/)
      if (unrejectMatch && method === 'POST') {
        const passId = Number(unrejectMatch[1])
        adminPasses = adminPasses.map((item) =>
          item.id === passId ? { ...item, status: 'ACTIVE' } : item,
        )
        const updated = adminPasses.find((item) => item.id === passId)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updated),
        })
        return
      }

      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Not found' }) })
    })
  }

  test.beforeEach(async ({ page }) => {
    adminPasses = MOCK_PASSES.map((pass) => ({ ...pass }))
    policy = {
      max_duration_hours: 24,
      max_concurrent_passes: 3,
      visit_start_time: null,
      visit_end_time: null,
    }
    await mockAdminApi(page)
    await mockGuestAdminCrudApi(page)
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Visitantes/i }).first().click()
  })

  // ── S2.39: Listado ────────────────────────────────────────────────────────

  test('muestra los pases de invitado tras cargar', async ({ page }) => {
    await expect(page.getByText('Juan Pérez')).toBeVisible()
    await expect(page.getByText('María López')).toBeVisible()
  })

  test('muestra el badge de estado correcto', async ({ page }) => {
    await expect(page.getByText('Programado', { exact: true })).toBeVisible()
    await expect(page.getByText('Usado', { exact: true })).toBeVisible()
  })

  test('filtra pases por nombre del invitado', async ({ page }) => {
    await page.getByPlaceholder(/Buscar/i).fill('Juan')
    await expect(page.getByText('Juan Pérez')).toBeVisible()
    await expect(page.getByText('María López')).not.toBeVisible()
  })

  test('filtra pases por código de pase', async ({ page }) => {
    await page.getByPlaceholder(/Buscar/i).fill('GP-0002')
    await expect(page.getByText('María López')).toBeVisible()
    await expect(page.getByText('Juan Pérez')).not.toBeVisible()
  })

  test('muestra mensaje cuando la búsqueda no tiene resultados', async ({ page }) => {
    await page.getByPlaceholder(/Buscar/i).fill('xyz-inexistente')
    await expect(page.getByText('No hay pases que coincidan.')).toBeVisible()
  })

  // ── S2.40: Detalle ────────────────────────────────────────────────────────

  test('abre el diálogo de detalle al hacer clic en un pase', async ({ page }) => {
    await page.getByText('Juan Pérez').click()
    await expect(page.getByText('Código de pase')).toBeVisible()
    await expect(page.getByText('Período de validez')).toBeVisible()
  })

  test('el diálogo de detalle muestra el nombre del residente registrador', async ({ page }) => {
    await page.getByText('Juan Pérez').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Registrado por')).toBeVisible()
  })

  test('el detalle muestra el comentario del pase', async ({ page }) => {
    await page.getByText('Juan Pérez').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('"Visita familiar"')).toBeVisible()
  })

  test('permite rechazar y deshacer rechazo de un pase', async ({ page }) => {
    await page.getByText('Juan Pérez').click()
    const dialog = page.getByRole('dialog')

    await dialog.getByRole('button', { name: /Rechazar pase/i }).click()
    await expect(page.getByText('Rechazado', { exact: true })).toBeVisible()

    await page.getByText('Juan Pérez').click()
    const rejectedDialog = page.getByRole('dialog')
    await rejectedDialog.getByRole('button', { name: /Deshacer rechazo/i }).click()

    await expect(page.getByText('Programado')).toBeVisible()
  })

  test('actualiza política de visitantes y mantiene cambios tras recargar', async ({ page }) => {
    const durationInput = page.getByLabel('Duración máxima (horas)')
    const concurrentInput = page.getByLabel('Máximo de pases concurrentes')

    await durationInput.fill('12')
    await concurrentInput.fill('5')
    await page.getByRole('button', { name: /Guardar configuración/i }).click()
    await page.getByRole('button', { name: /Recargar/i }).click()

    await expect(durationInput).toHaveValue('12')
    await expect(concurrentInput).toHaveValue('5')
  })
})
