import { useState } from "react";
import {
  Bell,
  Calendar,
  Info,
  Heart,
  Share2,
  ChevronRight,
  Utensils,
  ChevronLeft,
  X,
} from "lucide-react";
import { StudentHeader } from "./StudentHeader";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../ui/dialog";

const weekMenu = [
  {
    day: "Lunes",
    date: "17 Feb",
    lunch: [
      {
        type: "Principal",
        title: "Pollo al Curry con Arroz Basmati",
        tags: ["Sin Gluten", "Alto Proteína"],
        image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Lentejas Estofadas con Verduras",
        tags: ["Vegano", "Alto Fibra"],
        image: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=400",
      },
    ],
    dinner: [
      {
        type: "Principal",
        title: "Merluza al Horno con Verduras",
        tags: ["Pescado", "Bajo Calórico"],
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Tortilla de Patatas",
        tags: ["Vegetariano", "Sin Gluten"],
        image: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&q=80&w=400",
      },
    ],
  },
  {
    day: "Martes",
    date: "18 Feb",
    lunch: [
      {
        type: "Principal",
        title: "Paella Mixta",
        tags: ["Mariscos", "Sin Lácteos"],
        image: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Ensalada César con Pollo",
        tags: ["Alto Proteína", "Gluten"],
        image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=400",
      },
    ],
    dinner: [
      {
        type: "Principal",
        title: "Sopa de Verduras",
        tags: ["Vegano", "Bajo Calórico"],
        image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Hamburguesas de Garbanzos",
        tags: ["Vegano", "Alto Fibra"],
        image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=400",
      },
    ],
  },
  {
    day: "Miércoles",
    date: "19 Feb",
    lunch: [
      {
        type: "Principal",
        title: "Lasaña de Carne",
        tags: ["Gluten", "Lácteos"],
        image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Pechuga a la Plancha",
        tags: ["Sin Gluten", "Alto Proteína"],
        image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=400",
      },
    ],
    dinner: [
      {
        type: "Principal",
        title: "Crema de Calabacín",
        tags: ["Vegano", "Bajo Calórico"],
        image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Pizza Margarita",
        tags: ["Vegetariano", "Gluten"],
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
      },
    ],
  },
  {
    day: "Jueves",
    date: "20 Feb",
    lunch: [
      {
        type: "Principal",
        title: "Arroz con Verduras al Wok",
        tags: ["Vegano", "Sin Gluten"],
        image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Salmón a la Plancha",
        tags: ["Pescado", "Omega 3"],
        image: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&q=80&w=400",
      },
    ],
    dinner: [
      {
        type: "Principal",
        title: "Macarrones con Tomate",
        tags: ["Vegetariano", "Gluten"],
        image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Albóndigas en Salsa",
        tags: ["Gluten", "Alto Proteína"],
        image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&q=80&w=400",
      },
    ],
  },
  {
    day: "Viernes",
    date: "21 Feb",
    lunch: [
      {
        type: "Principal",
        title: "Fideuá de Mariscos",
        tags: ["Mariscos", "Gluten"],
        image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Ensalada Griega",
        tags: ["Vegetariano", "Sin Gluten"],
        image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=400",
      },
    ],
    dinner: [
      {
        type: "Principal",
        title: "Tacos de Pollo",
        tags: ["Alto Proteína", "Picante"],
        image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=400",
      },
      {
        type: "Segundo",
        title: "Quesadillas de Queso",
        tags: ["Vegetariano", "Lácteos"],
        image: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&q=80&w=400",
      },
    ],
  },
];

export function StudentMenu() {
  const [showWeekMenu, setShowWeekMenu] = useState(false);

  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-full pb-20">
      {/* Header Verde */}
      <div className="bg-[#1B5E20] -mx-4 -mt-4 mb-6 px-6 py-4 flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">Menú</h1>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20 rounded-full"
        >
          <Bell className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Menú del Día
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Hoy, 17 de Febrero
          </p>
        </div>
        <Dialog open={showWeekMenu} onOpenChange={setShowWeekMenu}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-[#35C759] font-medium"
            >
              Ver Semana <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Menú Semanal</DialogTitle>
              <DialogDescription>
                Consulta la planificación completa de comidas para esta semana.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {weekMenu.map((dayMenu) => (
                <div key={dayMenu.day} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className="w-4 h-4 text-[#35C759]" />
                    <h3 className="font-bold text-gray-900">
                      {dayMenu.day} - {dayMenu.date}
                    </h3>
                  </div>

                  {/* Almuerzo */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      Almuerzo
                    </h4>
                    <div className="space-y-2">
                      {dayMenu.lunch.map((item, idx) => (
                        <MiniMenuCard key={idx} {...item} />
                      ))}
                    </div>
                  </div>

                  {/* Cena */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      Cena
                    </h4>
                    <div className="space-y-2">
                      {dayMenu.dinner.map((item, idx) => (
                        <MiniMenuCard key={idx} {...item} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Almuerzo */}
      <div className="space-y-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          Almuerzo (13:00 - 15:30)
        </h2>

        <MenuCard
          type="Principal"
          title="Pollo al Curry con Arroz Basmati"
          tags={["Sin Gluten", "Alto Proteína"]}
          image="https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=400"
        />
        <MenuCard
          type="Segundo"
          title="Lentejas Estofadas con Verduras"
          tags={["Vegano", "Alto Fibra"]}
          image="https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&q=80&w=400"
        />
      </div>

      {/* Cena */}
      <div className="space-y-3 pt-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          Cena (20:00 - 22:30)
        </h2>

        <MenuCard
          type="Principal"
          title="Merluza al Horno con Verduras"
          tags={["Pescado", "Bajo Calórico"]}
          image="https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=400"
        />
        <MenuCard
          type="Segundo"
          title="Tortilla de Patatas"
          tags={["Vegetariano", "Sin Gluten"]}
          image="https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&q=80&w=400"
        />
      </div>

      {/* Botón de Acción */}
      <Card className="bg-[#35C759] text-white border-none mt-6">
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="font-bold">¿No vienes a comer?</p>
            <p className="text-green-100 text-xs">
              Avisa y ayuda a no desperdiciar.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="text-[#35C759] bg-white hover:bg-gray-100"
          >
            Cancelar Comida
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuCard({ type, title, tags, image }: any) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <div className="flex">
        <div className="w-24 h-24 relative">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[#35C759] uppercase tracking-wider">
                {type}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 leading-tight mt-1">
              {title}
            </h3>
          </div>
          <div className="flex gap-1 mt-2">
            {tags.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] h-5 bg-gray-100 text-gray-600"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MiniMenuCard({ type, title, tags }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-start mb-1">
        <span className="text-[9px] font-bold text-[#35C759] uppercase tracking-wider">
          {type}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 text-sm mb-2">
        {title}
      </h4>
      <div className="flex gap-1 flex-wrap">
        {tags.map((tag: string) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[9px] h-4 bg-white text-gray-600"
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
