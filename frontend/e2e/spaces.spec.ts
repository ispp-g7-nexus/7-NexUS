import { expect, test } from '@playwright/test'
import { mockAdminApi } from './helpers/mockApi'

const MOCK_SPACES = [
  {
    id: 7,
    name: 'Sala Estudio',
    description: 'Sala para trabajo colaborativo',
    img: null,
    capacity: 12,
    is_active: true,
    open_time: '08:00:00',
    close_time: '22:00:00',
    reservation_interval_minutes: 60,
  },
]

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

const CANCELLED_RESERVATIONS = [
  {
    id: 102,
    space: { id: 7, name: 'Sala Estudio' },
    user: { id: 3, first_name: 'Luis', last_name: 'Pardo', email: 'luis@test.com' },
    residence_id: 1,
    start_time: '2026-04-14T12:00:00Z',
    end_time: '2026-04-14T13:00:00Z',
    status: 'cancelled',
    notes: '',
    created_at: '2026-04-13T11:00:00Z',
    updated_at: '2026-04-13T11:30:00Z',
  },
]

test.describe('Espacios admin', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page, {
      adminSpaces: MOCK_SPACES,
      adminSpaceDetail: MOCK_SPACES[0],
      adminSpaceReservations: {
        all: [...ACTIVE_RESERVATIONS, ...CANCELLED_RESERVATIONS],
        active: ACTIVE_RESERVATIONS,
        cancelled: CANCELLED_RESERVATIONS,
      },
    })
    await page.goto('/dashboard/reservations')
  })

  test('muestra los espacios disponibles en gestión', async ({ page }) => {
    await expect(page.getByText('Gestión de espacios')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Sala Estudio' })
    ).toBeVisible()
    await expect(page.getByText('12')).toBeVisible()
    await expect(page.getByText('60m')).toBeVisible()
  })

  test('abre el modal de detalle del espacio', async ({ page }) => {
    await page.getByRole('button', { name: /Ver detalles de Sala Estudio/i }).click()

    await expect(page.getByText('Detalle del espacio')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sala Estudio' }).last()).toBeVisible()
    await expect(page.getByText('12 personas')).toBeVisible()
    await expect(page.getByRole('button', { name: /Editar información/i })).toBeVisible()
  })

  test('abre el drawer de reservas y permite cambiar a canceladas', async ({ page }) => {
    await page.getByRole('button', { name: 'Ver reservas' }).click()

    await expect(page.getByText('Reservas del espacio')).toBeVisible()
    await expect(page.getByText('Ana Ruiz')).toBeVisible()
    await expect(page.getByText(/Trabajo en equipo/i)).toBeVisible()

    await page.getByRole('button', { name: 'Canceladas' }).click()

    await expect(page.getByText('Luis Pardo')).toBeVisible()
    await expect(
      page.getByText('Cancelada', { exact: true })
    ).toBeVisible() 
  })
})

test.describe('Espacios admin - estado vacio', () => {
  test('muestra mensaje cuando no hay espacios registrados', async ({ page }) => {
    await mockAdminApi(page, { adminSpaces: [] })
    await page.goto('/dashboard/reservations')

    await expect(page.getByText(/No hay espacios registrados aún/i)).toBeVisible()
  })
})
