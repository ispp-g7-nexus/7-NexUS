import { expect, test } from '@playwright/test'
import { MOCK_PASSES, mockAdminApi } from './helpers/mockApi'

/**
 * [NX-S2.39] Listado de pases de invitados
 * [NX-S2.40] Visualizar detalles de un pase de invitado
 */
test.describe('Visitantes — pases de invitado', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { guestPasses: MOCK_PASSES })
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /Visitantes/i }).first().click()
  })

  // ── S2.39: Listado ────────────────────────────────────────────────────────

  test('muestra los pases de invitado tras cargar', async ({ page }) => {
    await expect(page.getByText('Juan Pérez')).toBeVisible()
    await expect(page.getByText('María López')).toBeVisible()
  })

  test('muestra el badge de estado correcto', async ({ page }) => {
    await expect(page.getByText('Activo', { exact: true })).toBeVisible()
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
    await expect(page.getByText('No se han encontrado pases que coincidan')).toBeVisible()
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
})
