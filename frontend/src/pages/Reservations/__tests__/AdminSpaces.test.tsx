import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminSpaces } from '../AdminSpaces'
import {
  createSpace,
  deactivateSpace,
  listAdminSpaces,
  listSpaceReservations,
  updateSpace,
} from '../../../services/adminSpaces'
import { ApiError } from '../../../services/reservations'

vi.mock('../../../services/adminSpaces', () => ({
  listAdminSpaces: vi.fn(),
  createSpace: vi.fn(),
  updateSpace: vi.fn(),
  deactivateSpace: vi.fn(),
  listSpaceReservations: vi.fn(),
  getSpace: vi.fn(),
}))

vi.mock('../components/SpaceFormSheet', () => ({
  SpaceFormSheet: ({ open, space, onSubmit }: { open: boolean; space: { name: string } | null; onSubmit: (payload: unknown) => Promise<void> }) => {
    if (!open) return null
    const payload = {
      name: space ? `${space.name} Editada` : 'Sala Nueva',
      description: 'desc',
      capacity: 4,
      open_time: '09:00',
      close_time: '18:00',
      reservation_interval_minutes: 30,
      is_active: true,
      img: '',
    }
    return (
      <button type="button" onClick={() => void onSubmit(payload)}>
        {space ? 'mock-edit-submit' : 'mock-create-submit'}
      </button>
    )
  },
}))

vi.mock('../components/SpaceReservationsDrawer', () => ({
  SpaceReservationsDrawer: ({
    open,
    reservations = [],
    onStatusFilterChange,
    space,
  }: {
    open: boolean
    reservations?: Array<unknown>
    onStatusFilterChange?: (status: 'all' | 'active' | 'cancelled') => void
    space?: { name: string } | null
  }) => {
    if (!open) return null
    return (
      <div data-testid="space-reservations-drawer">
        <p>drawer-open</p>
        <p>reservas: {reservations.length}</p>
        {space ? <p>Reservas de {space.name}</p> : null}
        <button type="button" onClick={() => onStatusFilterChange?.('cancelled')}>
          filtro-cancelled
        </button>
      </div>
    )
  },
}))

