import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelReservation,
  createReservation,
  getSpaceAvailability,
  listCommonSpaces,
  listMyReservationReminders,
  ApiError,
} from '../reservations'
import { fetchWithAuth } from '../../utils/api'

vi.mock('../../utils/api', () => ({
  fetchWithAuth: vi.fn(),
}))

const mockedFetchWithAuth = vi.mocked(fetchWithAuth)

function mockJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response
}

describe('services/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listCommonSpaces consulta /api/spaces/', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([{ id: 1 }]))

    await listCommonSpaces()

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/spaces/', undefined)
  })

  it('getSpaceAvailability codifica la fecha en la URL', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ date: '2026-04-13' }))

    await getSpaceAvailability(9, '2026-04-13')

    expect(mockedFetchWithAuth).toHaveBeenCalledWith(
      '/api/spaces/9/availability/?date=2026-04-13',
      undefined,
    )
  })

  it('createReservation envía start/end/notes por POST', async () => {
    const payload = {
      start_time: '2026-04-14T10:00:00Z',
      end_time: '2026-04-14T11:00:00Z',
      notes: 'Estudio',
    }
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ id: 3 }, 201))

    await createReservation(9, payload)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/spaces/9/reservations/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('cancelReservation hace POST a cancel endpoint', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ detail: 'ok' }, 200))

    await cancelReservation(44)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/spaces/reservations/44/cancel/', {
      method: 'POST',
    })
  })

  it('listMyReservationReminders consulta reminders del usuario', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([]))

    await listMyReservationReminders()

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/spaces/reservations/reminders/', undefined)
  })

  it('propaga ApiError con detail del backend', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ detail: 'Franja ocupada' }, 400))

    const error = await createReservation(1, {
      start_time: '2026-04-14T10:00:00Z',
      end_time: '2026-04-14T11:00:00Z',
    }).catch((caught) => caught)
    expect(error).toEqual(expect.any(ApiError))
    expect(error).toMatchObject({ message: 'Franja ocupada', status: 400 })
  })
})
