import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActiveGuestPassesPage } from '../ActiveGuestPasses'
import {
  cancelMyGuestPass,
  createMyGuestPass,
  getMyGuestPassPolicy,
  GuestPassApiError,
  listMyActiveGuestPasses,
  listMyGuestPassHistory,
  listMyUpcomingGuestPasses,
} from '../../../services/guestPasses'

vi.mock('../../../components/announcement/NotificationBell', () => ({
  NotificationBell: () => <div>notification-bell</div>,
}))

vi.mock('../../../services/guestPasses', () => ({
  listMyActiveGuestPasses: vi.fn(),
  listMyUpcomingGuestPasses: vi.fn(),
  listMyGuestPassHistory: vi.fn(),
  getMyGuestPassPolicy: vi.fn(),
  createMyGuestPass: vi.fn(),
  cancelMyGuestPass: vi.fn(),
  GuestPassApiError: class GuestPassApiError extends Error {
    status: number
    fieldErrors: Record<string, string>

    constructor(message: string, status = 400, fieldErrors: Record<string, string> = {}) {
      super(message)
      this.status = status
      this.fieldErrors = fieldErrors
    }
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockedListActive = vi.mocked(listMyActiveGuestPasses)
const mockedListUpcoming = vi.mocked(listMyUpcomingGuestPasses)
const mockedListHistory = vi.mocked(listMyGuestPassHistory)
const mockedGetPolicy = vi.mocked(getMyGuestPassPolicy)
const mockedCreatePass = vi.mocked(createMyGuestPass)
const mockedCancelPass = vi.mocked(cancelMyGuestPass)

function seedPasses({
  active = [
    {
      id: 1,
      full_name: 'Invitado Activo',
      pass_code: 'GP-ACTIVE-1',
      valid_from: '2099-06-01T10:00:00Z',
      valid_until: '2099-06-01T12:00:00Z',
      status: 'ACTIVE',
      comment: 'Comentario activo',
    },
  ],
  upcoming = [
    {
      id: 2,
      full_name: 'Invitado Próximo',
      pass_code: 'GP-UPCOMING-1',
      valid_from: '2099-06-02T10:00:00Z',
      valid_until: '2099-06-02T12:00:00Z',
      status: 'ACTIVE',
      comment: '',
    },
  ],
  history = [
    {
      id: 3,
      full_name: 'Invitado Histórico',
      pass_code: 'GP-HISTORY-1',
      valid_from: '2025-06-01T10:00:00Z',
      valid_until: '2025-06-01T12:00:00Z',
      status: 'USED',
      comment: '',
    },
  ],
} = {}) {
  mockedListActive.mockResolvedValue(active)
  mockedListUpcoming.mockResolvedValue(upcoming)
  mockedListHistory.mockResolvedValue(history)
}

describe('ActiveGuestPassesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seedPasses()
    mockedGetPolicy.mockResolvedValue({
      max_duration_hours: 24,
      max_concurrent_passes: 3,
      visit_start_time: null,
      visit_end_time: null,
    })
    mockedCreatePass.mockResolvedValue({
      id: 11,
      full_name: 'Ana Ruiz',
      pass_code: 'GP-NEW-1',
      valid_from: '2099-06-03T10:00:00Z',
      valid_until: '2099-06-03T11:00:00Z',
      status: 'ACTIVE',
      comment: 'Visita',
    })
    mockedCancelPass.mockResolvedValue({
      id: 1,
      full_name: 'Invitado Activo',
      pass_code: 'GP-ACTIVE-1',
      valid_from: '2099-06-01T10:00:00Z',
      valid_until: '2099-06-01T12:00:00Z',
      status: 'CANCELLED',
      comment: 'Comentario activo',
    })
  })

  it('carga secciones de activos, próximos e historial', async () => {
    render(<ActiveGuestPassesPage />)

    await waitFor(() => {
      expect(screen.getByText('Invitado Activo')).toBeInTheDocument()
      expect(screen.getByText('Invitado Próximo')).toBeInTheDocument()
      expect(screen.getByText('Invitado Histórico')).toBeInTheDocument()
    })
  })

  it('crea un pase válido desde el formulario', async () => {
    const user = userEvent.setup()
    render(<ActiveGuestPassesPage />)

    await waitFor(() => {
      expect(screen.getByText('Gestión de pases')).toBeInTheDocument()
    })

    const textInputs = screen.getAllByRole('textbox')
    await user.type(textInputs[0], '  Ana  ')
    await user.type(textInputs[1], '  Ruiz  ')
    await user.type(textInputs[2], ' Visita ')

    await user.click(screen.getByRole('button', { name: /Generar Pase/i }))

    await waitFor(() => {
      expect(mockedCreatePass).toHaveBeenCalled()
      const payload = mockedCreatePass.mock.calls[0][0]
      expect(payload.guest_first_name).toBe('Ana')
      expect(payload.guest_last_name).toBe('Ruiz')
      expect(payload.comment).toBe('Visita')
    })
  })

  it('muestra errores de backend del formulario de creación', async () => {
    const user = userEvent.setup()
    mockedCreatePass.mockRejectedValueOnce(
      new GuestPassApiError('Datos inválidos', 400, {
        guest_first_name: 'El nombre es obligatorio.',
      }),
    )

    render(<ActiveGuestPassesPage />)

    await waitFor(() => {
      expect(screen.getByText('Gestión de pases')).toBeInTheDocument()
    })

    const textInputs = screen.getAllByRole('textbox')
    await user.type(textInputs[0], 'Ana')
    await user.type(textInputs[1], 'Ruiz')

    await user.click(screen.getByRole('button', { name: /Generar Pase/i }))

    await waitFor(() => {
      expect(mockedCreatePass).toHaveBeenCalled()
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    })
  })

  it('cancela un pase activo tras confirmar en el diálogo', async () => {
    const user = userEvent.setup()
    render(<ActiveGuestPassesPage />)

    await waitFor(() => {
      expect(screen.getByText('Invitado Activo')).toBeInTheDocument()
    })

    const activeSection = screen
      .getByRole('heading', { name: /Pases activos/i })
      .closest('section')
    expect(activeSection).not.toBeNull()

    await user.click(within(activeSection as HTMLElement).getByRole('button', { name: /Cancelar pase/i }))
    await user.click(screen.getByRole('button', { name: /^Confirmar$/i }))

    await waitFor(() => {
      expect(mockedCancelPass).toHaveBeenCalledWith(1)
      expect(mockedListActive).toHaveBeenCalledTimes(2)
    })
  })

  it('bloquea creación cuando se alcanza el máximo concurrente', async () => {
    seedPasses({
      active: [
        {
          id: 10,
          full_name: 'Activo 1',
          pass_code: 'GP-A1',
          valid_from: '2099-06-01T10:00:00Z',
          valid_until: '2099-06-01T12:00:00Z',
          status: 'ACTIVE',
          comment: '',
        },
      ],
      upcoming: [
        {
          id: 20,
          full_name: 'Próximo 1',
          pass_code: 'GP-U1',
          valid_from: '2099-06-02T10:00:00Z',
          valid_until: '2099-06-02T12:00:00Z',
          status: 'ACTIVE',
          comment: '',
        },
      ],
      history: [],
    })
    mockedGetPolicy.mockResolvedValueOnce({
      max_duration_hours: 24,
      max_concurrent_passes: 2,
      visit_start_time: null,
      visit_end_time: null,
    })

    const user = userEvent.setup()
    render(<ActiveGuestPassesPage />)

    await waitFor(() => {
      expect(screen.getByText('Activo 1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Generar Pase/i }))

    expect(mockedCreatePass).not.toHaveBeenCalled()
  })
})
