import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Reservations } from '../Reservations'
import {
  cancelReservation,
  getSpaceAvailability,
  listCommonSpaces,
  listMyReservations,
  ApiError,
} from '../../../services/reservations'

vi.mock('../../../services/reservations', () => ({
  listCommonSpaces: vi.fn(),
  getSpaceAvailability: vi.fn(),
  listMyReservations: vi.fn(),
  cancelReservation: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../components/SpaceAvailabilityCard', () => ({
  SpaceAvailabilityCard: ({ space, onReserve }: any) => (
    <div>
      <span>{space.name}</span>
      <button type="button" onClick={() => onReserve(space)}>
        reserve-{space.id}
      </button>
    </div>
  ),
}))

vi.mock('../components/MyReservationsList', () => ({
  MyReservationsList: ({ reservations, onCancel }: any) => (
    <div>
      <p>my-reservations:{reservations.length}</p>
      {reservations.map((reservation: any) => (
        <button key={reservation.id} type="button" onClick={() => onCancel(reservation.id)}>
          cancel-{reservation.id}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../components/ReservationFormSheet', () => ({
  ReservationFormSheet: ({ open, onSuccess }: any) =>
    open ? (
      <button type="button" onClick={onSuccess}>
        reservation-sheet-success
      </button>
    ) : null,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockedListCommonSpaces = vi.mocked(listCommonSpaces)
const mockedListMyReservations = vi.mocked(listMyReservations)
const mockedGetSpaceAvailability = vi.mocked(getSpaceAvailability)
const mockedCancelReservation = vi.mocked(cancelReservation)

const spaces = [
  {
    id: 1,
    name: 'Sala A',
    description: '',
    img: '',
    capacity: 2,
    is_active: true,
    open_time: '08:00:00',
    close_time: '22:00:00',
    reservation_interval_minutes: 60,
  },
]

const myReservations = [
  {
    id: 50,
    space: { id: 1, name: 'Sala A' },
    user: { id: 1, first_name: 'Juan', last_name: 'Pérez', email: 'juan@test.com' },
    residence_id: 1,
    start_time: '2026-04-14T10:00:00Z',
    end_time: '2026-04-14T11:00:00Z',
    status: 'active',
    notes: '',
    created_at: '2026-04-13T10:00:00Z',
    updated_at: '2026-04-13T10:00:00Z',
  },
]

describe('Reservations page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListCommonSpaces.mockResolvedValue(spaces)
    mockedListMyReservations.mockResolvedValue(myReservations)
    mockedGetSpaceAvailability.mockResolvedValue({
      date: '2026-04-14',
      space: spaces[0],
      reservations: [],
      available_slots: [],
    })
    mockedCancelReservation.mockResolvedValue()
  })

  it('carga espacios, disponibilidad y mis reservas', async () => {
    render(<Reservations />)

    await waitFor(() => {
      expect(mockedListCommonSpaces).toHaveBeenCalledTimes(1)
      expect(mockedListMyReservations).toHaveBeenCalledTimes(1)
      expect(mockedGetSpaceAvailability).toHaveBeenCalledWith(1, expect.any(String))
      expect(screen.getByText('Sala A')).toBeInTheDocument()
      expect(screen.getByText('my-reservations:1')).toBeInTheDocument()
    })
  })

  it('cancela una reserva y recarga datos', async () => {
    const user = userEvent.setup()
    render(<Reservations />)

    await waitFor(() => screen.getByText('my-reservations:1'))

    await user.click(screen.getByRole('button', { name: /cancel-50/i }))

    await waitFor(() => {
      expect(mockedCancelReservation).toHaveBeenCalledWith(50)
      expect(mockedListMyReservations).toHaveBeenCalledTimes(2)
    })
  })

  it('abre el formulario de reserva y refresca tras éxito', async () => {
    const user = userEvent.setup()
    render(<Reservations />)

    await waitFor(() => screen.getByText('Sala A'))

    await user.click(screen.getByRole('button', { name: /reserve-1/i }))
    await user.click(screen.getByRole('button', { name: /reservation-sheet-success/i }))

    await waitFor(() => {
      expect(mockedListCommonSpaces).toHaveBeenCalledTimes(2)
    })
  })

  it('muestra estado no autorizado cuando API devuelve 401/403', async () => {
    mockedListCommonSpaces.mockRejectedValue(new ApiError('No autenticado', 401))
    mockedListMyReservations.mockRejectedValue(new ApiError('No autenticado', 401))

    render(<Reservations />)

    await waitFor(() => {
      expect(screen.getByText('Acceso no autorizado')).toBeInTheDocument()
      expect(screen.getByText(/Debes iniciar sesión/i)).toBeInTheDocument()
    })
  })

  it('muestra estado vacio cuando no hay espacios activos', async () => {
    mockedListCommonSpaces.mockResolvedValue([])
    mockedListMyReservations.mockResolvedValue([])

    render(<Reservations />)

    await waitFor(() => {
      expect(screen.getByText(/No hay espacios activos/i)).toBeInTheDocument()
      expect(screen.getByText('my-reservations:0')).toBeInTheDocument()
    })
  })

  it('permite reintentar cuando falla la carga inicial por un error no autorizado', async () => {
    const user = userEvent.setup()
    mockedListCommonSpaces
      .mockRejectedValueOnce(new ApiError('Servicio temporalmente no disponible', 500))
      .mockResolvedValue(spaces)
    mockedListMyReservations.mockResolvedValue(myReservations)

    render(<Reservations />)

    await waitFor(() => {
      expect(screen.getByText('Servicio temporalmente no disponible')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Reintentar/i }))

    await waitFor(() => {
      expect(mockedListCommonSpaces).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Sala A')).toBeInTheDocument()
    })
  })
})
