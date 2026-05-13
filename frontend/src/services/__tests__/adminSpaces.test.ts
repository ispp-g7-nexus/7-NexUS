import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSpace,
  deactivateSpace,
  getSpace,
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

  it('getSpace consulta el detalle del espacio', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ id: 3, name: 'Sala detalle' }))

    await getSpace(3)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/spaces/3/', undefined)
  })

  it('listSpaceReservations aplica status como query param', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([]))

    await listSpaceReservations(11, 'active')

    expect(mockedFetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/spaces/11/reservations/?status=active',
      undefined,
    )
  })

  it('listSpaceReservations omite query param cuando no hay filtro', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([]))

    await listSpaceReservations(11)

    expect(mockedFetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/spaces/11/reservations/',
      undefined,
    )
  })

  it('lanza ApiError cuando backend devuelve detail', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ detail: 'Sin permisos' }, 403))

    const error = await listAdminSpaces().catch((caught) => caught)
    expect(error).toEqual(expect.any(ApiError))
    expect(error).toMatchObject({ message: 'Sin permisos', status: 403 })
  })

  it('muestra mensaje útil cuando backend responde con errores por campo', async () => {
    mockedFetchWithAuth.mockResolvedValue(
      mockJsonResponse({ name: ['Ensure this field has no more than 80 characters.'] }, 400),
    )

    const error = await createSpace({
      name: 'A'.repeat(120),
      description: '',
      capacity: 3,
      open_time: '09:00',
      close_time: '18:00',
      reservation_interval_minutes: 30,
    }).catch((caught) => caught)

    expect(error).toEqual(expect.any(ApiError))
    expect(error).toMatchObject({
      message: 'El campo nombre no puede superar los 80 caracteres.',
      status: 400,
    })
  })

  it('usa el mensaje generico de permisos cuando la respuesta no trae JSON', async () => {
    mockedFetchWithAuth.mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    } as unknown as Response)

    const error = await listAdminSpaces().catch((caught) => caught)

    expect(error).toEqual(expect.any(ApiError))
    expect(error).toMatchObject({
      message: 'No tienes permisos para realizar esta acción.',
      status: 403,
    })
  })
})
