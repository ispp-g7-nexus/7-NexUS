import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GuestPassApiError,
  cancelMyGuestPass,
  createMyGuestPass,
  getAdminGuestPassPolicy,
  getAdminVisitorsAnalytics,
  getMyGuestPassPolicy,
  listAdminGuestPasses,
  listMyActiveGuestPasses,
  rejectAdminGuestPass,
  unrejectAdminGuestPass,
  updateAdminGuestPassPolicy,
} from '../guestPasses'
import { fetchWithAuth } from '../../utils/api'
import { trackEvent } from '../analytics'

vi.mock('../../utils/api', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('../analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockedFetchWithAuth = vi.mocked(fetchWithAuth)
const mockedTrackEvent = vi.mocked(trackEvent)

function mockJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response
}

function mockNonJsonResponse(status = 403): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('not json')),
  } as unknown as Response
}

describe('services/guestPasses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listMyActiveGuestPasses consulta el endpoint de activos', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([{ id: 1 }]))

    const data = await listMyActiveGuestPasses()

    expect(data).toEqual([{ id: 1 }])
    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/guest-passes/me/active/')
  })

  it('cancelMyGuestPass hace POST y devuelve guest_pass', async () => {
    mockedFetchWithAuth.mockResolvedValue(
      mockJsonResponse({
        detail: 'ok',
        guest_pass: { id: 22, pass_code: 'GP-22' },
      }),
    )

    const result = await cancelMyGuestPass(22)

    expect(result).toMatchObject({ id: 22, pass_code: 'GP-22' })
    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/guest-passes/me/22/cancel/', {
      method: 'POST',
    })
  })

  it('cancelMyGuestPass falla si la respuesta no trae guest_pass', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ detail: 'ok' }))

    const error = await cancelMyGuestPass(9).catch((caught) => caught)

    expect(error).toEqual(expect.any(GuestPassApiError))
    expect(error.message).toContain('no es válida')
  })

  it('createMyGuestPass envía payload y trackea guest_pass_created', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ id: 44, pass_code: 'GP-44' }, 201))

    await createMyGuestPass({
      guest_first_name: 'Ana',
      guest_last_name: 'Ruiz',
      valid_from: '2026-04-14T10:00:00Z',
      valid_until: '2026-04-14T11:00:00Z',
      comment: 'Visita',
    })

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/guest-passes/me/', {
      method: 'POST',
      body: JSON.stringify({
        guest_first_name: 'Ana',
        guest_last_name: 'Ruiz',
        valid_from: '2026-04-14T10:00:00Z',
        valid_until: '2026-04-14T11:00:00Z',
        comment: 'Visita',
      }),
    })
    expect(mockedTrackEvent).toHaveBeenCalledWith('guest_pass_created')
  })

  it('listAdminGuestPasses añade query de status cuando aplica', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse([]))

    await listAdminGuestPasses('ACTIVE')

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/guest-passes/?status=ACTIVE')
  })

  it('getMyGuestPassPolicy y getAdminGuestPassPolicy consultan endpoints correctos', async () => {
    mockedFetchWithAuth
      .mockResolvedValueOnce(mockJsonResponse({ max_duration_hours: 24, max_concurrent_passes: 3 }))
      .mockResolvedValueOnce(mockJsonResponse({ max_duration_hours: 12, max_concurrent_passes: 5 }))

    await getMyGuestPassPolicy()
    await getAdminGuestPassPolicy()

    expect(mockedFetchWithAuth).toHaveBeenNthCalledWith(1, '/api/guest-passes/me/policy/')
    expect(mockedFetchWithAuth).toHaveBeenNthCalledWith(2, '/api/admin/guest-passes/policy/')
  })

  it('rejectAdminGuestPass y unrejectAdminGuestPass hacen POST a sus endpoints', async () => {
    mockedFetchWithAuth
      .mockResolvedValueOnce(mockJsonResponse({ id: 10, status: 'REJECTED' }))
      .mockResolvedValueOnce(mockJsonResponse({ id: 10, status: 'ACTIVE' }))

    await rejectAdminGuestPass(10)
    await unrejectAdminGuestPass(10)

    expect(mockedFetchWithAuth).toHaveBeenNthCalledWith(1, '/api/admin/guest-passes/10/reject/', {
      method: 'POST',
    })
    expect(mockedFetchWithAuth).toHaveBeenNthCalledWith(2, '/api/admin/guest-passes/10/unreject/', {
      method: 'POST',
    })
  })

  it('updateAdminGuestPassPolicy hace PATCH y trackea guest_pass_policy_updated', async () => {
    mockedFetchWithAuth.mockResolvedValue(
      mockJsonResponse({ max_duration_hours: 10, max_concurrent_passes: 4 }),
    )

    await updateAdminGuestPassPolicy({ max_duration_hours: 10, max_concurrent_passes: 4 })

    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/api/admin/guest-passes/policy/', {
      method: 'PATCH',
      body: JSON.stringify({ max_duration_hours: 10, max_concurrent_passes: 4 }),
    })
    expect(mockedTrackEvent).toHaveBeenCalledWith('guest_pass_policy_updated')
  })

  it('getAdminVisitorsAnalytics serializa params en query string', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockJsonResponse({ summary: {}, visitors_by_host: [], peak_hours: [], meta: {} }))

    await getAdminVisitorsAnalytics({
      from: '2026-04-01',
      to: '2026-04-14',
      granularity: 'hour',
      compare: 'previous_period',
    })

    expect(mockedFetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/analytics/visitors/?from=2026-04-01&to=2026-04-14&granularity=hour&compare=previous_period',
    )
  })

  it('propaga GuestPassApiError con detail y field errors del backend', async () => {
    mockedFetchWithAuth.mockResolvedValue(
      mockJsonResponse(
        {
          detail: 'Datos inválidos',
          valid_from: ['Fecha inválida'],
        },
        400,
      ),
    )

    const error = await createMyGuestPass({
      guest_first_name: 'Ana',
      guest_last_name: 'Ruiz',
      valid_from: 'bad',
      valid_until: 'bad',
    }).catch((caught) => caught)

    expect(error).toEqual(expect.any(GuestPassApiError))
    expect(error).toMatchObject({ message: 'Datos inválidos', status: 400 })
    expect(error.fieldErrors.valid_from).toBe('Fecha inválida')
  })

  it('usa mensaje forbidden cuando 403 no trae JSON parseable', async () => {
    mockedFetchWithAuth.mockResolvedValue(mockNonJsonResponse(403))

    const error = await listAdminGuestPasses().catch((caught) => caught)

    expect(error).toEqual(expect.any(GuestPassApiError))
    expect(error.message).toContain('No tienes permisos')
    expect(error.status).toBe(403)
  })
})
