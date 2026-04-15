import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RoleModal from '../../../components/RoleModal'
import type { Role } from '../../../services/roles'

const editingRole: Role = {
  id: 10,
  name: 'Conserjeria',
  description: 'Gestión de accesos',
  is_system_default: false,
  residence: 1,
  permissions: ['rooms'],
}

describe('RoleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra modo creación y modo edición con datos precargados', () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    const { rerender } = render(
      <RoleModal isOpen onClose={onClose} onSave={onSave} editingRole={null} />,
    )

    expect(screen.getByText('Nuevo Rol')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Mantenimiento')).toHaveValue('')

    rerender(
      <RoleModal isOpen onClose={onClose} onSave={onSave} editingRole={editingRole} />,
    )

    expect(screen.getByText('Editar Rol')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej: Mantenimiento')).toHaveValue('Conserjeria')
    expect(screen.getByPlaceholderText('Describe las funciones...')).toHaveValue('Gestión de accesos')
  })

  it('valida nombre obligatorio y no envía submit si está vacío', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<RoleModal isOpen onClose={onClose} onSave={onSave} editingRole={null} />)

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('permite marcar permisos con checkboxes y envía payload en creación', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<RoleModal isOpen onClose={onClose} onSave={onSave} editingRole={null} />)

    await user.type(screen.getByPlaceholderText('Ej: Mantenimiento'), 'Mantenimiento')
    await user.type(screen.getByPlaceholderText('Describe las funciones...'), 'Equipo técnico')

    await user.click(screen.getByRole('button', { name: /Seleccionar módulos permitidos/i }))
    await user.click(screen.getByLabelText('Avisos'))
    await user.click(screen.getByLabelText('Roles'))

    expect(screen.getByRole('button', { name: /2 módulos seleccionados/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        name: 'Mantenimiento',
        description: 'Equipo técnico',
        permissions: ['announcements', 'roles'],
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('envía cambios en edición, muestra loading y recupera error de submit', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    let resolveSave: (() => void) | null = null
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve
    })
    const onSave = vi
      .fn()
      .mockReturnValueOnce(pendingSave)
      .mockRejectedValueOnce(new Error('No se pudo guardar'))

    render(<RoleModal isOpen onClose={onClose} onSave={onSave} editingRole={editingRole} />)

    const nameInput = screen.getByPlaceholderText('Ej: Mantenimiento')
    await user.clear(nameInput)
    await user.type(nameInput, 'Conserjeria Plus')

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled()

    resolveSave?.()

    await waitFor(() => {
      expect(onSave).toHaveBeenNthCalledWith(1, {
        name: 'Conserjeria Plus',
        description: 'Gestión de accesos',
        permissions: ['rooms'],
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: /^Guardar$/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenNthCalledWith(2, {
        name: 'Conserjeria Plus',
        description: 'Gestión de accesos',
        permissions: ['rooms'],
      })
      expect(screen.getByText('No se pudo guardar')).toBeInTheDocument()
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
