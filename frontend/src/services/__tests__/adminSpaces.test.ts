import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSpace,
  deactivateSpace,
  listAdminSpaces,
  listSpaceReservations,
  updateSpace,
} from '../adminSpaces'
import { fetchWithAuth } from '../../utils/api'
import { ApiError } from '../reservations'

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

describe('services/adminSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listAdminSpaces hace GET al endpoint esperado', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([{ id: 1, name: 'Sala A' }]))

    const data = await listAdminSpaces()

    expect(data).toEqual([{ id: 1, name: 'Sala A' }])
    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/spaces/', undefined)
  })

  it('createSpace envía payload serializado en POST', async () => {
    const payload = {
      name: 'Sala Nueva',
      capacity: 4,
      open_time: '09:00',
      close_time: '18:00',
      reservation_interval_minutes: 30,
    }
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ id: 10, ...payload }, 201))

    await createSpace(payload)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/spaces/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('updateSpace envía PATCH con cambios parciales', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ id: 5, name: 'Editada' }))

    await updateSpace(5, { name: 'Editada' })

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/spaces/5/', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Editada' }),
    })
  })

  it('deactivateSpace hace DELETE', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({}, 204))

    await deactivateSpace(8)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/spaces/8/', {
      method: 'DELETE',
    })
  })

  it('listSpaceReservations aplica status como query param', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([]))

    await listSpaceReservations(11, 'active')

    expect(mockedFetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/spaces/11/reservations/?status=active',
      undefined,
    )
  })

  it('lanza ApiError cuando backend devuelve detail', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ detail: 'Sin permisos' }, 403))

    const error = await listAdminSpaces().catch((caught) => caught)
    expect(error).toEqual(expect.any(ApiError))
    expect(error).toMatchObject({ message: 'Sin permisos', status: 403 })
  })
})
