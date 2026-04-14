import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminObjects } from '../AdminObjects'
import { objectsService } from '../../../services/objects'

vi.mock('../../../services/objects', () => ({
  objectsService: {
    getObjects: vi.fn(),
    listLabels: vi.fn(),
    createObject: vi.fn(),
    deleteObject: vi.fn(),
    createLabel: vi.fn(),
    deleteLabel: vi.fn(),
    getObjectRentals: vi.fn(),
    getAllObjectRentals: vi.fn(),
    completeObjectRental: vi.fn(),
    cancelAdminRental: vi.fn(),
  },
}))

vi.mock('../../../components/RentalHistoryView', () => ({
  RentalHistoryView: () => <div>rental-history-view</div>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockedObjectsService = vi.mocked(objectsService)

const baseObject = {
  id: 1,
  name: 'Taladro',
  description: 'Industrial',
  location: 'Trastero',
  availability: true,
  stock_total: 2,
  current_reserved_stock: 0,
  current_available_stock: 2,
  image_url: '',
  tags: 'herramientas',
  labels: [],
  rentals_count: 0,
  can_rent: true,
}

describe('AdminObjects page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))

    mockedObjectsService.getObjects.mockResolvedValue([baseObject])
    mockedObjectsService.listLabels.mockResolvedValue([{ id: 1, name: 'Deporte', created_at: '2026-04-13T10:00:00Z' }])
    mockedObjectsService.createObject.mockResolvedValue({ id: 99, detail: 'ok' })
    mockedObjectsService.deleteObject.mockResolvedValue()
    mockedObjectsService.createLabel.mockResolvedValue({ id: 2, name: 'Tecnología', created_at: '2026-04-13T10:00:00Z' })
    mockedObjectsService.deleteLabel.mockResolvedValue()
    mockedObjectsService.getObjectRentals.mockResolvedValue({ active: [], in_progress: [], cancelled: [], completed: [] })
    mockedObjectsService.getAllObjectRentals.mockResolvedValue([])
    mockedObjectsService.completeObjectRental.mockResolvedValue({
      detail: 'ok',
      rental: {
        id: 1,
        status: 'COMPLETED',
        start_date: '2026-04-14T10:00:00Z',
        end_date: '2026-04-14T10:55:00Z',
        user: { id: 1, first_name: 'Juan', last_name: 'Pérez' },
      },
    })
    mockedObjectsService.cancelAdminRental.mockResolvedValue({
      detail: 'ok',
      rental: {
        id: 1,
        status: 'CANCELLED',
        start_date: '2026-04-14T10:00:00Z',
        end_date: '2026-04-14T10:55:00Z',
        user: { id: 1, first_name: 'Juan', last_name: 'Pérez' },
      },
    })
  })

  it('lista objetos y permite abrir préstamos por objeto', async () => {
    const user = userEvent.setup()
    render(<AdminObjects />)

    await waitFor(() => {
      expect(screen.getByText('Taladro')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Ver préstamos/i }))

    await waitFor(() => {
      expect(mockedObjectsService.getObjectRentals).toHaveBeenCalledWith(1)
      expect(screen.getByText('rental-history-view')).toBeInTheDocument()
    })
  })

  it('crea un objeto desde el formulario admin', async () => {
    const user = userEvent.setup()
    render(<AdminObjects />)

    await waitFor(() => screen.getByText('Taladro'))

    await user.click(screen.getByRole('button', { name: /Crear objeto/i }))
    await user.type(screen.getByLabelText(/^Nombre \*/i), 'Bicicleta')
    await user.click(screen.getByRole('button', { name: /^Crear objeto$/i }))

    await waitFor(() => {
      expect(mockedObjectsService.createObject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Bicicleta' }),
      )
    })
  })

  it('elimina objeto al confirmar', async () => {
    const user = userEvent.setup()
    render(<AdminObjects />)

    await waitFor(() => screen.getByText('Taladro'))

    await user.click(screen.getByRole('button', { name: /^Eliminar$/i }))

    await waitFor(() => {
      expect(mockedObjectsService.deleteObject).toHaveBeenCalledWith(1)
    })
  })

  it('gestiona etiquetas (crear y eliminar)', async () => {
    const user = userEvent.setup()
    render(<AdminObjects />)

    await waitFor(() => screen.getByText('Taladro'))

    await user.click(screen.getByRole('button', { name: /Gestionar etiquetas/i }))

    await user.type(screen.getByPlaceholderText(/Nombre de la etiqueta/i), 'Tecnología')
    await user.click(screen.getByRole('button', { name: /Añadir/i }))

    await waitFor(() => {
      expect(mockedObjectsService.createLabel).toHaveBeenCalledWith('Tecnología')
    })

    const deleteButtons = screen.getAllByTitle(/Eliminar etiqueta/i)
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockedObjectsService.deleteLabel).toHaveBeenCalledWith(1)
    })
  })
})
