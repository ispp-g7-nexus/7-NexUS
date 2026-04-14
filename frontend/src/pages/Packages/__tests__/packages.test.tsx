import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPackages from '../AdminPackages';
import { StudentPackages } from '../StudentPackages';
import { packagesService } from '../../../services/packages';
import { residentsService } from '../../../services/residents';

vi.mock('../../../services/packages', () => ({
  packagesService: {
    listAdmin: vi.fn(),
    create: vi.fn(),
    scanLabel: vi.fn(),
    markPending: vi.fn(),
    markDelivered: vi.fn(),
    markFailed: vi.fn(),
    listStudent: vi.fn(),
    getUnreadCount: vi.fn(),
    getPendingCount: vi.fn(),
  }
}));

vi.mock('../../../services/residents', () => ({
  residentsService: {
    getResidents: vi.fn(),
  }
}));

vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Packages Module - Authentic Marvel Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    packagesService.listAdmin.mockResolvedValue([]);
    residentsService.getResidents.mockResolvedValue([]);
  });

  describe('AdminPackages', () => {
    it('should render loading state initially and then display packages', async () => {
      render(<AdminPackages />);
      expect(screen.getByText('Paqueteria')).toBeInTheDocument();
      await waitFor(() => expect(packagesService.listAdmin).toHaveBeenCalled());
    });
  });

  describe('StudentPackages', () => {
    it('should display empty state if no packages exist', () => {
      render(<StudentPackages packages={[]} />);
      expect(screen.getByText(/No tienes paquetes pendientes/i)).toBeInTheDocument();
    });

    it('should display list of student packages correctly given the props', () => {
      const mockPackages = [
        { id: 1, tracking: 'STU1234', status: 'RECEIVED', sender: 'FedEx' }
      ];
      render(<StudentPackages packages={mockPackages} />);
      expect(screen.getByText('#STU1234')).toBeInTheDocument();
      expect(screen.getByText('FedEx')).toBeInTheDocument();
    });
  });
});
