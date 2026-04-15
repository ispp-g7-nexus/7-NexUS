import { expect, test, type Route } from '@playwright/test'
import { mockAdminApi, MOCK_OBJECT } from './helpers/mockApi'

/**
 * Verifica los 4 bugs reportados por QA:
 *  1. "Ver reservas" (tarjeta de espacio) abre el drawer de reservas, no los detalles.
 *  2. "Ver reservas" dentro del modal de detalles del espacio es accesible y abre el drawer.
 *  3. La actualización (PUT) de un objeto desde la gestión de objetos funciona.
 *  4. El campo check-in del residente se envía al actualizar.
 */

const SPACE = {
  id: 7,
  name: 'Sala Estudio',
  description: 'Sala para trabajo colaborativo',
  img: null,
  capacity: 12,
  is_active: true,
  open_time: '08:00:00',
  close_time: '22:00:00',
  reservation_interval_minutes: 60,
}

const ACTIVE_RESERVATIONS = [
  {
    id: 101,
    space: { id: 7, name: 'Sala Estudio' },
    user: { id: 2, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@test.com' },
    residence_id: 1,
    start_time: '2026-04-14T10:00:00Z',
    end_time: '2026-04-14T11:00:00Z',
    status: 'active',
    notes: 'Trabajo en equipo',
    created_at: '2026-04-13T10:00:00Z',
    updated_at: '2026-04-13T10:00:00Z',
  },
]

function json(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG #1: "Ver reservas" en la tarjeta del espacio abre el drawer de reservas
// (no los detalles del espacio).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Bug #1 — Ver reservas (tarjeta de espacio)', () => {
  test('abre el drawer de reservas y muestra las reservas del espacio', async ({ page }) => {
    await mockAdminApi(page, {
      adminSpaces: [SPACE],
      adminSpaceDetail: SPACE,
      adminSpaceReservations: { all: ACTIVE_RESERVATIONS, active: ACTIVE_RESERVATIONS, cancelled: [] },
    })
    await page.goto('/dashboard/reservations')

    await expect(page.getByText('Gestión de espacios')).toBeVisible()
    await page.getByRole('button', { name: 'Ver reservas' }).click()

    // Drawer title y no el modal de detalles
    await expect(page.getByText('Reservas del espacio')).toBeVisible()
    await expect(page.getByText('Detalle del espacio')).toHaveCount(0)
    await expect(page.getByText('Ana Ruiz')).toBeVisible()
    await expect(page.getByText(/Trabajo en equipo/i)).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG #2: Dentro del modal de detalles, el botón "Ver reservas" es accesible
// y abre el drawer (antes quedaba tapado/ausente).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Bug #2 — Ver reservas desde el modal de detalles', () => {
  test('el botón es visible, clicable y abre el drawer de reservas', async ({ page }) => {
    await mockAdminApi(page, {
      adminSpaces: [SPACE],
      adminSpaceDetail: SPACE,
      adminSpaceReservations: { all: ACTIVE_RESERVATIONS, active: ACTIVE_RESERVATIONS, cancelled: [] },
    })
    await page.goto('/dashboard/reservations')
    await page.waitForTimeout(1500)

    // Abrimos el modal de detalles
    await page.getByRole('button', { name: 'Ver detalles', exact: true }).click()
    await expect(page.getByText('Detalle del espacio')).toBeVisible()
    await page.waitForTimeout(2000)

    // Scope al contenedor del modal y localizar el nuevo botón "Ver reservas"
    const modalScope = page.locator('div.fixed.inset-0.z-50')
    const verReservasBtn = modalScope.getByRole('button', { name: 'Ver reservas' })
    await expect(verReservasBtn).toBeVisible()
    await expect(verReservasBtn).toBeEnabled()
    await verReservasBtn.hover()
    await page.waitForTimeout(1500)
    await verReservasBtn.click()

    // Se cierra el modal y aparece el drawer
    await expect(page.getByText('Detalle del espacio')).toHaveCount(0)
    await expect(page.getByText('Reservas del espacio')).toBeVisible()
    await expect(page.getByText('Ana Ruiz')).toBeVisible()
    await page.waitForTimeout(2000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG #3: Update de un objeto funciona (PUT /api/objects/:id/).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Bug #3 — Actualización de objeto (admin)', () => {
  test('enviar el formulario en modo edición dispara PUT y muestra éxito', async ({ page }) => {
    await mockAdminApi(page, { objects: [MOCK_OBJECT] })

    let putCalled = false
    let putBody: Record<string, unknown> | null = null

    await page.route('**/api/objects/10/', async (route: Route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true
        putBody = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill(json({ id: 10, detail: 'Objeto actualizado correctamente' }))
        return
      }
      await route.fulfill(json(MOCK_OBJECT))
    })

    await page.goto('/dashboard/reservations')
    await page.getByRole('button', { name: /^Objetos$/i }).click()
    await expect(page.getByRole('heading', { name: 'Gestión de objetos' })).toBeVisible({ timeout: 10000 })

    // Abrir el formulario en modo edición
    await page.getByRole('button', { name: /Ver detalles/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Ver detalles del objeto' })).toBeVisible({ timeout: 10000 })

    // Modificar un campo y guardar
    const nameInput = page.getByPlaceholder('Ej: Bicicleta de montaña')
    await nameInput.fill('Bicicleta de montaña PRO')

    await page.getByRole('button', { name: 'Actualizar' }).click()

    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)
    expect(putBody).not.toBeNull()
    expect((putBody as Record<string, unknown>).name).toBe('Bicicleta de montaña PRO')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BUG #4: El campo check_in del residente se guarda al editar.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Bug #4 — check_in al editar residente', () => {
  test('el PATCH incluye check_in_date', async ({ page }) => {
    const resident = {
      id: 55,
      full_name: 'María González',
      email: 'maria@nexus.test',
      is_active: true,
      bedroom_id: 1,
      room: '101',
      building: 'A',
      check_in_date: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    await mockAdminApi(page)

    // Mock específico para /api/residents/ y bedrooms available.
    // Se registra DESPUÉS de mockAdminApi, así que toma precedencia.
    let patchCalled = false
    let patchBody: Record<string, unknown> | null = null

    await page.route('**/api/residents/', async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill(json([resident]))
        return
      }
      await route.fulfill(json([]))
    })
    await page.route('**/api/residents/55/', async (route: Route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true
        patchBody = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill(json({ ...resident, check_in_date: patchBody.check_in_date }))
        return
      }
      await route.fulfill(json(resident))
    })
    await page.route('**/api/bedrooms/available/**', async (route: Route) => {
      await route.fulfill(
        json([
          {
            id: 1,
            numero: '101',
            edificio: 'A',
            tipo: 'Individual',
            ocupantes_actuales: 1,
            capacidad_maxima: 1,
          },
        ]),
      )
    })

    await page.goto('/dashboard/students')
    await expect(page.getByRole('heading', { name: 'Residentes', level: 2 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('María González')).toBeVisible()

    // Abrir diálogo de edición
    await page.getByTitle('Editar residente').click()
    await expect(page.getByText('Editar Residente')).toBeVisible()

    // Fijar fecha de check-in futura
    const futureDate = '2099-06-15'
    await page.locator('#res-checkin').fill(futureDate)

    await page.getByRole('button', { name: /Guardar cambios/i }).click()

    await expect.poll(() => patchCalled, { timeout: 10000 }).toBe(true)
    expect(patchBody).not.toBeNull()
    expect((patchBody as Record<string, unknown>).check_in_date).toBe(futureDate)
  })
})