vi.mock('../components/SpaceDetailModal', () => ({
  __esModule: true,
  default: ({
    open,
    onEdit,
    onDeactivate,
  }: {
    open: boolean
    onEdit?: (space: unknown) => void
    onDeactivate?: (space: unknown) => void
  }) => {
    if (!open) return null
    const mockSpace = {
      id: 1,
      name: 'Sala A',
      description: '',
      capacity: 3,
      is_active: true,
      open_time: '08:00:00',
      close_time: '22:00:00',
      reservation_interval_minutes: 60,
      img: null,
    }
    return (
      <div data-testid="space-detail-modal">
        <button type="button" onClick={() => onEdit?.(mockSpace)}>
          mock-detail-edit
        </button>
        <button type="button" onClick={() => onDeactivate?.(mockSpace)}>
          mock-detail-deactivate
        </button>
      </div>
    )
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockedListAdminSpaces = vi.mocked(listAdminSpaces)
const mockedListSpaceReservations = vi.mocked(listSpaceReservations)
const mockedCreateSpace = vi.mocked(createSpace)
const mockedUpdateSpace = vi.mocked(updateSpace)
const mockedDeactivateSpace = vi.mocked(deactivateSpace)

const sampleSpaces = [
  {
    id: 1,
    name: 'Sala A',
    description: 'Principal',
    img: null,
    capacity: 3,
    is_active: true,
    open_time: '08:00:00',
    close_time: '22:00:00',
    reservation_interval_minutes: 60,
  },
]

describe('AdminSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListAdminSpaces.mockResolvedValue(sampleSpaces)
    mockedListSpaceReservations.mockResolvedValue([])
    mockedCreateSpace.mockResolvedValue(sampleSpaces[0])
    mockedUpdateSpace.mockResolvedValue(sampleSpaces[0])
    mockedDeactivateSpace.mockResolvedValue()
  })

  it('lista espacios y carga reservas al abrir "Ver reservas"', async () => {
    const user = userEvent.setup()
    mockedListSpaceReservations.mockResolvedValue([
      {
        id: 21,
        space: { id: 1, name: 'Sala A' },
        user: { id: 2, first_name: 'Ana', last_name: 'Ruiz', email: 'ana@test.com' },
        residence_id: 1,
        start_time: '2026-04-14T10:00:00Z',
        end_time: '2026-04-14T11:00:00Z',
        status: 'active',
        notes: '',
        created_at: '2026-04-13T10:00:00Z',
        updated_at: '2026-04-13T10:00:00Z',
      },
    ])

    render(<AdminSpaces />)

    await waitFor(() => {
      expect(screen.getByText('Sala A')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Ver reservas/i }))

    await waitFor(() => {
      expect(mockedListSpaceReservations).toHaveBeenCalledWith(1, 'active')
      expect(screen.getByText('drawer-open')).toBeInTheDocument()
      expect(screen.getByText('reservas: 1')).toBeInTheDocument()
    })
  })

  it('crea y actualiza un espacio usando el formulario', async () => {
    const user = userEvent.setup()
    render(<AdminSpaces />)

    await waitFor(() => screen.getByText('Sala A'))

    await user.click(screen.getByRole('button', { name: /Nuevo espacio/i }))
    await user.click(screen.getByRole('button', { name: /mock-create-submit/i }))

    await waitFor(() => {
      expect(mockedCreateSpace).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: /Ver detalles de Sala A/i }))
    await user.click(screen.getByRole('button', { name: /mock-detail-edit/i }))
    await user.click(screen.getByRole('button', { name: /mock-edit-submit/i }))

    await waitFor(() => {
      expect(mockedUpdateSpace).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Sala A Editada' }))
    })
  })

  it('desactiva un espacio desde el modal de confirmación', async () => {
    const user = userEvent.setup()
    render(<AdminSpaces />)

    await waitFor(() => screen.getByText('Sala A'))

    await user.click(screen.getByRole('button', { name: /Ver detalles de Sala A/i }))
    await user.click(screen.getByRole('button', { name: /mock-detail-deactivate/i }))

    await waitFor(() => {
      expect(screen.getByText(/¿Desactivar espacio\?/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^Desactivar$/i }))

    await waitFor(() => {
      expect(mockedDeactivateSpace).toHaveBeenCalledWith(1)
    })
  })

  it('muestra estado de no autorizado para 401/403', async () => {
    mockedListAdminSpaces.mockRejectedValue(new ApiError('No autorizado', 403))

    render(<AdminSpaces />)

    await waitFor(() => {
      expect(screen.getByText('Acceso no autorizado')).toBeInTheDocument()
      expect(screen.getByText(/permisos de administrador/i)).toBeInTheDocument()
    })
  })
})

describe('AdminSpaces — [T12]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedListAdminSpaces.mockResolvedValue([
      {
        id: 7,
        name: 'Sala Estudio',
        description: 'Sala para trabajo colaborativo',
        img: null,
        capacity: 12,
        is_active: true,
        open_time: '08:00:00',
        close_time: '22:00:00',
        reservation_interval_minutes: 60,
      },
    ])
    mockedListSpaceReservations.mockResolvedValue([])
  })

  it('mantiene la fila de acciones por encima del overlay de detalle', async () => {
    render(<AdminSpaces />)

    const viewReservationsButton = await screen.findByRole('button', { name: 'Ver reservas' })
    const actionsRow = viewReservationsButton.parentElement

    expect(actionsRow).not.toBeNull()
    expect(actionsRow).toHaveClass('relative')
    expect(actionsRow).toHaveClass('z-20')
  })

  it("abre reservas al pulsar 'Ver reservas' y no el detalle", async () => {
    const user = userEvent.setup()
    render(<AdminSpaces />)

    const viewReservationsButton = await screen.findByRole('button', { name: 'Ver reservas' })
    await user.click(viewReservationsButton)

    await waitFor(() => {
      expect(mockedListSpaceReservations).toHaveBeenCalledWith(7, 'active')
    })
    expect(screen.getByTestId('space-reservations-drawer')).toBeInTheDocument()
    expect(screen.queryByTestId('space-detail-modal')).toBeNull()
  })
})
