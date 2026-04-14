import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminGuestPassPolicyPage } from '../AdminGuestPassPolicy'
import {
  getAdminGuestPassPolicy,
  GuestPassApiError,
  updateAdminGuestPassPolicy,
} from '../../../services/guestPasses'

vi.mock('../../../services/guestPasses', () => ({
  getAdminGuestPassPolicy: vi.fn(),
  updateAdminGuestPassPolicy: vi.fn(),
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

const mockedGetPolicy = vi.mocked(getAdminGuestPassPolicy)
const mockedUpdatePolicy = vi.mocked(updateAdminGuestPassPolicy)

describe('AdminGuestPassPolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetPolicy.mockResolvedValue({
      max_duration_hours: 24,
      max_concurrent_passes: 3,
      visit_start_time: '09:00:00',
      visit_end_time: '22:00:00',
    })
    mockedUpdatePolicy.mockResolvedValue({
      max_duration_hours: 12,
      max_concurrent_passes: 5,
      visit_start_time: '10:00:00',
      visit_end_time: '21:00:00',
    })
  })

  it('carga y muestra la configuración actual', async () => {
    render(<AdminGuestPassPolicyPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Duración máxima (horas)')).toHaveValue(24)
      expect(screen.getByLabelText('Máximo de pases concurrentes')).toHaveValue(3)
      expect(screen.getByLabelText('Hora de inicio de visitas')).toHaveValue('09:00:00')
      expect(screen.getByLabelText('Hora límite de visitas')).toHaveValue('22:00:00')
    })
  })

  it('valida en cliente y evita guardar con valores inválidos', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassPolicyPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Duración máxima (horas)')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText('Duración máxima (horas)'))
    await user.type(screen.getByLabelText('Duración máxima (horas)'), '0')
    await user.clear(screen.getByLabelText('Hora de inicio de visitas'))
    await user.type(screen.getByLabelText('Hora de inicio de visitas'), '22:00')
    await user.clear(screen.getByLabelText('Hora límite de visitas'))
    await user.type(screen.getByLabelText('Hora límite de visitas'), '08:00')

    await user.click(screen.getByRole('button', { name: /Guardar configuración/i }))

    expect(mockedUpdatePolicy).not.toHaveBeenCalled()
    expect(screen.getByText(/La duración debe estar entre/i)).toBeInTheDocument()
    expect(screen.getByText(/La hora de inicio debe ser anterior/i)).toBeInTheDocument()
  })

  it('guarda configuración válida y envía payload esperado', async () => {
    const user = userEvent.setup()
    render(<AdminGuestPassPolicyPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Duración máxima (horas)')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText('Duración máxima (horas)'))
    await user.type(screen.getByLabelText('Duración máxima (horas)'), '12')
    await user.clear(screen.getByLabelText('Máximo de pases concurrentes'))
    await user.type(screen.getByLabelText('Máximo de pases concurrentes'), '5')
    await user.clear(screen.getByLabelText('Hora de inicio de visitas'))
    await user.type(screen.getByLabelText('Hora de inicio de visitas'), '10:00')
    await user.clear(screen.getByLabelText('Hora límite de visitas'))
    await user.type(screen.getByLabelText('Hora límite de visitas'), '21:00')

    await user.click(screen.getByRole('button', { name: /Guardar configuración/i }))

    await waitFor(() => {
      expect(mockedUpdatePolicy).toHaveBeenCalledWith({
        max_duration_hours: 12,
        max_concurrent_passes: 5,
        visit_start_time: '10:00',
        visit_end_time: '21:00',
      })
    })
  })

  it('muestra errores de backend al guardar', async () => {
    const user = userEvent.setup()
    mockedUpdatePolicy.mockRejectedValueOnce(
      new GuestPassApiError('Configuración inválida', 400, {
        visit_start_time: 'La hora de inicio es incorrecta.',
      }),
    )

    render(<AdminGuestPassPolicyPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Duración máxima (horas)')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Guardar configuración/i }))

    await waitFor(() => {
      expect(screen.getByText('La hora de inicio es incorrecta.')).toBeInTheDocument()
      expect(mockedUpdatePolicy).toHaveBeenCalled()
    })
  })
})
