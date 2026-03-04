"use client"

import React, { useState } from "react"
import { X, AlertTriangle, Info } from "lucide-react" 
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "../../../components/ui/checkbox"
import { Select} from "../../../components/ui/select"
import { DialogDescription } from "../../../components/ui/dialog"
import { fetchWithAuth, API_URL_INCIDENCES } from "../../../utils/api"
//import {API_URL_INCIDENCES } from "../../../utils/api"

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
      title: formData.get("title"),
      description: formData.get("description"),
      location_type: locationType,
      priority: urgent ? "high" : "low",
    }

    try {
      const response = await fetchWithAuth(API_URL_INCIDENCES, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const errorData = await response.json()
        console.error("Error de Django:", errorData)
        alert("Error: Revisa los campos obligatorios")
      }
    } catch (error) {
      console.error("Error de conexión:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] bg-white overflow-hidden">
      
      {/* Cabecera */}
      <div className="p-6 text-center border-b border-gray-50 shrink-0 relative">
        <button 
          onClick={onClose} 
          type="button" 
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-xl font-bold text-[#1B4D1C] mt-2">Nueva Incidencia</h2>
        <DialogDescription className="text-sm text-gray-500 mt-1 px-6 leading-tight text-center">
          Reporta cualquier problema o incidencia en tu residencia
        </DialogDescription>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-[10px] font-bold uppercase text-gray-400 ml-1">¿Qué sucede?</Label>
          <Input 
            id="title" 
            name="title" 
            placeholder="Ej: Fuga de agua o bombilla fundida" 
            required 
            className="bg-gray-50 border-none rounded-2xl h-14 px-4 focus-visible:ring-[#82D14C]" 
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Área</Label>
          <Select 
            required
            onChange={(e) => setLocationType(e.target.value)}
          >
            <option value="" disabled>Selecciona lugar</option>
            <option value="habitacion">Mi Habitación</option>
            <option value="baño">Baños Comunes</option>
            <option value="cocina">Cocina</option>
            <option value="zonas_comunes">Zonas Comunes</option>
          </Select>
          
          {locationType === "habitacion" && (
            <div className="flex items-center gap-2 mt-2 ml-1 text-[#1B4D1C] bg-green-50 p-3 rounded-xl border border-green-100">
              <Info className="w-4 h-4" />
              <p className="text-[11px] font-medium italic">Detectaremos tu habitación automáticamente desde tu perfil.</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-[10px] font-bold uppercase text-gray-400 ml-1">Descripción detallada</Label>
          <textarea 
            id="description" 
            name="description" 
            placeholder="Cuéntanos más detalles del problema..." 
            required
            className="w-full bg-gray-50 border-none rounded-2xl min-h-[100px] p-4 focus-visible:ring-[#82D14C] resize-none text-sm" 
          />
        </div>

        {/* Urgencia */}
        <div className="flex items-center space-x-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
          <Checkbox
          id="urgent"
          name="urgent"
          checked={urgent}
          onCheckedChange={(val) => setUrgent(Boolean(val))}
          className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
        />          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <Label htmlFor="urgent" className="text-orange-800 text-sm font-bold cursor-pointer">Es una urgencia</Label>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-50 shrink-0 bg-white">
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