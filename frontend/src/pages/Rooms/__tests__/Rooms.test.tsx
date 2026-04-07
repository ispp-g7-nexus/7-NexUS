import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Rooms from '../Rooms'

vi.mock('../../../services/bedrooms', () => ({
  listBedrooms: vi.fn().mockResolvedValue([
    {
      id: 1,
      numero: '101',
      edificio: 'A',
      planta: 1,
      tipo: 'Doble',
      capacidad_maxima: 2,
      ocupantes_actuales: 1,
      is_active: true,
      residentes: [{ id: 10, full_name: 'Carlos Ruiz', email: 'carlos@test.com' }],
    },
  ]),
  createBedroom: vi.fn().mockResolvedValue({ id: 2 }),
  deleteBedroom: vi.fn().mockResolvedValue({}),
  updateBedroom: vi.fn().mockResolvedValue({}),
  listAvailableBedrooms: vi.fn().mockResolvedValue([]),
}))

// sonner toast no es necesario en jsdom
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('Rooms — [NX-S2.03]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra la habitación tras cargar', async () => {
    render(<Rooms />)
    await waitFor(() => {
      expect(screen.getByText('101-A')).toBeInTheDocument()
    })
  })

  it('muestra tipo y ocupación en la tarjeta de lista', async () => {
    render(<Rooms />)
    await waitFor(() => screen.getByText('101-A'))
    // "Planta 1 · Doble · 1/2 ocupantes" como texto del párrafo
    expect(screen.getByText(/1\/2 ocupantes/)).toBeInTheDocument()
  })

  it('abre el panel de detalle al hacer clic en "Ver detalles"', async () => {
    const user = userEvent.setup()
    render(<Rooms />)
    await waitFor(() => screen.getByText('101-A'))

    await user.click(screen.getByRole('button', { name: /Ver detalles/i }))

    expect(screen.getByText('Habitación 101')).toBeInTheDocument()
  })

  it('el panel de detalle muestra el tipo de la habitación', async () => {
    const user = userEvent.setup()
    render(<Rooms />)
    await waitFor(() => screen.getByText('101-A'))

    await user.click(screen.getByRole('button', { name: /Ver detalles/i }))

    // "Doble" aparece como texto aislado en el panel (en la lista es parte de la frase)
    expect(screen.getByText('Doble')).toBeInTheDocument()
  })

  it('el panel de detalle muestra la ocupación', async () => {
    const user = userEvent.setup()
    render(<Rooms />)
    await waitFor(() => screen.getByText('101-A'))

    await user.click(screen.getByRole('button', { name: /Ver detalles/i }))

    expect(screen.getByText('1/2 ocupantes')).toBeInTheDocument()
  })

  it('el panel de detalle se cierra al hacer clic en el fondo', async () => {
    const user = userEvent.setup()
    render(<Rooms />)
    await waitFor(() => screen.getByText('101-A'))

    await user.click(screen.getByRole('button', { name: /Ver detalles/i }))
    expect(screen.getByText('Habitación 101')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cerrar detalle/i }))
    expect(screen.queryByText('Habitación 101')).toBeNull()
  })
})
