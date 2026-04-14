import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SpaceDetailModal from '../SpaceDetailModal'
import { getSpace } from '../../../../services/adminSpaces'

vi.mock('../../../../services/adminSpaces', () => ({
  getSpace: vi.fn(),
}))

const mockedGetSpace = vi.mocked(getSpace)

describe('SpaceDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza datos del espacio y botón de editar', async () => {
    mockedGetSpace.mockResolvedValue({
      id: 1,
      name: 'Sala Estudio',
      description: 'Silenciosa',
      img: null,
      capacity: 10,
      is_active: true,
      open_time: '08:00:00',
      close_time: '22:00:00',
      reservation_interval_minutes: 60,
    })

    render(<SpaceDetailModal open spaceId={1} onClose={vi.fn()} onEdit={vi.fn()} onDeactivate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Sala Estudio')).toBeInTheDocument()
      expect(screen.getByText('10 personas')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Editar información/i })).toBeInTheDocument()
    })
  })

  it('muestra imagen cuando está disponible', async () => {
    mockedGetSpace.mockResolvedValue({
      id: 1,
      name: 'Sala Cine',
      description: '',
      img: 'https://example.com/sala.jpg',
      capacity: 20,
      is_active: true,
      open_time: '10:00:00',
      close_time: '23:00:00',
      reservation_interval_minutes: 30,
    })

    render(<SpaceDetailModal open spaceId={1} onClose={vi.fn()} />)

    await waitFor(() => {
      const image = screen.getByRole('img', { name: /Sala Cine/i })
      expect(image).toBeInTheDocument()
    })
  })

  it('dispara callbacks de editar y desactivar', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDeactivate = vi.fn()

    mockedGetSpace.mockResolvedValue({
      id: 1,
      name: 'Sala Ping Pong',
      description: '',
      img: null,
      capacity: 6,
      is_active: true,
      open_time: '09:00:00',
      close_time: '22:00:00',
      reservation_interval_minutes: 60,
    })

    render(<SpaceDetailModal open spaceId={1} onClose={vi.fn()} onEdit={onEdit} onDeactivate={onDeactivate} />)

    await waitFor(() => screen.getByText('Sala Ping Pong'))

    await user.click(screen.getByRole('button', { name: /Editar información/i }))
    await user.click(screen.getByRole('button', { name: /Desactivar/i }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDeactivate).toHaveBeenCalledTimes(1)
  })
})
