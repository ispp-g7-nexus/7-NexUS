import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MyReservations } from '../MyReservations'

const baseObject = {
  id: 1,
  name: 'Taladro',
  description: '',
  location: 'Trastero',
  availability: true,
  stock_total: 2,
  current_reserved_stock: 0,
  current_available_stock: 2,
  image_url: '',
  tags: '',
  labels: [],
  rentals_count: 1,
  can_rent: true,
}

describe('MyReservations (objects)', () => {
  it('muestra estado vacío cuando no hay reservas', () => {
    render(
      <MyReservations
        reservations={[]}
        loading={false}
        error={null}
        cancellingRentalId={null}
        dismissingRentalId={null}
        onCancel={vi.fn()}
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('No tienes reservas')).toBeInTheDocument()
  })

  it('permite cancelar una reserva activa', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <MyReservations
        reservations={[
          {
            object: baseObject,
            rental: {
              id: 10,
              start_date: '2099-04-14T10:00:00Z',
              end_date: '2099-04-14T10:55:00Z',
              status: 'ACTIVE',
              user: { id: 1, first_name: 'Juan', last_name: 'Pérez' },
            },
          },
        ]}
        loading={false}
        error={null}
        cancellingRentalId={null}
        dismissingRentalId={null}
        onCancel={onCancel}
        onDismiss={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(onCancel).toHaveBeenCalledWith(1, 10)
  })

  it('permite descartar reserva cancelada y abrir detalle de motivo', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    const longReason = 'Motivo largo '.repeat(40)

    render(
      <MyReservations
        reservations={[
          {
            object: baseObject,
            rental: {
              id: 11,
              start_date: '2026-04-14T10:00:00Z',
              end_date: '2026-04-14T10:55:00Z',
              status: 'CANCELLED',
              admin_cancelled_reason: longReason,
              admin_cancelled_at: '2026-04-14T09:00:00Z',
              user: { id: 1, first_name: 'Juan', last_name: 'Pérez' },
            },
          },
        ]}
        loading={false}
        error={null}
        cancellingRentalId={null}
        dismissingRentalId={null}
        onCancel={vi.fn()}
        onDismiss={onDismiss}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Ver detalle/i }))
    expect(screen.getByText('Detalle del motivo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Descartar/i }))
    expect(onDismiss).toHaveBeenCalledWith(11)
  })

  it('muestra error y permite reintentar', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <MyReservations
        reservations={[]}
        loading={false}
        error="Error al cargar reservas"
        cancellingRentalId={null}
        dismissingRentalId={null}
        onCancel={vi.fn()}
        onDismiss={vi.fn()}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Error al cargar reservas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Reintentar/i }))

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })
})
