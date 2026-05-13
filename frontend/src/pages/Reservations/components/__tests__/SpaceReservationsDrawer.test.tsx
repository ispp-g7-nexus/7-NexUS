import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SpaceReservationsDrawer } from '../SpaceReservationsDrawer'

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

describe('SpaceReservationsDrawer', () => {
  it('renderiza reservas y estado', () => {
    render(
      <SpaceReservationsDrawer
        open
        space={space}
        reservations={[
          {
            id: 1,
            space: { id: 1, name: 'Sala A' },
            user: { id: 2, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@test.com' },
            residence_id: 1,
            start_time: '2026-04-14T10:00:00Z',
            end_time: '2026-04-14T11:00:00Z',
            status: 'active',
            notes: 'Trabajo en equipo',
            created_at: '2026-04-13T10:00:00Z',
            updated_at: '2026-04-13T10:00:00Z',
          },
        ]}
        loading={false}
        statusFilter="active"
        onStatusFilterChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Sala A')).toBeInTheDocument()
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    const noteText = screen.getByText(/Nota: Trabajo en equipo/i)
    expect(noteText).toBeInTheDocument()
    expect(noteText).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
      '[overflow-wrap:anywhere]',
      '[word-break:break-word]',
    )
  })

  it('dispara cambio de filtro al pulsar pestañas', async () => {
    const user = userEvent.setup()
    const onStatusFilterChange = vi.fn()

    render(
      <SpaceReservationsDrawer
        open
        space={space}
        reservations={[]}
        loading={false}
        statusFilter="active"
        onStatusFilterChange={onStatusFilterChange}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Canceladas/i }))
    expect(onStatusFilterChange).toHaveBeenCalledWith('cancelled')
  })

  it('muestra estados de loading y vacío', () => {
    const { rerender } = render(
      <SpaceReservationsDrawer
        open
        space={space}
        reservations={[]}
        loading
        statusFilter="active"
        onStatusFilterChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText(/Cargando reservas/i)).toBeInTheDocument()

    rerender(
      <SpaceReservationsDrawer
        open
        space={space}
        reservations={[]}
        loading={false}
        statusFilter="active"
        onStatusFilterChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText(/No hay reservas con este filtro/i)).toBeInTheDocument()
  })
})
