"use client"

import React, { useState } from "react"
import { AlertTriangle, Camera, Info, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "../../../components/ui/checkbox"
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "../../../components/ui/select2"
import { DialogDescription } from "../../../components/ui/dialog"
import { IncidenceService, type LocationType } from "../../../services/incidences"
import { useStaff } from "../../Staff/hooks/useStaff"

interface IncidenceFormProps {
  onSuccess: () => void
  onClose: () => void
  isAdmin?: boolean
}

export function IncidenceForm({ onSuccess, onClose, isAdmin = false }: IncidenceFormProps) {
  const { staff = [], loading: loadingStaff } = isAdmin ? useStaff() : { staff: [], loading: false };
  const [loading, setLoading] = useState(false)
  const [locationType, setLocationType] = useState<string>("")
  const [urgent, setUrgent] = useState<boolean>(false)
  const [staffId, setStaffId] = useState("")
  const [externalName, setExternalName] = useState("")
  const [base64Image, setBase64Image] = useState<string | null>(null) 

  //Convertir imagen a Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setBase64Image(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      location_type: locationType as LocationType,
      priority: (urgent ? "high" : "low") as 'low' | 'high',
      assigned_staff: isAdmin && staffId && staffId !== "external" && staffId !== "none" ? Number(staffId) : null,
      assigned_external_name: isAdmin && staffId === "external" ? externalName : "",
      img: base64Image,
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
      <div className={UI_CLASSES.header}>
        <h2 className={UI_CLASSES.title}>Nueva Incidencia</h2>
        <DialogDescription className={UI_CLASSES.description}>
          Reporta cualquier problema o incidencia en tu residencia
        </DialogDescription>
      </div>

      <div className={UI_CLASSES.body}>
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

        <div className="space-y-1.5">
          <Label className={UI_CLASSES.label}>Área</Label>
          <Select onValueChange={setLocationType} required>
            <SelectTrigger className={UI_CLASSES.selectTrigger}>
              <SelectValue placeholder="Selecciona el área" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl">
              {!isAdmin && (
                <SelectItem value="habitacion">Mi Habitación</SelectItem>
              )}
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

        {/*Si es administrador*/}
        {isAdmin && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <Label className={UI_CLASSES.label}>Asignar Responsable</Label>
            <Select onValueChange={setStaffId}>
              <SelectTrigger className={UI_CLASSES.selectTrigger}><SelectValue placeholder={loadingStaff ? "Cargando..." : "Sin asignar"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Dejar sin asignar</SelectItem>
                {staff.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.full_name}</SelectItem>)}
                <SelectItem value="external" className="text-emerald-600 font-bold">+ Externo</SelectItem>
              </SelectContent>
            </Select>
            {staffId === "external" && (
              <Input value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="Nombre empresa" className={UI_CLASSES.input} required />
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label className={UI_CLASSES.label}>Adjuntar Foto (Opcional)</Label>
          {!base64Image ? (
            <label className={UI_CLASSES.imageUploadPlaceholder}>
              <Camera className="w-6 h-6 mb-1 opacity-40" />
              <span className="text-xs font-medium opacity-60">Subir foto</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </label>
          ) : (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-green-100">
              <img src={base64Image} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => setBase64Image(null)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        
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
  imageUploadPlaceholder: "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
};