import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResidentFormDialog } from '../ResidentFormDialog'

vi.mock('../../../../services/bedrooms', () => ({
  listAvailableBedrooms: vi.fn().mockResolvedValue([]),
}))

const mockResident = {
  id: 1,
  full_name: 'Carlos Ruiz',
  email: 'carlos@test.com',
  is_active: true,
  bedroom_id: null,
  room: '',
  building: '',
  check_in_date: null,
  created_at: '2024-01-01T00:00:00Z',
}

describe('ResidentFormDialog — [NX-S2.27]', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(true),
    onUpdate: vi.fn().mockResolvedValue(true),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra título "Nuevo Residente" en modo creación', () => {
    render(<ResidentFormDialog {...defaultProps} />)
    expect(screen.getByText('Nuevo Residente')).toBeInTheDocument()
  })

  it('muestra título "Editar Residente" en modo edición', () => {
    render(<ResidentFormDialog {...defaultProps} resident={mockResident} />)
    expect(screen.getByText('Editar Residente')).toBeInTheDocument()
  })

  it('muestra error cuando el nombre está vacío', async () => {
    const user = userEvent.setup()
    render(<ResidentFormDialog {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Agregar residente/i }))
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
  })

  it('muestra error cuando el email es inválido', async () => {
    const user = userEvent.setup()
    render(<ResidentFormDialog {...defaultProps} />)
    await user.type(screen.getByLabelText('Nombre completo *'), 'Carlos')
    await user.type(screen.getByLabelText('Email *'), 'email-invalido')
    await user.click(screen.getByRole('button', { name: /Agregar residente/i }))
    expect(screen.getByText('El email no es válido.')).toBeInTheDocument()
  })

  it('exige habitación en modo creación', async () => {
    const user = userEvent.setup()
    render(<ResidentFormDialog {...defaultProps} />)
    await user.type(screen.getByLabelText('Nombre completo *'), 'Carlos')
    await user.type(screen.getByLabelText('Email *'), 'carlos@test.com')
    await user.click(screen.getByRole('button', { name: /Agregar residente/i }))
    expect(screen.getByText('Debes asignar una habitación al residente.')).toBeInTheDocument()
  })

  it('muestra error cuando la contraseña tiene menos de 8 caracteres', async () => {
    const user = userEvent.setup()
    render(<ResidentFormDialog {...defaultProps} />)
    await user.type(screen.getByLabelText(/Contraseña/), 'abc')
    await user.click(screen.getByRole('button', { name: /Agregar residente/i }))
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('no muestra el campo contraseña en modo edición', () => {
    render(<ResidentFormDialog {...defaultProps} resident={mockResident} />)
    expect(screen.queryByLabelText(/Contraseña/)).toBeNull()
  })

  it('no exige habitación en modo edición', async () => {
    const user = userEvent.setup()
    render(<ResidentFormDialog {...defaultProps} resident={mockResident} />)
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => {
      expect(screen.queryByText('Debes asignar una habitación al residente.')).toBeNull()
    })
  })

  it('llama a onUpdate con los datos correctos en modo edición', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(true)
    render(<ResidentFormDialog {...defaultProps} resident={mockResident} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }))
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ full_name: 'Carlos Ruiz', email: 'carlos@test.com' }),
      )
    })
  })
})
