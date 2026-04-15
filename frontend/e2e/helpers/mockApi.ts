import type { Page, Route } from '@playwright/test'

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

const STUDENT_ME = {
  authenticated: true,
  user: {
    id: 1,
    username: 'ana.student',
    email: 'ana@nexus.test',
    first_name: 'Ana',
    last_name: 'García',
    roles: ['student'],
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
    valid_from: '2099-06-01T10:00:00Z',
    valid_until: '2099-06-01T12:00:00Z',
    created_at: '2099-05-30T09:00:00Z',
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
export const MOCK_BEDROOM_ANALYTICS = {
  summary: {
    total_rooms: 9,
    total_capacity: 14,
    total_occupants: 6,
    overall_occupation_rate: 43,
  },
  occupation_by_building: [
    { edificio: 'Edificio A', total_rooms: 5, total_capacity: 7, occupied_rooms: 4, occupants: 4, occupation_rate: 57 },
    { edificio: 'Edificio B', total_rooms: 4, total_capacity: 7, occupied_rooms: 2, occupants: 2, occupation_rate: 29 },
  ],
  occupation_by_type: [
    { tipo: 'Individual', total_rooms: 5, capacity: 5, occupants: 3, occupation_rate: 60 },
    { tipo: 'Doble', total_rooms: 2, capacity: 4, occupants: 2, occupation_rate: 50 },
    { tipo: 'Triple', total_rooms: 2, capacity: 6, occupants: 1, occupation_rate: 17 },
  ],
  occupation_by_year: [
    { year: 2024, assignments: 3 },
    { year: 2025, assignments: 3 },
    { year: 2026, assignments: 3 },
  ],
}

export const MOCK_PACKAGE_ANALYTICS = {
  summary: {
    total_received_in_period: 12,
    total_delivered_in_period: 8,
    currently_pending: 4,
  },
  daily_activity: [
    { date: '2026-03-15', received: 3, delivered: 1, cumulative_pending: 2 },
    { date: '2026-03-16', received: 2, delivered: 2, cumulative_pending: 2 },
    { date: '2026-03-17', received: 1, delivered: 1, cumulative_pending: 2 },
  ],
  by_resident: [
    { resident_name: 'Ana García', received_count: 5, delivered_count: 3 },
    { resident_name: 'Luis Martínez', received_count: 4, delivered_count: 3 },
    { resident_name: 'Sofía Rodríguez', received_count: 3, delivered_count: 2 },
  ],
  meta: { from: '2026-03-15', to: '2026-03-17' },
}

export const MOCK_OBJECT = {
  id: 10,
  name: 'Bicicleta de montaña',
  description: 'Bici disponible para residentes',
  location: 'Garaje',
  availability: true,
  stock_total: 1,
  current_reserved_stock: 0,
  current_available_stock: 1,
  tags: '',
  labels: [],
  rentals_count: 0,
  can_rent: true,
}

export const MOCK_OBJECT_AVAILABILITY = {
  reservation_interval_minutes: 60,
  available_slots: [
    { start_time: '2099-06-01T10:00:00+02:00', end_time: '2099-06-01T10:55:00+02:00', status: 'available', available_stock: 1 },
    { start_time: '2099-06-01T11:00:00+02:00', end_time: '2099-06-01T11:55:00+02:00', status: 'available', available_stock: 1 },
  ],
  reservations: [],
}

export const MOCK_MY_RESERVATION = {
  object: MOCK_OBJECT,
  rental: {
    id: 101,
    user: { id: 1, first_name: 'Ana', last_name: 'García', email: 'ana@nexus.test' },
    start_date: '2099-06-01T10:00:00Z',
    end_date: '2099-06-01T10:55:00Z',
    status: 'ACTIVE',
  },
}

export const MOCK_ADMIN_RENTAL = {
  id: 201,
  object: { id: 10, name: 'Bicicleta de montaña', location: 'Garaje' },
  user: { id: 2, first_name: 'Luis', last_name: 'Martínez', email: 'luis@nexus.test' },
  start_date: '2099-06-01T10:00:00Z',
  end_date: '2099-06-01T10:55:00Z',
  status: 'ACTIVE',
  is_overdue: false,
  overdue_minutes: 0,
  overdue_human: null,
  remaining_human: null,
  elapsed_human: null,
}

export const MOCK_INCIDENCE_ANALYTICS = {
  summary: {
    total_created_in_period: 10,
    total_resolved_in_period: 7,
    currently_open: 3,
    avg_resolution_hours: 48.5,
  },
  open_by_day: [
    { date: '2026-03-15', open_count: 1 },
    { date: '2026-03-16', open_count: 3 },
    { date: '2026-03-17', open_count: 3 },
  ],
  resolved_by_staff: [
    { staff_name: 'María García', resolved_count: 4 },
    { staff_name: 'Carlos López', resolved_count: 3 },
  ],
  meta: { from: '2026-03-15', to: '2026-03-17' },
}

type Overrides = {
  bedrooms?: unknown[]
  guestPasses?: unknown[]
  auditLog?: unknown[]
  bedroomAnalytics?: unknown
  packageAnalytics?: unknown
  incidenceAnalytics?: unknown
  objects?: unknown[]
  objectAvailability?: unknown
  myReservations?: unknown[]
  adminObjectRentals?: unknown[]
  objectNotifications?: unknown[]
  adminSpaces?: unknown[]
  adminSpaceDetail?: unknown
  adminSpaceReservations?: {
    all?: unknown[]
    active?: unknown[]
    cancelled?: unknown[]
  }
}

type StudentOverrides = {
  objects?: unknown[]
  objectAvailability?: unknown
  myReservations?: unknown[]
  objectNotifications?: unknown[]
}

async function handleBedroomsRoute(route: Route, path: string, overrides: Overrides) {
  if (path === '/api/bedrooms/') {
    await route.fulfill(json(overrides.bedrooms ?? [MOCK_BEDROOM]))
  } else if (path === '/api/bedrooms/analytics/') {
    await route.fulfill(json(overrides.bedroomAnalytics ?? MOCK_BEDROOM_ANALYTICS))
  } else if (path.endsWith('/audit/')) {
    await route.fulfill(json(overrides.auditLog ?? []))
  } else {
    await route.fulfill(json([]))
  }
}

async function handlePackagesRoute(route: Route, path: string, overrides: Overrides) {
  if (path === '/api/packages/analytics/') {
    await route.fulfill(json(overrides.packageAnalytics ?? MOCK_PACKAGE_ANALYTICS))
  } else {
    await route.fulfill(json([]))
  }
}

async function handleIncidencesRoute(route: Route, path: string, overrides: Overrides) {
  if (path === '/api/incidences/analytics/') {
    await route.fulfill(json(overrides.incidenceAnalytics ?? MOCK_INCIDENCE_ANALYTICS))
  } else {
    await route.fulfill(json([]))
  }
}

async function handleSpacesRoute(route: Route, requestUrl: string, path: string, overrides: Overrides) {
  const url = new URL(requestUrl)
  const adminSpaces = overrides.adminSpaces ?? []
  const defaultAdminSpaceDetail =
    overrides.adminSpaceDetail ??
    (Array.isArray(adminSpaces) && adminSpaces.length > 0 ? adminSpaces[0] : null)

  if (path === '/api/admin/spaces/') {
    await route.fulfill(json(adminSpaces))
    return
  }

  if (/^\/api\/admin\/spaces\/\d+\/reservations\/$/.test(path)) {
    const status = (url.searchParams.get('status') ?? 'all') as 'all' | 'active' | 'cancelled'
    const reservationsByStatus = overrides.adminSpaceReservations ?? {}
    const fallbackAll = reservationsByStatus.all ?? []
    const response =
      status === 'active'
        ? reservationsByStatus.active ?? fallbackAll
        : status === 'cancelled'
          ? reservationsByStatus.cancelled ?? fallbackAll
          : fallbackAll

    await route.fulfill(json(response))
    return
  }

  if (/^\/api\/admin\/spaces\/\d+\/$/.test(path)) {
    await route.fulfill(json(defaultAdminSpaceDetail ?? {}))
    return
  }

  await route.fulfill(json([]))
}

export async function mockStudentApi(page: Page, overrides: StudentOverrides = {}) {
  // Accept community rules and preferences before the page loads
  await page.addInitScript(() => {
    localStorage.setItem('nexus.community_rules.accepted.1', 'true')
  })

  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname

    if (path === '/api/auth/me/') {
      await route.fulfill(json(STUDENT_ME))
    } else if (path === '/api/residences/branding/') {
      await route.fulfill(json({ logo_url: null, primary_color: '#4A8F5D', secondary_color: '#0F4C81', accent_color: '#2E7D32', custom_css: '', favicon_url: '' }))
    } else if (path === '/api/preferences/me/') {
      await route.fulfill(json({ is_completed: true }))
    // Objects
    } else if (path === '/api/objects/') {
      await route.fulfill(json(overrides.objects ?? []))
    } else if (path.match(/^\/api\/objects\/\d+\/availability\//)) {
      await route.fulfill(json(overrides.objectAvailability ?? MOCK_OBJECT_AVAILABILITY))
    } else if (path === '/api/objects/notifications/') {
      await route.fulfill(json(overrides.objectNotifications ?? []))
    // My reservations
    } else if (path === '/api/my-reservations/') {
      await route.fulfill(json(overrides.myReservations ?? []))
    } else if (path === '/api/my-reservations/reminders/') {
      await route.fulfill(json([]))
    } else if (path === '/api/my-reservations/reminders/unread-count/') {
      await route.fulfill(json({ count: 0 }))
    // Announcements (StudentHome badge + list)
    } else if (path === '/api/announcements/unviewed_count/') {
      await route.fulfill(json({ count: 0 }))
    } else if (path.startsWith('/api/announcements/')) {
      await route.fulfill(json([]))
    // Incidences (StudentHome badge)
    } else if (path === '/api/incidences/notifications/') {
      await route.fulfill(json({ results: [] }))
    // Packages (StudentHome badge)
    } else if (path.startsWith('/api/packages/')) {
      await route.fulfill(json([]))
    // Spaces (reservation reminders)
    } else if (path.startsWith('/api/spaces/')) {
      await route.fulfill(json([]))
    } else {
      throw new Error(`Unmocked API route: ${route.request().method()} ${route.request().url()}`)
    }
  })
}

export async function mockAdminApi(page: Page, overrides: Overrides = {}) {
  const guestPasses = overrides.guestPasses ?? []

  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname

    if (path === '/api/auth/me/') {
      await route.fulfill(json(ADMIN_ME))
    } else if (path === '/api/residences/branding/') {
      await route.fulfill(json({ logo_url: null, primary_color: '#4A8F5D', secondary_color: '#0F4C81', accent_color: '#2E7D32', custom_css: '', favicon_url: '' }))
    } else if (path.startsWith('/api/bedrooms/')) {
      await handleBedroomsRoute(route, path, overrides)
    } else if (path === '/api/admin/guest-passes/') {
      await route.fulfill(json(guestPasses))
    } else if (path === '/api/admin/guest-passes/policy/') {
      await route.fulfill(json({ max_duration_hours: 24, max_concurrent_passes: 3 }))
    } else if (path.startsWith('/api/admin/guest-passes/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/incidences/')) {
      await handleIncidencesRoute(route, path, overrides)
    } else if (path.startsWith('/api/packages/')) {
      await handlePackagesRoute(route, path, overrides)
    } else if (path.startsWith('/api/announcements/') || path.startsWith('/api/events/') || path.startsWith('/api/residents/') || path.startsWith('/api/staff/') || path.startsWith('/api/membership/')) {
      await route.fulfill(json([]))
    } else if (path.startsWith('/api/spaces/') || path.startsWith('/api/admin/spaces/')) {
      await handleSpacesRoute(route, route.request().url(), path, overrides)
    } else if (path === '/api/objects/') {
      await route.fulfill(json(overrides.objects ?? []))
    } else if (path.match(/^\/api\/objects\/\d+\/availability\//)) {
      await route.fulfill(json(overrides.objectAvailability ?? MOCK_OBJECT_AVAILABILITY))
    } else if (path === '/api/admin/objects/rentals/') {
      await route.fulfill(json(overrides.adminObjectRentals ?? []))
    } else if (path.startsWith('/api/objects/') || path.startsWith('/api/admin/objects/') || path.startsWith('/api/chats/')) {
      await route.fulfill(json([]))
    } else {
      throw new Error(`Unmocked API route: ${route.request().url()}`)
    }
  })
}
