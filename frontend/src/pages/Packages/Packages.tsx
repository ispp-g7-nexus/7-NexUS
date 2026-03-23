import { useEffect, useState } from "react";
import StudentPackages, { SimplePackage } from "./StudentPackages";
import { packagesService } from "../../services/packages";
import { toast } from "sonner";

export function PackagesPage() {
  const [packages, setPackages] = useState<SimplePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; expires_at?: string; resident_name?: string } | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await packagesService.getMyPackages();
      setPackages(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Error cargando paquetes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPackages(); }, []);

  useEffect(() => {
    let mounted = true;
    const markViewed = async () => {
      try {
        const res = await packagesService.markAsViewed();
        if (mounted) {
          // Notify other parts of the app that packages were marked as viewed
          try {
            window.dispatchEvent(new CustomEvent('packages:markedAsViewed', { detail: res }));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        // Non-fatal
      }
    };

    markViewed();
    return () => { mounted = false; };
  }, []);

  const handleShowQr = async () => {
    try {
      const qr = await packagesService.getDeliveryQr();
      setQrData(qr);
      toast.success("QR obtenido");
    } catch (err) {
      toast.error(err?.message || "Error obteniendo QR");
    }
  };

  return (
    <div className="h-full">
      <StudentPackages packages={packages} onShowQr={handleShowQr} qrData={qrData} />
      {loading && <div className="fixed bottom-24 left-1/2 -translate-x-1/2">Cargando...</div>}
    </div>
  );
}

export default PackagesPage;
