import { useState, ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Label } from "../../../../components/ui/label";
import { LocationSelector } from "./LocationSelector";
import { saveStudentProfile } from "../../../../services/api";

export interface ProfileFormData {
  name: string;
  nickname: string;
  bio: string;
  birthplace: string;
  roomNumber: string;
  room: string;
  profileImage: string | null;
  interests: string[];
  customInterests: string[];
  chronotype: "early" | "night" | "flexible";
  studyLevel: number;
  noiseSensitivity: number;
  temperaturePreference: "cold" | "neutral" | "warm";
  orderLevel: "meticulous" | "relaxed";
  lifestyle: string[];
  musicGenres: string[];
  dealbreakers: string[];
}

const predefinedInterests = [
  "Lectura",
  "Cine",
  "Videojuegos",
  "Deporte",
  "Cocina",
  "Viajes",
];

const lifestyleOptions = [
  "No fumador",
  "Sociable",
  "Deportista",
  "Vegano",
  "Mascotas",
];

const musicGenresOptions = [
  "Rock",
  "Pop",
  "Techno",
  "Reggaeton",
  "Indie",
  "Clásica",
];

const dealbreakersOptions = [
  "Humo de tabaco",
  "Visitas frecuentes",
  "Mascotas",
  "Alcohol/Fiestas",
];

interface ProfileEditFormProps {
  initialData: ProfileFormData;
  onClose: () => void;
  onSave: (updatedData: ProfileFormData) => void;
}

