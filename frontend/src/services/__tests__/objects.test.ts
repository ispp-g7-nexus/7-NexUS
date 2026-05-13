import { beforeEach, describe, expect, it, vi } from 'vitest'
import { objectsService } from '../objects'

function mockJsonResponse(data: unknown, status = 200, contentType = 'application/json'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Response
}

describe('services/objects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('getObjects hace GET con credenciales', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse([{ id: 1 }]))

    await objectsService.getObjects()

    expect(fetchMock).toHaveBeenCalledWith('/api/objects/', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('getObjectAvailability envía fecha como query param', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ available_slots: [] }))

    await objectsService.getObjectAvailability(7, '2026-04-13')

    expect(fetchMock).toHaveBeenCalledWith('/api/objects/7/availability/?date=2026-04-13', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('reserveObject envía payload en POST', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ id: 99 }, 201))

    await objectsService.reserveObject(4, {
      start_date: '2026-04-14T10:00:00Z',
      end_date: '2026-04-14T10:55:00Z',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/objects/4/reserve/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: '2026-04-14T10:00:00Z',
        end_date: '2026-04-14T10:55:00Z',
      }),
    })
  })

  it('cancelReservation usa rental_id cuando se proporciona', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ detail: 'ok' }))

    await objectsService.cancelReservation(4, { rental_id: 11 })

    expect(fetchMock).toHaveBeenCalledWith('/api/objects/4/cancel/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rental_id: 11 }),
    })
  })

  it('dismissUserReservation llama al endpoint esperado', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ detail: 'Reserva descartada.' }))

    await objectsService.dismissUserReservation(22)

    expect(fetchMock).toHaveBeenCalledWith('/api/my-reservations/22/dismiss/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('getUserObjectNotifications obtiene notificaciones del usuario', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse([{ id: 'n1' }]))

    await objectsService.getUserObjectNotifications()

    expect(fetchMock).toHaveBeenCalledWith('/api/objects/notifications/', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('lanza error con detail cuando backend responde con JSON de error', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ detail: 'Sin stock' }, 400))

    await expect(objectsService.reserveObject(4, {
      start_date: '2026-04-14T10:00:00Z',
      end_date: '2026-04-14T10:55:00Z',
    })).rejects.toThrow('Sin stock')
  })

  it('prioriza message cuando backend no devuelve detail', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ message: 'Nombre demasiado largo' }, 400))

    await expect(objectsService.createObject({
      name: 'Objeto inválido',
    })).rejects.toThrow('Nombre demasiado largo')
  })

  it('extrae y traduce errores por campo cuando backend devuelve arrays', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        { description: ['Ensure this field has no more than 255 characters.'] },
        400,
      ),
    )

    await expect(objectsService.createObject({
      name: 'Objeto inválido',
      description: 'D'.repeat(260),
    })).rejects.toThrow('El campo descripción no puede superar los 255 caracteres.')
  })

  it('normaliza detalle de backend para descripciones demasiado largas', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(
      mockJsonResponse({ detail: "El campo 'description' no puede superar 255 caracteres." }, 400),
    )

    await expect(objectsService.createObject({
      name: 'Objeto inválido',
      description: 'D'.repeat(260),
    })).rejects.toThrow('La descripción no puede superar los 255 caracteres.')
  })
})
