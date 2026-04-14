import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminSpaces } from '../AdminSpaces'
import { listAdminSpaces, listSpaceReservations } from '../../../services/adminSpaces'

vi.mock('../../../services/adminSpaces', () => ({
  listAdminSpaces: vi.fn(),
  listSpaceReservations: vi.fn(),
  createSpace: vi.fn(),
  updateSpace: vi.fn(),
  deactivateSpace: vi.fn(),
  getSpace: vi.fn(),
}))

vi.mock('../../../services/reservations', () => ({
  isApiError: vi.fn(() => false),
}))

vi.mock('../components/SpaceFormSheet', () => ({
  SpaceFormSheet: () => null,
}))

vi.mock('../components/SpaceReservationsDrawer', () => ({
  SpaceReservationsDrawer: ({ open, space }: { open: boolean; space: { name: string } | null }) =>
    open && space ? <div data-testid="space-reservations-drawer">Reservas de {space.name}</div> : null,
}))

vi.mock('../components/SpaceDetailModal', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="space-detail-modal">Detalle</div> : null),
}))

describe('AdminSpaces — [T12]', () => {
  const mockedListAdminSpaces = vi.mocked(listAdminSpaces)
  const mockedListSpaceReservations = vi.mocked(listSpaceReservations)

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
