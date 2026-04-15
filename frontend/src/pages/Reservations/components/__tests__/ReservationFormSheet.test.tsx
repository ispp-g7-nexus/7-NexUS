import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReservationFormSheet } from '../ReservationFormSheet'
import { createReservation, getSpaceAvailability, ApiError } from '../../../../services/reservations'

vi.mock('../../../../services/reservations', () => ({
  createReservation: vi.fn(),
  getSpaceAvailability: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../../../../components/ui/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockedCreateReservation = vi.mocked(createReservation)
const mockedGetSpaceAvailability = vi.mocked(getSpaceAvailability)

const space = {
  id: 1,
  name: 'Sala A',
  description: '',
  img: '',
  capacity: 4,
  is_active: true,
  open_time: '08:00:00',
  close_time: '22:00:00',
  reservation_interval_minutes: 60,
}

describe('ReservationFormSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetSpaceAvailability.mockResolvedValue({
      date: '2099-06-01',
      space,
      reservations: [],
      available_slots: [
        { start_time: '2099-06-01T10:00:00Z', end_time: '2099-06-01T11:00:00Z', status: 'available' },
        { start_time: '2099-06-01T11:00:00Z', end_time: '2099-06-01T12:00:00Z', status: 'occupied' },
      ],
    })
    mockedCreateReservation.mockResolvedValue({
      id: 1,
      space: { id: 1, name: 'Sala A' },
      user: { id: 1, first_name: 'Juan', last_name: 'Pérez', email: 'juan@test.com' },
      residence_id: 1,
      start_time: '2099-06-01T10:00:00Z',
      end_time: '2099-06-01T11:00:00Z',
      status: 'active',
      notes: '',
      created_at: '2099-05-30T10:00:00Z',
      updated_at: '2099-05-30T10:00:00Z',
    })
  })

  it('carga disponibilidad y crea una reserva al confirmar', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    render(
      <ReservationFormSheet
        open
        initialDate="2099-06-01"
        space={space}
        onOpenChange={vi.fn()}
        onSuccess={onSuccess}
      />,
    )

    await waitFor(() => {
      expect(mockedGetSpaceAvailability).toHaveBeenCalledWith(1, '2099-06-01')
      expect(screen.getByText(/Horas disponibles/i)).toBeInTheDocument()
    })

    const availableSlot = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('10:00'))
    expect(availableSlot).toBeDefined()

    await user.click(availableSlot!)
    await user.type(screen.getByPlaceholderText(/reunión del grupo de proyecto/i), 'Trabajo final')
    await user.click(screen.getByRole('button', { name: /Confirmar reserva/i }))

    await waitFor(() => {
      expect(mockedCreateReservation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          start_time: '2099-06-01T10:00:00Z',
          end_time: '2099-06-01T11:00:00Z',
          notes: 'Trabajo final',
        }),
      )
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deshabilita tramos ocupados o pasados', async () => {
    mockedGetSpaceAvailability.mockResolvedValue({
      date: '2099-06-01',
      space,
      reservations: [],
      available_slots: [
        { start_time: '2099-06-01T08:00:00Z', end_time: '2099-06-01T09:00:00Z', status: 'past' },
        { start_time: '2099-06-01T10:00:00Z', end_time: '2099-06-01T11:00:00Z', status: 'occupied' },
      ],
    })

    render(
      <ReservationFormSheet
        open
        initialDate="2099-06-01"
        space={space}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      const buttons = screen
        .getAllByRole('button')
        .filter((button) => button.textContent?.includes('08:00') || button.textContent?.includes('10:00'))
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((button) => expect(button).toBeDisabled())
    })
  })

  it('muestra error de backend 400 y refresca disponibilidad', async () => {
    const user = userEvent.setup()
    mockedCreateReservation.mockRejectedValue(new ApiError('Esa franja ya no está disponible', 400))

    render(
      <ReservationFormSheet
        open
        initialDate="2099-06-01"
        space={space}
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Horas disponibles/i)).toBeInTheDocument()
    })

    const availableSlot = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('10:00'))
    await user.click(availableSlot!)
    await user.click(screen.getByRole('button', { name: /Confirmar reserva/i }))

    await waitFor(() => {
      expect(mockedCreateReservation).toHaveBeenCalledTimes(1)
      expect(mockedGetSpaceAvailability).toHaveBeenCalledTimes(2)
    })
  })
})