export function ProfileEditForm({
  initialData,
  onClose,
  onSave,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData.profileImage
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newInterestInput, setNewInterestInput] = useState("");

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData((prev) => ({
          ...prev,
          profileImage: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (
    tag: string,
    field: "interests" | "lifestyle" | "musicGenres" | "dealbreakers"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(tag)
        ? prev[field].filter((t) => t !== tag)
        : [...prev[field], tag],
    }));
  };

  const addCustomInterest = () => {
    const trimmedInput = newInterestInput.trim();
    if (trimmedInput.length > 30) {
      alert("El interés no puede superar los 30 caracteres.");
      return;
    }
    if (trimmedInput && !formData.customInterests.includes(trimmedInput)) {
      setFormData((prev) => ({
        ...prev,
        customInterests: [...prev.customInterests, trimmedInput],
      }));
      setNewInterestInput("");
    }
  };

  const removeCustomInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      customInterests: prev.customInterests.filter((i) => i !== interest),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validaciones (NX-FB.07/30)
    if (!formData.birthplace || formData.birthplace.trim() === "") {
      toast.error("El lugar de origen es obligatorio.");
      return;
    }

    if (formData.bio && formData.bio.length > 300) {
      toast.error("La biografía no puede superar los 300 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      // Mapeamos los datos para el backend
      const apiPayload = {
        nickname: formData.nickname,
        bio: formData.bio,
        birthplace: formData.birthplace,
        chronotype: formData.chronotype === "early" ? "morning" : formData.chronotype === "night" ? "night" : "midday",
        study_level: formData.studyLevel,
        noise_sensitivity: formData.noiseSensitivity,
        temperature_preference: formData.temperaturePreference === "cold" ? "cold" : formData.temperaturePreference === "warm" ? "warm" : "cool",
        order_level: formData.orderLevel === "meticulous" ? "very_organized" : "organized",
        interests: formData.interests,
        custom_interests: formData.customInterests,
        lifestyle: formData.lifestyle,
        music_genres: formData.musicGenres,
        dealbreakers: formData.dealbreakers,
      };

      await saveStudentProfile(apiPayload);

      onSave(formData);

    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Error al guardar el perfil. Por favor, inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-3xl flex-shrink-0 z-10">
          <h2 className="text-2xl font-bold text-gray-900">Editar Perfil</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-500 transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* 1. IDENTIDAD Y BIOGRAFÍA */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Identidad y Biografía
            </h3>

            {/* Foto de Perfil */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Foto de Perfil
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">
                      {formData.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    <Upload size={18} />
                    Subir imagen
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Nombre y Apodo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-500">
                  Nombre Completo *
                </Label>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-gray-500">
                  Apodo
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="Carlos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room" className="text-sm font-medium text-gray-500">
                  Habitación
                </Label>
                <Input
                  id="room"
                  type="text"
                  value={formData.room || formData.roomNumber || "Sin asignar"}
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Sobre mí */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium text-gray-500">
                Sobre mí ({formData.bio.length}/300)
              </Label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                maxLength={300}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Cuéntanos sobre ti. ¿De dónde eres? ¿Qué te apasiona?"
              />
            </div>

            {/* Lugar de Origen */}
            <LocationSelector
              value={formData.birthplace}
              onChange={(city) =>
                setFormData((prev) => ({ ...prev, birthplace: city }))
              }
            />
          </section>

          {/* 2. INTERESES Y HOBBIES */}
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Intereses y Hobbies
            </h3>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-500">
                Intereses Predefinidos
              </Label>
              <div className="flex flex-wrap gap-2">
                {predefinedInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleTag(interest, "interests")}
                    className={`px-4 py-2 rounded-full transition-all text-sm font-medium border-2 ${formData.interests.includes(interest)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-green-400"
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Intereses Personalizados */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-500">
                Añadir Intereses Personalizados
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  placeholder="Ej: Fotografía (máx 30 car.)"
                  maxLength={30}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomInterest();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addCustomInterest}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3"
                >
                  <Plus size={18} />
                </Button>
              </div>

              {formData.customInterests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.customInterests.map((interest) => (
                    <div
                      key={interest}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded-full text-sm font-medium text-blue-700"
                    >
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeCustomInterest(interest)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 3. HÁBITOS Y CONVIVENCIA */}
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Hábitos y Convivencia
            </h3>

            {/* Cronotipo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Cronotipo (Hábitos de sueño) *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "early", label: "Madrugador" },
                  { value: "flexible", label: "Flexible" },
                  { value: "night", label: "Nocturno" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        chronotype: option.value as "early" | "night" | "flexible",
                      })
                    }
                    className={`p-3 rounded-lg border-2 transition font-medium ${formData.chronotype === option.value
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-green-400"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel de Estudio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Nivel de Estudio: {formData.studyLevel}/5
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Relajado
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.studyLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      studyLevel: parseInt(e.target.value),
                    })
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Muy estudioso
                </span>
              </div>
            </div>

            {/* Sensibilidad al Ruido */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Sensibilidad al Ruido: {formData.noiseSensitivity}/5
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Silencio
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.noiseSensitivity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      noiseSensitivity: parseInt(e.target.value),
                    })
                  }
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Animado
                </span>
              </div>
            </div>

            {/* Preferencia de Temperatura */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Preferencia de Temperatura *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "cold", label: "Frío ❄️" },
                  { value: "neutral", label: "Neutro 🌡️" },
                  { value: "warm", label: "Caluroso 🔥" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        temperaturePreference: option.value as
                          | "cold"
                          | "neutral"
                          | "warm",
                      })
                    }
                    className={`p-3 rounded-lg border-2 transition font-medium ${formData.temperaturePreference === option.value
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-green-400"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel de Orden */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500">
                Nivel de Orden *
              </Label>
              <div className="space-y-2">
                {[
                  { value: "meticulous", label: "Meticuloso", desc: "Todo debe estar en su lugar" },
                  { value: "relaxed", label: "Relajado", desc: "Flexible con el orden" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                  >
                    <input
                      type="radio"
                      name="orderLevel"
                      value={option.value}
                      checked={formData.orderLevel === option.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          orderLevel: e.target.value as "meticulous" | "relaxed",
                        })
                      }
                      className="w-4 h-4"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-sm text-gray-500">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 4. ESTILO DE VIDA */}
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Estilo de Vida
            </h3>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-500">
                Características de tu Estilo de Vida
              </Label>
              <div className="flex flex-wrap gap-2">
                {lifestyleOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleTag(option, "lifestyle")}
                    className={`px-4 py-2 rounded-full transition-all text-sm font-medium border-2 ${formData.lifestyle.includes(option)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-purple-400"
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 5. GUSTOS MUSICALES */}
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Gustos Musicales
            </h3>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-500">
                Géneros que te gustan 🎵
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {musicGenresOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleTag(genre, "musicGenres")}
                    className={`px-4 py-2 rounded-full transition-all text-sm font-medium border-2 ${formData.musicGenres.includes(genre)
                      ? "bg-pink-600 text-white border-pink-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-pink-400"
                      }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 6. LÍMITES INFRANQUEABLES */}
          <section className="space-y-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Límites Infranqueables
            </h3>

            <p className="text-sm text-gray-500">
              Selecciona los elementos que NO puedes tolerar
            </p>

            <div className="space-y-3">
              {dealbreakersOptions.map((dealbreaker) => (
                <label
                  key={dealbreaker}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                >
                  <Checkbox
                    checked={formData.dealbreakers.includes(dealbreaker)}
                    onCheckedChange={() => toggleTag(dealbreaker, "dealbreakers")}
                  />
                  <span className="ml-3 font-medium text-gray-900">
                    {dealbreaker}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 flex-shrink-0 bg-gray-50 rounded-b-3xl">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}