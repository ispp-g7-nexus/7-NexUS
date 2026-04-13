import type { Page } from '@playwright/test'

const ADMIN_ME = {
  authenticated: true,
  user: {
    id: 1,
    username: 'carlos.admin',
    email: 'carlos@nexus.test',
    first_name: 'Carlos',
    last_name: 'Admin',
    roles: ['residence_admin'],
  },
}

export const MOCK_BEDROOM = {
  id: 1,
  numero: '101',
  edificio: 'A',
  planta: 1,
  tipo: 'Doble',
  capacidad_maxima: 2,
  ocupantes_actuales: 1,
  is_active: true,
  residentes: [{ id: 10, full_name: 'Ana García', email: 'ana@test.com' }],
}

export const MOCK_AUDIT_LOG = [
  {
    id: 1,
    action: 'CREATED',
    changes: {},
    timestamp: '2026-03-01T09:00:00Z',
    performed_by: 'Carlos Admin',
  },
  {
    id: 2,
    action: 'UPDATED',
    changes: { edificio: { before: 'A', after: 'B' } },
    timestamp: '2026-04-01T10:00:00Z',
    performed_by: 'Carlos Admin',
  },
]

export const MOCK_PASSES = [
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
]

function json(data: unknown) {
  return { status: 200, contentType: 'application/json', body: JSON.stringify(data) }
}

/**
 * Intercepts only /api/** requests — no interference with Vite HMR or JS bundles.
 */
export async function mockAdminApi(page: Page, overrides: {
  bedrooms?: unknown[]
  guestPasses?: unknown[]
  auditLog?: unknown[]
} = {}) {
  const bedrooms = overrides.bedrooms ?? [MOCK_BEDROOM]
  const guestPasses = overrides.guestPasses ?? []

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname

    if (path === '/api/auth/me/') {
      await route.fulfill(json(ADMIN_ME))
    } else if (path === '/api/residences/branding/') {
      await route.fulfill(json({ logo_url: null, primary_color: '#4A8F5D', secondary_color: '#0F4C81', accent_color: '#2E7D32', custom_css: '', favicon_url: '' }))
    } else if (path.startsWith('/api/bedrooms/')) {
      if (path === '/api/bedrooms/') {
        await route.fulfill(json(bedrooms))
      } else if (path.endsWith('/audit/')) {
        const auditLog = overrides.auditLog ?? []
        await route.fulfill(json(auditLog))
      } else {
        await route.fulfill(json([]))
      }
    } else if (path === '/api/admin/guest-passes/') {
      await route.fulfill(json(guestPasses))
    } else if (path === '/api/admin/guest-passes/policy/') {
      await route.fulfill(json({ max_duration_hours: 24, max_concurrent_passes: 3 }))
    } else if (path === '/api/admin/guest-passes/notifications/') {
      await route.fulfill(json([]))
    } else if (path === '/api/chats/groups/') {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/announcements/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/incidences/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/residents/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/staff/')) {
      await route.fulfill(json([]))
    } else if (path === '/api/admin/spaces/notifications/') {
      await route.fulfill(json([]))
    } else if (path === '/api/admin/objects/notifications/') {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/events/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/packages/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/spaces/') || path.startsWith('/api/admin/spaces/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/objects/') || path.startsWith('/api/admin/objects/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/chats/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/membership/')) {
      await route.fulfill(json([]))
    } else {
      throw new Error(`Unmocked API route: ${route.request().url()}`)
    }
  })
}
