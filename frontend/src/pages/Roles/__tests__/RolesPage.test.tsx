import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import RolesPage from '../../RolesPage'
import { roleService, type Role } from '../../../services/roles'

vi.mock('../../../services/roles', () => ({
  roleService: {
    getRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
  },
}))

vi.mock('../../../components/RoleCard', () => ({
  default: ({ role, onEdit, onDelete }: { role: Role; onEdit: (role: Role) => void; onDelete: (id: number) => void }) => (
    <div data-testid={`role-card-${role.id}`}>
      <p>{role.name}</p>
      <p>{role.is_system_default ? 'Sistema' : 'Personalizado'}</p>
      <button type="button" onClick={() => onEdit(role)}>
        editar-{role.id}
      </button>
      <button type="button" onClick={() => onDelete(role.id)}>
        eliminar-{role.id}
      </button>
    </div>
  ),
}))

vi.mock('../../../components/RoleModal', () => ({
  default: ({
    isOpen,
    onClose,
    onSave,
    editingRole,
  }: {
    isOpen: boolean
    onClose: () => void
    onSave: (payload: { name: string; description: string; permissions: string[] }) => Promise<void>
    editingRole?: Role | null
  }) => {
    if (!isOpen) return null

    const payload = editingRole
      ? { name: `${editingRole.name} editado`, description: 'desc editada', permissions: ['roles'] }
      : { name: 'Nuevo rol desde modal', description: 'desc nueva', permissions: ['rooms'] }

    return (
      <div data-testid="role-modal-mock">
        <p>{editingRole ? `editando-${editingRole.id}` : 'creando'}</p>
        <button type="button" onClick={() => void onSave(payload)}>
          guardar-modal
        </button>
        <button type="button" onClick={onClose}>
          cerrar-modal
        </button>
      </div>
    )
  },
}))

const mockedRoleService = vi.mocked(roleService)

const baseRoles: Role[] = [
  {
    id: 1,
    name: 'Admin',
    description: 'Rol sistema',
    is_system_default: true,
    residence: null,
    permissions: [],
  },
  {
    id: 2,
    name: 'Conserjeria',
    description: 'Rol custom',
    is_system_default: false,
    residence: 10,
    permissions: ['rooms'],
  },
]

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))

    mockedRoleService.getRoles.mockResolvedValue(baseRoles)
    mockedRoleService.createRole.mockResolvedValue({
      id: 3,
      name: 'Nuevo rol desde modal',
      description: 'desc nueva',
      is_system_default: false,
      residence: 10,
      permissions: ['rooms'],
    })
    mockedRoleService.updateRole.mockResolvedValue({
      ...baseRoles[1],
      name: 'Conserjeria editado',
      permissions: ['roles'],
    })
    mockedRoleService.deleteRole.mockResolvedValue()
  })

  it('renderiza listado, búsqueda, filtro por tipo y estado vacío', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Conserjeria')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/i), 'conser')
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.getByText('Conserjeria')).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText(/Buscar por nombre/i))
    await user.selectOptions(screen.getByRole('combobox'), 'Sistema')

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByText('Conserjeria')).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/i), 'inexistente')
    expect(screen.getByText('No se encontraron roles.')).toBeInTheDocument()
  })

  it('abre modal en crear/editar y elimina rol con confirmación', async () => {
    const user = userEvent.setup()
    render(<RolesPage />)

    await waitFor(() => {
      expect(screen.getByText('Conserjeria')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Nuevo Rol/i }))
    expect(screen.getByTestId('role-modal-mock')).toBeInTheDocument()
    expect(screen.getByText('creando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /guardar-modal/i }))

    await waitFor(() => {
      expect(mockedRoleService.createRole).toHaveBeenCalledWith({
        name: 'Nuevo rol desde modal',
        description: 'desc nueva',
        permissions: ['rooms'],
      })
    })

    await user.click(screen.getByRole('button', { name: /editar-2/i }))
    expect(screen.getByText('editando-2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /guardar-modal/i }))

    await waitFor(() => {
      expect(mockedRoleService.updateRole).toHaveBeenCalledWith(2, {
        name: 'Conserjeria editado',
        description: 'desc editada',
        permissions: ['roles'],
      })
    })

    await user.click(screen.getByRole('button', { name: /eliminar-2/i }))

    await waitFor(() => {
      expect(mockedRoleService.deleteRole).toHaveBeenCalledWith(2)
      expect(screen.queryByText('Conserjeria')).not.toBeInTheDocument()
    })
  })
})
