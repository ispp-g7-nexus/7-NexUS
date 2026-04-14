import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SpaceAvailabilityCard } from '../SpaceAvailabilityCard'

const space = {
  id: 1,
  name: 'Sala A',
  description: 'Principal',
  img: '',
  capacity: 4,
  is_active: true,
  open_time: '08:00:00',
  close_time: '22:00:00',
  reservation_interval_minutes: 60,
}

describe('SpaceAvailabilityCard', () => {
  it('muestra tramos disponibles y permite reservar', async () => {
    const user = userEvent.setup()
    const onReserve = vi.fn()

    render(
      <SpaceAvailabilityCard
        space={space}
        selectedDate="2026-04-14"
        loading={false}
        onReserve={onReserve}
        availability={{
          date: '2026-04-14',
          space,
          reservations: [],
          available_slots: [
            { start_time: '2026-04-14T10:00:00Z', end_time: '2026-04-14T11:00:00Z', status: 'available' },
            { start_time: '2026-04-14T11:00:00Z', end_time: '2026-04-14T12:00:00Z', status: 'occupied' },
            { start_time: '2026-04-14T12:00:00Z', end_time: '2026-04-14T13:00:00Z', status: 'past' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Con disponibilidad')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reservar/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Reservar/i }))
    expect(onReserve).toHaveBeenCalledWith(space)
  })

  it('deshabilita reservar cuando no hay huecos', () => {
    render(
      <SpaceAvailabilityCard
        space={space}
        selectedDate="2026-04-14"
        loading={false}
        onReserve={vi.fn()}
        availability={{
          date: '2026-04-14',
          space,
          reservations: [],
          available_slots: [
            { start_time: '2026-04-14T10:00:00Z', end_time: '2026-04-14T11:00:00Z', status: 'occupied' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Sin huecos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reservar/i })).toBeDisabled()
  })

  it('muestra estado loading de disponibilidad', () => {
    render(
      <SpaceAvailabilityCard
        space={space}
        selectedDate="2026-04-14"
        loading
        onReserve={vi.fn()}
      />,
    )

    expect(screen.getByText(/Cargando disponibilidad/i)).toBeInTheDocument()
    expect(screen.getByText(/Calculando huecos/i)).toBeInTheDocument()
  })
})
