import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface StudentHeaderProps {
  title: string;
}

export function StudentHeader({ title }: StudentHeaderProps) {
  return (
    <div className="bg-primary -mx-4 -mt-4 mb-6 px-6 py-4 flex justify-between items-center">
      <h1 className="text-primary-foreground text-xl font-bold">{title}</h1>
      <Button
        size="icon"
        variant="ghost"
        className="text-primary-foreground hover:bg-white/20 rounded-full"
        onClick={() => {
          toast.info("Notificaciones", {
            description: "No tienes notificaciones nuevas",
          });
        }}
      >
        <Bell className="w-5 h-5" />
      </Button>
    </div>
  );
}
