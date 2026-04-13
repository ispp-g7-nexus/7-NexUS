import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BedroomAuditLog } from '../BedroomAuditLog'

vi.mock('../../../services/bedrooms', () => ({
  getBedroomAuditLog: vi.fn(),
}))

import { getBedroomAuditLog } from '../../../services/bedrooms'

const mockGet = getBedroomAuditLog as ReturnType<typeof vi.fn>

const MOCK_ENTRIES = [
  {
    id: 1,
    action: 'UPDATED' as const,
    changes: { edificio: { before: 'A', after: 'B' } },
    timestamp: '2026-04-01T10:00:00Z',
    performed_by: 'Carlos Admin',
  },
  {
    id: 2,
    action: 'CREATED' as const,
    changes: {},
    timestamp: '2026-03-01T09:00:00Z',
    performed_by: 'Carlos Admin',
  },
]

describe('BedroomAuditLog — [NX-S3.02]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra indicador de carga inicialmente', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    render(<BedroomAuditLog bedroomId={1} />)
    expect(screen.getByText('Cargando historial...')).toBeInTheDocument()
  })

  it('muestra las entradas de auditoría tras cargar', async () => {
    mockGet.mockResolvedValue(MOCK_ENTRIES)
    render(<BedroomAuditLog bedroomId={1} />)
    await waitFor(() => {
      expect(screen.getByText('Actualizada')).toBeInTheDocument()
      expect(screen.getByText('Creada')).toBeInTheDocument()
    })
  })

  it('muestra el nombre del usuario que realizó la acción', async () => {
    mockGet.mockResolvedValue(MOCK_ENTRIES)
    render(<BedroomAuditLog bedroomId={1} />)
    await waitFor(() => {
      expect(screen.getAllByText(/Carlos Admin/).length).toBeGreaterThan(0)
    })
  })

  it('muestra mensaje vacío cuando no hay entradas', async () => {
    mockGet.mockResolvedValue([])
    render(<BedroomAuditLog bedroomId={1} />)
    await waitFor(() => {
      expect(screen.getByText('Sin registros de auditoría.')).toBeInTheDocument()
    })
  })

  it('muestra error cuando falla la carga', async () => {
    mockGet.mockRejectedValue(new Error('500'))
    render(<BedroomAuditLog bedroomId={1} />)
    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar el historial.')).toBeInTheDocument()
    })
  })

  it('llama a getBedroomAuditLog con el id correcto', async () => {
    mockGet.mockResolvedValue([])
    render(<BedroomAuditLog bedroomId={42} />)
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(42, expect.objectContaining({ signal: expect.any(AbortSignal) })))
  })
})
