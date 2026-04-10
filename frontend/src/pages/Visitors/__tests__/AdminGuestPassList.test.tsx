import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminGuestPassListPage } from '../AdminGuestPassList'

vi.mock('../../../services/guestPasses', () => ({
  rejectAdminGuestPass: vi.fn().mockResolvedValue({}),
  unrejectAdminGuestPass: vi.fn().mockResolvedValue({}),
  listAdminGuestPasses: vi.fn().mockResolvedValue([
    {
      id: 1,
      full_name: 'Juan Pérez',
      pass_code: 'GP-0001',
      resident_name: 'Ana García',
      valid_from: '2024-06-01T10:00:00Z',
      valid_until: '2024-06-01T12:00:00Z',
      created_at: '2024-05-30T09:00:00Z',
      status: 'ACTIVE',
      comment: 'Visita familiar',
    },
    {
      id: 2,
      full_name: 'María López',
      pass_code: 'GP-0002',
      resident_name: 'Pedro Ruiz',
      valid_from: '2024-06-02T10:00:00Z',
      valid_until: '2024-06-02T12:00:00Z',
      created_at: '2024-05-31T09:00:00Z',
      status: 'USED',
      comment: '',
    },
  ]),
  GuestPassApiError: class GuestPassApiError extends Error {},
}))

describe('AdminGuestPassListPage — [NX-S2.39 / NX-S2.40]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra la lista de pases tras cargar', async () => {
    render(<AdminGuestPassListPage />)
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      expect(screen.getByText('María López')).toBeInTheDocument()
    })
  })

  it('muestra el badge de estado correcto (Activo / Usado)', async () => {
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Usado')).toBeInTheDocument()
  })

  it('filtra pases por nombre del invitado', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))

    await user.type(screen.getByPlaceholderText(/Buscar/), 'Juan')

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(screen.queryByText('María López')).toBeNull()
  })

  it('filtra pases por código de pase', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))

    await user.type(screen.getByPlaceholderText(/Buscar/), 'GP-0002')

    expect(screen.queryByText('Juan Pérez')).toBeNull()
    expect(screen.getByText('María López')).toBeInTheDocument()
  })

  it('muestra "No hay pases que coincidan" cuando la búsqueda no tiene resultados', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))

    await user.type(screen.getByPlaceholderText(/Buscar/), 'xyz-inexistente')

    expect(screen.getByText('No hay pases que coincidan.')).toBeInTheDocument()
  })

  it('abre el diálogo de detalle al hacer clic en un pase', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))

    // Clic en la tarjeta (role="button")
    const passCard = screen.getByRole('button', { name: /Juan Pérez/i })
    await user.click(passCard)

    // El diálogo muestra los datos del detalle
    await waitFor(() => {
      expect(screen.getByText('Código de pase')).toBeInTheDocument()
      expect(screen.getByText('Período de validez')).toBeInTheDocument()
    })
  })

  it('el diálogo de detalle muestra el nombre del residente registrador', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassListPage />)
    await waitFor(() => screen.getByText('Juan Pérez'))

    const passCard = screen.getByRole('button', { name: /Juan Pérez/i })
    await user.click(passCard)

    await waitFor(() => {
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Registrado por')).toBeInTheDocument()
    })
  })

  it('muestra el comentario del pase cuando existe', async () => {
    render(<AdminGuestPassListPage />)
    await waitFor(() => {
      // El comentario se muestra en la tarjeta de la lista
      expect(screen.getByText('"Visita familiar"')).toBeInTheDocument()
    })
  })
})
