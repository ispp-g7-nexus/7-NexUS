import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ResidentForm } from "./components/ResidentForm";

export function Residents() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="bg-background p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Residentes</h2>
          </div>

          <div>
            <Button variant="secondary" onClick={() => setOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Residente
            </Button>
          </div>
        </div>
      </div>

      <ResidentForm open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default Residents;
