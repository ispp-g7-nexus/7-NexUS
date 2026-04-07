import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminView } from '../AdminView'

// ── Child pages (no se renderizan en el tab dashboard) ──────────────────────
vi.mock('../../pages/Residents/Residents', () => ({ Residents: () => null }))
vi.mock('../../pages/Rooms/Rooms', () => ({ default: () => null }))
vi.mock('../../pages/Social/Events/Events', () => ({ Events: () => null }))
vi.mock('../../pages/Chats/AdminChats', () => ({ AdminChats: () => null }))
vi.mock('../../pages/Incidences/components/AdminIncidences', () => ({ AdminIncidences: () => null }))
vi.mock('../../pages/Menu/AdminMenuView', () => ({ AdminMenuView: () => null }))
vi.mock('../../pages/Staff/Staff', () => ({ Staff: () => null }))
vi.mock('../../pages/Visitors/AdminGuestPassList', () => ({ AdminGuestPassListPage: () => null }))
vi.mock('../../pages/Visitors/AdminGuestPassPolicy', () => ({ AdminGuestPassPolicyPage: () => null }))
vi.mock('../../pages/announcements/AdminAnnouncements', () => ({ AdminAnnouncements: () => null }))
vi.mock('../../pages/RolesPage', () => ({ default: () => null }))
vi.mock('../AdminProfile', () => ({ AdminProfile: () => null }))
vi.mock('../AdminReservations', () => ({ AdminReservations: () => null }))
vi.mock('../../pages/Packages/AdminPackages', () => ({ AdminPackages: () => null }))
vi.mock('../../pages/Branding/AdminBrandingPage', () => ({ AdminBrandingPage: () => null }))

// StatCard renderiza label y valor para poder afirmar sobre ellos
vi.mock('../statCard', () => ({
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span data-testid={`stat-${label}`}>{value}</span>
    </div>
  ),
}))

// ── Assets ───────────────────────────────────────────────────────────────────
vi.mock('../../assets/logo.png', () => ({ default: 'logo.png' }))

// ── Hooks ────────────────────────────────────────────────────────────────────
vi.mock('../useAdminNotifications', () => ({
  useAdminNotifications: () => ({
    notifications: [],
    isNotificationsOpen: false,
    notificationsLoading: false,
    seenNotificationIds: new Set<string>(),
    unreadCount: 0,
    unreadIncidencesCount: 0,
    unreadAnnouncementsCount: 0,
    hasUnreadNotifications: false,
    handleNotificationsOpenChange: vi.fn(),
    handleOpenNotification: vi.fn(),
    handleNavbarModuleAccess: vi.fn(),
  }),
}))

vi.mock('../../hooks/useTenantBranding', () => ({ applyGlobalBranding: vi.fn() }))

// ── Services ─────────────────────────────────────────────────────────────────
vi.mock('../../services/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    hasScreenPermission: vi.fn().mockReturnValue(true),
    authService: {
      me: vi.fn().mockResolvedValue({ user: { email: 'admin@test.com' } }),
      logout: vi.fn(),
    },
  };
})

vi.mock('../../services/bedrooms', () => ({
  listBedrooms: vi.fn().mockResolvedValue([]), // Lo dejamos vacío por defecto, lo inyectaremos en cada test
}))

vi.mock('../../services/guestPasses', () => ({
  listAdminGuestPasses: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../services/incidences', () => ({
  IncidenceService: { getAll: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../../services/residents', () => ({
  residentsService: { list: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../../services/roles', () => ({
  roleService: { getRoles: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../../services/staff', () => ({
  staffService: { list: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../../services/branding', () => ({
  brandingService: { get: vi.fn().mockResolvedValue({ logo_url: null }) },
}))

vi.mock('../../services/chats', () => ({
  chatsService: {
    subscribeToEvents: vi.fn().mockReturnValue({ close: vi.fn() }),
    listGroups: vi.fn().mockResolvedValue([]),
  },
}))

// ── Helper ───────────────────────────────────────────────────────────────────
async function renderAdminView(currentUser: { name: string; email: string } | null = { name: 'Carlos Admin', email: 'admin@test.com' }) {
  await act(async () => {
    render(
      <MemoryRouter>
        <AdminView onLogout={vi.fn()} currentUser={currentUser} />
      </MemoryRouter>,
    )
  });
}

describe('AdminView — [NX-S2.08 / NX-S1.15]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── S2.08: Vista de usuario activo en el menú lateral ──────────────────────
  describe('S2.08 — usuario activo en menú lateral', () => {
    it('muestra el nombre del usuario en el saludo del dashboard', async () => {
      await renderAdminView()
      expect(screen.getByText('Carlos Admin')).toBeInTheDocument()
    })

    it('muestra "Administrador" como fallback cuando currentUser es null', async () => {
      await renderAdminView(null)
      expect(screen.getByText('Administrador')).toBeInTheDocument()
    })

    it('el saludo contiene "Bienvenido/a"', async () => {
      await renderAdminView()
      expect(screen.getByText(/Bienvenido\/a/)).toBeInTheDocument()
    })
  })

  // ── S1.15: Ocupación en tiempo real ───────────────────────────────────────
  describe('S1.15 — visualización de ocupación', () => {
    it('muestra el porcentaje de ocupación en la métrica "Habitaciones"', async () => {
      const { listBedrooms } = await import('../../services/bedrooms')
      vi.mocked(listBedrooms).mockResolvedValue([
        { id: 1, numero: '101', capacidad_maxima: 4, ocupantes_actuales: 2, tipo: 'Doble', edificio: 'A', planta: 1, residentes: [] },
        { id: 2, numero: '102', capacidad_maxima: 2, ocupantes_actuales: 2, tipo: 'Doble', edificio: 'A', planta: 1, residentes: [] },
      ])

      await renderAdminView()
      // 4+2=6 plazas, 2+2=4 ocupadas → Math.round(4/6*100) = 67%
      await waitFor(() => {
        const habitacionesStat = screen.getByTestId('stat-Habitaciones')
        expect(habitacionesStat.textContent).toBe('67%')
      })
    })

    it('muestra "—" en ocupación cuando el servicio falla', async () => {
      const { listBedrooms } = await import('../../services/bedrooms')
      vi.mocked(listBedrooms).mockRejectedValue(new Error('Network error'))

      await renderAdminView()
      await waitFor(() => {
        const habitacionesStat = screen.getByTestId('stat-Habitaciones')
        expect(habitacionesStat.textContent).toBe('—')
      })
    })

    it('muestra 0% cuando todas las habitaciones están libres', async () => {
      const { listBedrooms } = await import('../../services/bedrooms')
      vi.mocked(listBedrooms).mockResolvedValue([
        { id: 1, numero: '101', capacidad_maxima: 2, ocupantes_actuales: 0, tipo: 'Doble', edificio: 'A', planta: 1, residentes: [] },
      ])

      await renderAdminView()
      await waitFor(() => {
        const habitacionesStat = screen.getByTestId('stat-Habitaciones')
        expect(habitacionesStat.textContent).toBe('0%')
      })
    })
  })
})