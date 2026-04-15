import { expect, test } from '@playwright/test'
import {
  MOCK_OBJECT,
  MOCK_MY_RESERVATION,
  MOCK_ADMIN_RENTAL,
  mockAdminApi,
  mockStudentApi,
} from './helpers/mockApi'

/**
 * [NX-S2.09] Vista de gestión de objetos (admin)
 * [NX-S2.10] Vista de reserva de objetos (residente)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navigate to the admin objects management panel
// ─────────────────────────────────────────────────────────────────────────────

async function goToAdminObjects(page: Parameters<typeof mockAdminApi>[0]) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /Recursos & Reservas/i }).first().click()
  await page.getByRole('button', { name: /^Objetos$/i }).click()
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navigate to the student objects view
// ─────────────────────────────────────────────────────────────────────────────

async function goToStudentObjects(page: Parameters<typeof mockStudentApi>[0]) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /^Reservas$/i }).click()
  // "Objetos" is the default tab in StudentReservations
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — carga y navegación
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — carga y navegación', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page)
  })

  test('muestra el encabezado Gestión de objetos', async ({ page }) => {
    await goToAdminObjects(page)
    await expect(page.getByRole('heading', { name: 'Gestión de objetos' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Crear objeto', async ({ page }) => {
    await goToAdminObjects(page)
    await expect(page.getByRole('button', { name: /Crear objeto/i })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Historial global', async ({ page }) => {
    await goToAdminObjects(page)
    await expect(page.getByRole('button', { name: /Historial global/i })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Gestionar etiquetas', async ({ page }) => {
    await goToAdminObjects(page)
    await expect(page.getByRole('button', { name: /Gestionar etiquetas/i })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el campo de búsqueda de objetos', async ({ page }) => {
    await goToAdminObjects(page)
    await expect(page.getByPlaceholder('Buscar por nombre, ubicación o etiqueta...')).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — estado vacío
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — estado vacío', () => {
  test('muestra mensaje de estado vacío cuando no hay objetos', async ({ page }) => {
    await mockAdminApi(page, { objects: [] })
    await goToAdminObjects(page)
    await expect(page.getByRole('heading', { name: 'No hay objetos' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra botón Crear objeto en el estado vacío', async ({ page }) => {
    await mockAdminApi(page, { objects: [] })
    await goToAdminObjects(page)
    // Header button + empty-state button (at least one must be visible)
    await expect(page.getByRole('button', { name: /Crear objeto/i }).first()).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — lista de objetos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — lista de objetos', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, { objects: [MOCK_OBJECT] })
    await goToAdminObjects(page)
  })

  test('muestra el nombre del objeto en la lista', async ({ page }) => {
    await expect(page.getByText('Bicicleta de montaña').first()).toBeVisible({ timeout: 10000 })
  })

  test('muestra el recuento de objetos en el subtítulo', async ({ page }) => {
    await expect(page.getByText(/1 objeto/)).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — formulario de creación
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — formulario de creación', () => {
  test('abre el diálogo Crear nuevo objeto al pulsar el botón', async ({ page }) => {
    await mockAdminApi(page)
    await goToAdminObjects(page)
    await page.getByRole('button', { name: /Crear objeto/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Crear nuevo objeto' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el campo Nombre en el formulario de creación', async ({ page }) => {
    await mockAdminApi(page)
    await goToAdminObjects(page)
    await page.getByRole('button', { name: /Crear objeto/i }).first().click()
    await expect(page.getByPlaceholder('Ej: Bicicleta de montaña')).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — historial global de préstamos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — historial global', () => {
  test('abre el panel de historial global al pulsar el botón', async ({ page }) => {
    await mockAdminApi(page, { adminObjectRentals: [] })
    await goToAdminObjects(page)
    await page.getByRole('button', { name: /Historial global/i }).click()
    await expect(page.getByText('Total')).toBeVisible({ timeout: 10000 })
  })

  test('muestra contadores de reservas en el panel de historial global', async ({ page }) => {
    await mockAdminApi(page, { adminObjectRentals: [MOCK_ADMIN_RENTAL] })
    await goToAdminObjects(page)
    await page.getByRole('button', { name: /Historial global/i }).click()
    await expect(page.getByText('Reservadas')).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — filtrado por búsqueda
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (admin) — filtrado', () => {
  test('filtra objetos al escribir en el campo de búsqueda', async ({ page }) => {
    await mockAdminApi(page, {
      objects: [
        MOCK_OBJECT,
        { ...MOCK_OBJECT, id: 11, name: 'Taladro eléctrico', location: 'Almacén' },
      ],
    })
    await goToAdminObjects(page)
    await expect(page.getByText('Bicicleta de montaña').first()).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder('Buscar por nombre, ubicación o etiqueta...').fill('Taladro')
    await expect(page.getByText('Taladro eléctrico').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Bicicleta de montaña')).not.toBeVisible()
  })

  test('muestra estado Sin coincidencias cuando la búsqueda no encuentra resultados', async ({ page }) => {
    await mockAdminApi(page, { objects: [MOCK_OBJECT] })
    await goToAdminObjects(page)
    await page.getByPlaceholder('Buscar por nombre, ubicación o etiqueta...').fill('xyz-no-existe')
    await expect(page.getByRole('heading', { name: 'Sin coincidencias' })).toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — carga y encabezados
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — carga', () => {
  test.beforeEach(async ({ page }) => {
    await mockStudentApi(page)
  })

  test('muestra el encabezado Objetos disponibles', async ({ page }) => {
    await goToStudentObjects(page)
    await expect(page.getByRole('heading', { name: 'Objetos disponibles' }).first()).toBeVisible({ timeout: 10000 })
  })

  test('muestra el buscador de objetos', async ({ page }) => {
    await goToStudentObjects(page)
    await expect(page.getByPlaceholder('Buscar objetos...')).toBeVisible({ timeout: 10000 })
  })

  test('muestra la sección Mis Reservas', async ({ page }) => {
    await goToStudentObjects(page)
    await expect(page.getByRole('heading', { name: 'Mis Reservas' })).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — estado vacío de objetos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — estado vacío', () => {
  test('muestra mensaje No hay objetos disponibles cuando la lista está vacía', async ({ page }) => {
    await mockStudentApi(page, { objects: [] })
    await goToStudentObjects(page)
    await expect(page.getByRole('heading', { name: 'No hay objetos disponibles' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra mensaje No tienes reservas en Mis Reservas cuando está vacío', async ({ page }) => {
    await mockStudentApi(page, { myReservations: [] })
    await goToStudentObjects(page)
    await expect(page.getByRole('heading', { name: 'No tienes reservas' })).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — lista de objetos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — lista de objetos', () => {
  test.beforeEach(async ({ page }) => {
    await mockStudentApi(page, { objects: [MOCK_OBJECT] })
    await goToStudentObjects(page)
  })

  test('muestra el nombre del objeto en la lista', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bicicleta de montaña' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el badge Disponible para un objeto reservable', async ({ page }) => {
    await expect(page.getByText('Disponible', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra la ubicación del objeto', async ({ page }) => {
    await expect(page.getByText('Garaje')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el stock total del objeto', async ({ page }) => {
    await expect(page.getByText('Stock total: 1')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Reservar en el objeto disponible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Reservar/i })).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — objeto no disponible
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — objeto no disponible', () => {
  test('muestra badge No disponible para un objeto sin stock', async ({ page }) => {
    const unavailableObject = { ...MOCK_OBJECT, can_rent: false, availability: false, current_available_stock: 0 }
    await mockStudentApi(page, { objects: [unavailableObject] })
    await goToStudentObjects(page)
    await expect(page.getByText('No disponible', { exact: true })).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — Mis Reservas
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — Mis Reservas', () => {
  test('muestra la reserva activa del usuario en Mis Reservas', async ({ page }) => {
    await mockStudentApi(page, { myReservations: [MOCK_MY_RESERVATION] })
    await goToStudentObjects(page)
    await expect(page.getByText('Bicicleta de montaña').first()).toBeVisible({ timeout: 10000 })
  })

  test('muestra el estado Próxima para una reserva activa futura', async ({ page }) => {
    await mockStudentApi(page, { myReservations: [MOCK_MY_RESERVATION] })
    await goToStudentObjects(page)
    await expect(page.getByText('Próxima', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Cancelar para una reserva activa', async ({ page }) => {
    await mockStudentApi(page, { myReservations: [MOCK_MY_RESERVATION] })
    await goToStudentObjects(page)
    await expect(page.getByRole('button', { name: /^Cancelar$/ })).toBeVisible({ timeout: 10000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — modal de reserva
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — modal de reserva', () => {
  test.beforeEach(async ({ page }) => {
    await mockStudentApi(page, { objects: [MOCK_OBJECT] })
    await goToStudentObjects(page)
  })

  test('abre el panel lateral Nueva reserva al pulsar Reservar', async ({ page }) => {
    await page.getByRole('button', { name: /Reservar/i }).click()
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).toBeVisible({ timeout: 10000 })
  })

  test('muestra el nombre del objeto en el panel de reserva', async ({ page }) => {
    await page.getByRole('button', { name: /Reservar/i }).click()
    await expect(page.getByText('Bicicleta de montaña').first()).toBeVisible({ timeout: 10000 })
  })

  test('muestra la sección Fecha de la reserva en el modal', async ({ page }) => {
    await page.getByRole('button', { name: /Reservar/i }).click()
    await expect(page.getByText('Fecha de la reserva')).toBeVisible({ timeout: 10000 })
  })

  test('muestra el botón Confirmar reserva en el modal', async ({ page }) => {
    await page.getByRole('button', { name: /Reservar/i }).click()
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /Confirmar reserva/i })).toBeVisible({ timeout: 10000 })
  })

  test('cierra el modal al pulsar Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: /Reservar/i }).click()
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).toBeVisible({ timeout: 10000 })
    // Click the cancel button inside the modal (not the object cancel button)
    await page.getByRole('button', { name: /^Cancelar$/ }).last().click()
    await expect(page.getByRole('heading', { name: 'Nueva reserva' })).not.toBeVisible({ timeout: 5000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RESIDENTE — búsqueda de objetos
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Objetos (residente) — búsqueda', () => {
  test('filtra objetos al escribir en el buscador', async ({ page }) => {
    await mockStudentApi(page, {
      objects: [
        MOCK_OBJECT,
        { ...MOCK_OBJECT, id: 11, name: 'Taladro eléctrico', location: 'Almacén' },
      ],
    })
    await goToStudentObjects(page)
    await expect(page.getByRole('heading', { name: 'Bicicleta de montaña' })).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder('Buscar objetos...').fill('Taladro')
    await expect(page.getByRole('heading', { name: 'Taladro eléctrico' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: 'Bicicleta de montaña' })).not.toBeVisible()
  })
})
