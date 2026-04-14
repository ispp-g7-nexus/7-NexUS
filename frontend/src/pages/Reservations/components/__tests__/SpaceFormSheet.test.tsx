import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceFormSheet } from '../SpaceFormSheet'

describe('SpaceFormSheet', () => {
  const baseProps = {
    open: true,
    space: null,
    isSubmitting: false,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía el formulario de creación con valores por defecto y nombre', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<SpaceFormSheet {...baseProps} onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText(/Salón de usos múltiples/i), 'Sala Biblioteca')
    await user.click(screen.getByRole('button', { name: /Crear espacio/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sala Biblioteca',
          capacity: 1,
          open_time: '08:00',
          close_time: '22:00',
          reservation_interval_minutes: 60,
          is_active: true,
        }),
      )
    })
  })

  it('muestra modo edición con valores precargados', () => {
    render(
      <SpaceFormSheet
        {...baseProps}
        space={{
          id: 1,
          name: 'Sala Música',
          description: 'Con piano',
          img: null,
          capacity: 8,
          is_active: true,
          open_time: '09:00:00',
          close_time: '21:00:00',
          reservation_interval_minutes: 30,
        }}
      />,
    )

    expect(screen.getByText('Editar espacio')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sala Música')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument()
  })

  it('muestra estado loading y permite cerrar', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(<SpaceFormSheet {...baseProps} isSubmitting onOpenChange={onOpenChange} />)

    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Cerrar/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
