import { beforeEach, describe, expect, it, vi } from 'vitest'

import { roleService } from '../roles'
import { trackEvent } from '../analytics'

vi.mock('../analytics', () => ({
  trackEvent: vi.fn(),
}))

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

describe('services/roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('getRoles hace GET al endpoint de membership/roles', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse([{ id: 1, name: 'Admin' }]))

    const data = await roleService.getRoles()

    expect(data).toEqual([{ id: 1, name: 'Admin' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/membership/roles/', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
  })

  it('createRole envía POST con payload y dispara analytics', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ id: 3, name: 'Conserjeria' }, 201))

    await roleService.createRole({
      name: 'Conserjeria',
      description: 'Gestión de accesos',
      permissions: ['rooms', 'roles'],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/roles/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Conserjeria',
        description: 'Gestión de accesos',
        permissions: ['rooms', 'roles'],
      }),
      credentials: 'include',
    })
    expect(trackEvent).toHaveBeenCalledWith('role_created', { role_name: 'Conserjeria' })
  })

  it('updateRole usa PATCH con el id en la URL y trackea role_updated', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ id: 9, name: 'Conserjeria Plus' }))

    await roleService.updateRole(9, {
      name: 'Conserjeria Plus',
      permissions: ['roles'],
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/roles/9/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Conserjeria Plus',
        permissions: ['roles'],
      }),
      credentials: 'include',
    })
    expect(trackEvent).toHaveBeenCalledWith('role_updated', { role_id: 9 })
  })

  it('deleteRole hace DELETE y trackea role_deleted', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({}, 204))

    await roleService.deleteRole(15)

    expect(fetchMock).toHaveBeenCalledWith('/api/membership/roles/15/', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    expect(trackEvent).toHaveBeenCalledWith('role_deleted', { role_id: 15 })
  })

  it('propaga detail cuando el backend responde error JSON', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValue(mockJsonResponse({ detail: 'Rol duplicado' }, 400))

    await expect(
      roleService.createRole({ name: 'Admin', description: '', permissions: [] }),
    ).rejects.toThrow('Rol duplicado')
  })
})
