"use client"

import React, { useEffect, useState } from "react"
import { AlertTriangle, Camera, Info, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Checkbox } from "../../../components/ui/checkbox"
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "../../../components/ui/select2"
import { DialogDescription } from "../../../components/ui/dialog"
import { IncidenceService } from "../../../services/incidences"
import { BaseIncidence } from "./IncidenceShared"
import { fetchWithAuth } from "../../../utils/api"

interface IncidenceFormProps {
  onSuccess: () => void
  onClose: () => void
  isAdmin?: boolean
  initialData?: BaseIncidence | null
}

export function IncidenceForm({ onSuccess, onClose, isAdmin = false, initialData }: IncidenceFormProps) {
  const [loading, setLoading] = useState(false)
  const [locationType, setLocationType] = useState<string>("")
  const [urgent, setUrgent] = useState<boolean>(false)
  const [staffId, setStaffId] = useState("")
  const [externalName, setExternalName] = useState("")
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")

  useEffect(() => {
    if (isAdmin) {
      fetchWithAuth('/api/bedrooms/').then(res => res.json()).then(data => setRooms(data));
    }
  }, [isAdmin]);
  
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
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!locationType) {
      setAreaError(true);
      return;
    }

    setAreaError(false);
    setLoading(true);

    const payload: any = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      location_type: locationType as LocationType,
      priority: (urgent ? "high" : "low") as 'low' | 'high',
      room_number: locationType === "habitacion" && selectedRoomId ? Number(selectedRoomId) : null,
      assigned_staff: isAdmin && staffId && !["external", "none"].includes(staffId) ? Number(staffId) : null,
      assigned_external_name: isAdmin && staffId === "external" ? externalName : "",
      img: base64Image,
      location_type: locationType,
      priority: urgent ? "high" : "low"
    };

    if (locationType === 'habitacion') {
      payload.room_number = initialData?.room_number || "Pendiente";
    } else {
      payload.room_number = "";
    }

    if (base64Image && base64Image.startsWith("data:image")) {
      payload.img = base64Image;
    } else if (base64Image === null && initialData?.img) {
      payload.img = "";
    }

    try {
      if (initialData) {
        await IncidenceService.update(initialData.id, payload);
      } else {
        await IncidenceService.create(payload);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Fallo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={UI_CLASSES.form}>
      <div className={UI_CLASSES.header}>
        <h2 className={UI_CLASSES.title}>{initialData ? "Editar Incidencia" : "Nueva Incidencia"}</h2>
        <DialogDescription className={UI_CLASSES.description}>
          {initialData ? "Modifica los detalles del reporte" : "Reporta cualquier problema o incidencia en tu residencia"}
        </DialogDescription>
      </div>

      <div className={UI_CLASSES.body}>
        {/* Campo Título */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="title" className={UI_CLASSES.label}>¿Qué sucede?</Label>
          <Input id="title" name="title" defaultValue={initialData?.title} required className={UI_CLASSES.input} />
        </div>

        {/* Campo Área */}
        <div className="space-y-1.5 text-left">
          <Label className={UI_CLASSES.label}>Área</Label>
          <Select onValueChange={setLocationType} defaultValue={locationType} required>
            <SelectTrigger
              className={`${UI_CLASSES.selectTrigger} ${areaError && !locationType ? 'border-2 border-red-500 bg-red-50' : ''}`}
            >
              <SelectValue placeholder="Selecciona el área" />
            </SelectTrigger>
            {areaError && !locationType && (
              <p className="text-[11px] text-red-500 font-bold mt-1 ml-1">
                ⚠️ Por favor, selecciona un área
              </p>
            )}            <SelectContent className="rounded-2xl">
              {!isAdmin && <SelectItem value="habitacion">Mi Habitación</SelectItem>}
              <SelectItem value="baño">Baño Común</SelectItem>
              <SelectItem value="cocina">Cocina</SelectItem>
              <SelectItem value="comedor">Comedor</SelectItem>
              <SelectItem value="salas_comunes">Salas Comunes</SelectItem>
              <SelectItem value="exterior">Zonas Exteriores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campo Descripción */}
        <div className="space-y-1.5 text-left">
          <Label className={UI_CLASSES.label}>Descripción detallada</Label>
          <textarea id="description" name="description" defaultValue={initialData?.description} required className={UI_CLASSES.textarea} />
        </div>

        {/* Campo Foto */}
        <div className="space-y-2 text-left">
          <Label className={UI_CLASSES.label}>Foto (Opcional)</Label>
          {base64Image ? (
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-green-100">
              <img src={base64Image} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setBase64Image(null)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"><X size={16} /></button>
            </div>
          ) : (
            <label className={UI_CLASSES.imageUploadPlaceholder}>
              <Camera className="w-6 h-6 mb-1 opacity-40" />
              <span className="text-xs font-medium opacity-60">Subir foto</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { const r = new FileReader(); r.onloadend = () => setBase64Image(r.result as string); r.readAsDataURL(file); }
              }} className="hidden" />
            </label>
          )}
        </div>

        {/* Campo Urgencia */}
        <div className={UI_CLASSES.urgentBox}>
          <Checkbox id="urgent" checked={urgent} onCheckedChange={(val) => setUrgent(Boolean(val))} />
          <Label htmlFor="urgent" className="text-orange-800 text-sm font-bold flex items-center gap-2 cursor-pointer">
            <AlertTriangle className="w-4 h-4" /> Es una urgencia
          </Label>
        </div>
      </div>

      <div className={UI_CLASSES.footer}>
        <Button type="submit" disabled={loading} variant="nexus" size="xl" className="w-full">
          {loading ? "Procesando..." : (initialData ? "Guardar Cambios" : "Enviar Reporte")}
        </Button>
      </div>
    </form>
  )
}

const UI_CLASSES = {
  form: "flex flex-col h-full max-h-[90vh] bg-white overflow-hidden",
  header: "p-6 text-center border-b border-gray-50 shrink-0 relative",
  closeBtn: "absolute right-4 top-4 p-2 hover:bg-gray-50 rounded-full transition-colors z-10",
  title: "text-xl font-bold text-green-900 mt-2",
  description: "text-sm text-gray-500 mt-1 px-6 leading-tight text-center font-normal",
  body: "flex-1 overflow-y-auto p-6 space-y-5",
  footer: "p-6 border-t border-gray-50 shrink-0 bg-white",
  label: "text-[10px] font-bold uppercase text-gray-400 ml-1",
  input: "bg-gray-50 border-none rounded-2xl h-14 px-4 focus-visible:ring-green-400 font-normal",
  selectTrigger: "bg-gray-50 border-none rounded-2xl h-14 px-4 text-gray-500 focus:ring-green-400 font-normal",
  textarea: "w-full bg-gray-50 border-none rounded-2xl min-h-[100px] p-4 focus-visible:ring-green-400 resize-none text-sm font-normal",
  urgentBox: "flex items-center space-x-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100",
  imageUploadPlaceholder: "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
};