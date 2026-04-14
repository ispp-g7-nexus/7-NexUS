import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Objects } from '../Objects'
import { objectsService } from '../../../services/objects'

vi.mock('../../../services/objects', () => ({
  objectsService: {
    getObjects: vi.fn(),
    getObjectAvailability: vi.fn(),
    getUserObjectReservations: vi.fn(),
    getUserObjectNotifications: vi.fn(),
    cancelReservation: vi.fn(),
    dismissUserReservation: vi.fn(),
  },
}))

vi.mock('../components/ObjectsList', () => ({
  ObjectsList: ({ objects, onReserve }: any) => (
    <div>
      <p>objects-list:{objects.length}</p>
      {objects.map((object: any) => (
        <div key={object.id}>
          <span>{object.name}</span>
          <button type="button" onClick={() => onReserve(object)}>
            reserve-{object.id}
          </button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('../components/MyReservations', () => ({
  MyReservations: ({ reservations, onCancel, onDismiss }: any) => (
    <div>
      <p>my-objects-reservations:{reservations.length}</p>
      {reservations.map((reservation: any) => (
        <div key={reservation.rental.id}>
          <button type="button" onClick={() => onCancel(reservation.object.id, reservation.rental.id)}>
            cancel-{reservation.rental.id}
          </button>
          <button type="button" onClick={() => onDismiss(reservation.rental.id)}>
            dismiss-{reservation.rental.id}
          </button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('../components/ReservationModal', () => ({
  ReservationModal: ({ isOpen, onSuccess }: any) =>
    isOpen ? (
      <button type="button" onClick={onSuccess}>
        reservation-modal-success
      </button>
    ) : null,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const mockedObjectsService = vi.mocked(objectsService)

const objectA = {
  id: 1,
  name: 'Bicicleta',
  description: 'Montaña',
  location: 'Garaje',
  availability: true,
  stock_total: 2,
  current_reserved_stock: 0,
  current_available_stock: 2,
  image_url: '',
  tags: 'deporte',
  labels: [],
  rentals_count: 0,
  can_rent: true,
}

const objectB = {
  ...objectA,
  id: 2,
  name: 'Proyector',
  location: 'Recepción',
  tags: 'tecnología',
}

const userReservation = {
  rental: {
    id: 10,
    start_date: '2026-04-14T10:00:00Z',
    end_date: '2026-04-14T10:55:00Z',
    status: 'ACTIVE' as const,
    user: { id: 1, first_name: 'Juan', last_name: 'Pérez' },
  },
  object: objectA,
}

describe('Objects page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedObjectsService.getObjects.mockResolvedValue([objectA, objectB])
    mockedObjectsService.getObjectAvailability.mockResolvedValue({
      date: '2026-04-14',
      reservation_interval_minutes: 60,
      object: objectA,
      reservations: [],
      available_slots: [],
    })
    mockedObjectsService.getUserObjectReservations.mockResolvedValue([userReservation])
    mockedObjectsService.getUserObjectNotifications.mockResolvedValue([])
    mockedObjectsService.cancelReservation.mockResolvedValue({ detail: 'ok' })
    mockedObjectsService.dismissUserReservation.mockResolvedValue({ detail: 'ok' })
  })

  it('carga objetos, reservas y notificaciones al iniciar', async () => {
    render(<Objects />)

    await waitFor(() => {
      expect(mockedObjectsService.getObjects).toHaveBeenCalledTimes(1)
      expect(mockedObjectsService.getUserObjectReservations).toHaveBeenCalledTimes(1)
      expect(mockedObjectsService.getUserObjectNotifications).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Bicicleta')).toBeInTheDocument()
      expect(screen.getByText('Proyector')).toBeInTheDocument()
      expect(screen.getByText('my-objects-reservations:1')).toBeInTheDocument()
    })
  })

  it('filtra por búsqueda en cliente', async () => {
    const user = userEvent.setup()
    render(<Objects />)

    await waitFor(() => screen.getByText('Bicicleta'))

    await user.type(screen.getByPlaceholderText(/Buscar objetos/i), 'Proyector')

    expect(screen.queryByText('Bicicleta')).toBeNull()
    expect(screen.getByText('Proyector')).toBeInTheDocument()
    expect(screen.getByText('objects-list:1')).toBeInTheDocument()
  })

  it('abre el modal de reserva y refresca datos tras éxito', async () => {
    const user = userEvent.setup()
    const onReservationSuccess = vi.fn()

    render(<Objects onReservationSuccess={onReservationSuccess} />)

    await waitFor(() => screen.getByText('Bicicleta'))

    await user.click(screen.getByRole('button', { name: /reserve-1/i }))
    await user.click(screen.getByRole('button', { name: /reservation-modal-success/i }))

    await waitFor(() => {
      expect(mockedObjectsService.getObjects).toHaveBeenCalledTimes(2)
      expect(mockedObjectsService.getUserObjectReservations).toHaveBeenCalledTimes(2)
      expect(onReservationSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('permite cancelar y descartar reservas del usuario', async () => {
    const user = userEvent.setup()
    render(<Objects />)

    await waitFor(() => screen.getByText('my-objects-reservations:1'))

    await user.click(screen.getByRole('button', { name: /cancel-10/i }))
    await user.click(screen.getByRole('button', { name: /dismiss-10/i }))

    await waitFor(() => {
      expect(mockedObjectsService.cancelReservation).toHaveBeenCalledWith(1, { rental_id: 10 })
      expect(mockedObjectsService.dismissUserReservation).toHaveBeenCalledWith(10)
    })
  })
})
