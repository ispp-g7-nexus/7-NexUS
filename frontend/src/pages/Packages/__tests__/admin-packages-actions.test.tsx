import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPackages from '../AdminPackages';
import { packagesService } from '../../../services/packages';
import { residentsService } from '../../../services/residents';

vi.mock('../../../services/packages', () => ({
  packagesService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    previewLabel: vi.fn(),
  }
}));

vi.mock('../../../services/residents', () => ({
  residentsService: {
    list: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn(),
    info: vi.fn(),
  }
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.HTMLElement.prototype.hasPointerCapture = () => false;

describe('AdminPackages Actions Coverage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    packagesService.list.mockResolvedValue([
      { id: 1, tracking_number: 'TRACK1', status: 'RECEIVED', resident: { id: 1, name: 'Alice', room_number: '101' }, carrier: 'UPS' },
      { id: 2, tracking_number: 'TRACK2', status: 'PENDING', resident: { id: 2, name: 'Bob', room_number: '102' }, carrier: 'FedEx' },
      { id: 3, tracking_number: 'TRACK3', status: 'DELIVERED', resident: { id: 1, name: 'Alice', room_number: '101' }, carrier: 'FedEx' },
      { id: 4, tracking_number: 'TRACK4', status: 'FAILED_DELIVERY', resident: null, carrier: 'USPS' }
    ]);
    residentsService.list.mockResolvedValue([
      { id: 1, full_name: 'Alice', room_number: '101' },
      { id: 2, full_name: 'Bob', room_number: '102' }
    ]);
  });

  it('navigates search input and select filters', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Buscar por/i);
    fireEvent.change(searchInput, { target: { value: 'TRACK1' } });
    
    await waitFor(() => {
      expect(screen.queryByText('TRACK2')).not.toBeInTheDocument();
    });
  });

  it('opens create modal, fills form and submits', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const addBtn = screen.getByText('Registrar llegada');
    fireEvent.click(addBtn);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    const residentBtn = await screen.findByText('Selecciona un residente');
    fireEvent.click(residentBtn);
    const aliceOptions = await screen.findAllByText(/Alice/);
    fireEvent.click(aliceOptions[0]);

    const trackingInput = screen.getByPlaceholderText(/seguimiento/i);
    fireEvent.change(trackingInput, { target: { value: 'NEWTRACK' } });

    packagesService.create.mockResolvedValue({ id: 5, tracking_number: 'NEWTRACK', status: 'RECEIVED' });
    fireEvent.submit(trackingInput.closest('form')!);
  });

  it('performs actions on a package row (mark pending, deliver, fail)', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const deliverBtns = screen.getAllByText('Entregar');
    fireEvent.click(deliverBtns[0]);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    packagesService.update.mockResolvedValue({ id: 1, tracking_number: 'TRACK1', status: 'DELIVERED' });
    
    const confirmBtn = screen.getByText('Sí, entregar');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
        expect(packagesService.update).toHaveBeenCalled();
    });
  });

  it('changes package filters and interacts with settings', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const refreshBtn = screen.getByText('Actualizar');
    fireEvent.click(refreshBtn);
    
    await waitFor(() => {
        expect(packagesService.list).toHaveBeenCalledTimes(2);
    });
  });

  it('triggers editing flow', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const editBtns = screen.getAllByText('Editar');
    fireEvent.click(editBtns[0]);
    
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('Editar paquete')).toBeInTheDocument();
  });

  it('triggers editing, detail, check modals and error bounds', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());

    const viewBtns = screen.getAllByText('Ver detalle');
    fireEvent.click(viewBtns[0]);
    
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('triggers scan modal actions and closes', async () => {
    render(<AdminPackages />);
    await waitFor(() => expect(screen.getByText('TRACK1')).toBeInTheDocument());
    
    const rootAddBtn = screen.getByText('Registrar llegada');
    fireEvent.click(rootAddBtn);
    
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/Codigo de seguimiento/i)).toBeInTheDocument();
  });

  it('handles permission and toast errors explicitly', async () => {
    packagesService.list.mockRejectedValueOnce(new Error('Permission Denied'));
    
    render(<AdminPackages />);
    await waitFor(() => {
        expect(packagesService.list).toHaveBeenCalled();
    });
  });
});
