import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReservationModal } from '../ReservationModal'
import { objectsService } from '../../../../services/objects'
import { authService } from '../../../../services/auth'

vi.mock('../../../../services/objects', () => ({
  objectsService: {
    getObjectAvailability: vi.fn(),
    reserveObject: vi.fn(),
  },
}))

vi.mock('../../../../services/auth', () => ({
  authService: {
    me: vi.fn(),
  },
}))

vi.mock('../../../../components/ui/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockedObjectsService = vi.mocked(objectsService)
const mockedAuthService = vi.mocked(authService)

const object = {
  id: 1,
  name: 'Taladro',
  description: 'Industrial',
  location: 'Trastero',
  availability: true,
  stock_total: 2,
  current_reserved_stock: 0,
  current_available_stock: 2,
  image_url: '',
  tags: 'herramientas',
  labels: [],
  rentals_count: 0,
  can_rent: true,
}

describe('ReservationModal (objects)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuthService.me.mockResolvedValue({ authenticated: true, user: { id: 99 } })
    mockedObjectsService.getObjectAvailability.mockResolvedValue({
      date: '2026-04-14',
      reservation_interval_minutes: 60,
      object,
      reservations: [
        {
          id: 11,
          start_date: '2026-04-14T09:00:00Z',
          end_date: '2026-04-14T09:55:00Z',
          user: { id: 50, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@test.com' },
        },
      ],
      available_slots: [
        {
          start_time: '2026-04-14T10:00:00Z',
          end_time: '2026-04-14T10:55:00Z',
          status: 'available',
          available_stock: 2,
        },
        {
          start_time: '2026-04-14T11:00:00Z',
          end_time: '2026-04-14T11:55:00Z',
          status: 'occupied',
          available_stock: 0,
        },
      ],
    })
    mockedObjectsService.reserveObject.mockResolvedValue({ id: 1, detail: 'Reserva creada.' })
  })

  it('carga disponibilidad y reserva un tramo seleccionado', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    render(<ReservationModal object={object} isOpen onClose={vi.fn()} onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(mockedObjectsService.getObjectAvailability).toHaveBeenCalledWith(1, expect.any(String))
      expect(screen.getByText(/Reservas para/i)).toBeInTheDocument()
    })

    const availableSlot = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('10:00'))
    expect(availableSlot).toBeDefined()

    await user.click(availableSlot!)
    await user.click(screen.getByRole('button', { name: /Confirmar reserva/i }))

    await waitFor(() => {
      expect(mockedObjectsService.reserveObject).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          start_date: '2026-04-14T10:00:00Z',
          end_date: '2026-04-14T10:55:00Z',
        }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deshabilita tramos ocupados y mantiene submit bloqueado sin selección válida', async () => {
    render(<ReservationModal object={object} isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    await waitFor(() => {
      const occupied = screen.getByRole('button', { name: /Completo/i })
      expect(occupied).toBeDisabled()
      expect(screen.getByRole('button', { name: /Confirmar reserva/i })).toBeDisabled()
    })
  })

  it('muestra error cuando falla la carga de disponibilidad', async () => {
    mockedObjectsService.getObjectAvailability.mockRejectedValue(new Error('Error al cargar disponibilidad'))

    render(<ReservationModal object={object} isOpen onClose={vi.fn()} onSuccess={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Error al cargar disponibilidad')).toBeInTheDocument()
    })
  })
})
