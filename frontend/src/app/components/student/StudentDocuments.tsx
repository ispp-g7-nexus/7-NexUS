import { FileText, Download, ChevronRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"; // Usando el componente que subiste

export function StudentDocuments() {
  return (
    <div className="p-4 space-y-6 bg-gray-50 min-h-full pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Documentos
        </h1>
        <p className="text-sm text-gray-500">
          Reglamentos y contratos
        </p>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-4"
      >
        <AccordionItem
          value="normativa"
          className="bg-white rounded-xl border-none shadow-sm px-2"
        >
          <AccordionTrigger className="hover:no-underline px-2">
            <span className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              Normativa y Convivencia
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-4 space-y-2">
            <DocItem
              title="Reglamento de Régimen Interno"
              size="2.4 MB"
            />
            <DocItem
              title="Normas de Uso de Cocina"
              size="1.1 MB"
            />
            <DocItem
              title="Política de Invitados"
              size="0.5 MB"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="contratos"
          className="bg-white rounded-xl border-none shadow-sm px-2"
        >
          <AccordionTrigger className="hover:no-underline px-2">
            <span className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#509550]/10 text-[#509550] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              Mi Contrato
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-4 space-y-2">
            <DocItem
              title="Contrato de Alojamiento 2025/26"
              size="4.2 MB"
            />
            <DocItem
              title="Anexo I - Inventario"
              size="1.8 MB"
            />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}

function DocItem({ title, size }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
      <div>
        <p className="text-sm font-medium text-gray-900 group-hover:text-[#509550] transition-colors">
          {title}
        </p>
        <p className="text-[10px] text-gray-400">
          {size} • PDF
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-400"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}