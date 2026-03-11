"use client"

import React, { useState } from "react"
import { AlertTriangle, Info } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "../../../components/ui/checkbox"
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "../../../components/ui/select2"
import { DialogDescription } from "../../../components/ui/dialog"
import { IncidenceService, type LocationType } from "../../../services/incidences"

interface IncidenceFormProps {
  onSuccess: () => void
  onClose: () => void
}

export function IncidenceForm({ onSuccess, onClose }: IncidenceFormProps) {
  const [loading, setLoading] = useState(false)
  const [locationType, setLocationType] = useState<string>("")
  const [urgent, setUrgent] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      location_type: locationType as LocationType,
      priority: (urgent ? "high" : "low") as 'low' | 'high',
    }

    try {
      await IncidenceService.create(payload)
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error al crear:", error)
      alert("Error: Revisa los campos obligatorios")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={UI_CLASSES.form}>
      {/* Header del Formulario */}
      <div className={UI_CLASSES.header}>
        <h2 className={UI_CLASSES.title}>Nueva Incidencia</h2>
        <DialogDescription className={UI_CLASSES.description}>
          Reporta cualquier problema o incidencia en tu residencia
        </DialogDescription>
      </div>

      {/* Cuerpo Scrollable */}
      <div className={UI_CLASSES.body}>
        {/* Título */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className={UI_CLASSES.label}>¿Qué sucede?</Label>
          <Input 
            id="title" 
            name="title" 
            placeholder="Ej: Fuga de agua o bombilla fundida" 
            required 
            className={UI_CLASSES.input} 
          />
        </div>

        {/* Área / Ubicación */}
        <div className="space-y-1.5">
          <Label className={UI_CLASSES.label}>Área</Label>
          <Select onValueChange={setLocationType} required>
            <SelectTrigger className={UI_CLASSES.selectTrigger}>
              <SelectValue placeholder="Selecciona el área" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl">
              <SelectItem value="habitacion">Mi Habitación</SelectItem>
              <SelectItem value="baño">Baño Común</SelectItem>
              <SelectItem value="cocina">Cocina</SelectItem>
              <SelectItem value="comedor">Comedor</SelectItem>
              <SelectItem value="salas_comunes">Salas Comunes</SelectItem>
              <SelectItem value="exterior">Zonas Exteriores</SelectItem>
            </SelectContent>
          </Select>
          
          {locationType === "habitacion" && (
            <div className={UI_CLASSES.infoBox}>
              <Info className="w-4 h-4" />
              <p className="text-[11px] font-medium italic">
                Detectaremos tu habitación automáticamente desde tu perfil.
              </p>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className={UI_CLASSES.label}>Descripción detallada</Label>
          <textarea 
            id="description" 
            name="description" 
            placeholder="Cuéntanos más detalles del problema..." 
            required
            className={UI_CLASSES.textarea} 
          />
        </div>
        
        {/* Checkbox Urgencia */}
        <div className={UI_CLASSES.urgentBox}>
          <Checkbox
            id="urgent"
            name="urgent"
            checked={urgent}
            onCheckedChange={(val) => setUrgent(Boolean(val))}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <Label htmlFor="urgent" className="text-orange-800 text-sm font-bold cursor-pointer">
              Es una urgencia
            </Label>
          </div>
        </div>
      </div>

      {/* Footer / Botón */}
      <div className={UI_CLASSES.footer}>
        <Button 
          type="submit" 
          disabled={loading}
          variant="nexus"
          size="xl"
          className="w-full"
        >
          {loading ? "Enviando reporte..." : "Enviar Reporte"}
        </Button>
      </div>
    </form>
  )
}

const UI_CLASSES = {
  form: "flex flex-col h-full max-h-[90vh] bg-white overflow-hidden",
  header: "p-6 text-center border-b border-gray-50 shrink-0 relative",
  closeBtn: "absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10",
  title: "text-xl font-bold text-[#1B4D1C] mt-2",
  description: "text-sm text-gray-500 mt-1 px-6 leading-tight text-center font-normal",
  body: "flex-1 overflow-y-auto p-6 space-y-5",
  footer: "p-6 border-t border-gray-50 shrink-0 bg-white",
  label: "text-[10px] font-bold uppercase text-gray-400 ml-1",
  input: "bg-gray-50 border-none rounded-2xl h-14 px-4 focus-visible:ring-[#82D14C] font-normal",
  selectTrigger: "bg-gray-50 border-none rounded-2xl h-14 px-4 text-gray-600 focus:ring-[#82D14C] font-normal",
  textarea: "w-full bg-gray-50 border-none rounded-2xl min-h-[100px] p-4 focus-visible:ring-[#82D14C] resize-none text-sm font-normal",
  infoBox: "flex items-center gap-2 mt-2 ml-1 text-[#1B4D1C] bg-green-50 p-3 rounded-xl border border-green-100",
  urgentBox: "flex items-center space-x-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100",
};