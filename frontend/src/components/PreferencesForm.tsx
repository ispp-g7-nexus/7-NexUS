import { motion } from "framer-motion";
import { ArrowLeft, Heart, Music, Utensils, Dumbbell, BookOpen, Gamepad2, Camera, Palette, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import logo from "../assets/logo.png";
import { preferencesService } from "../services/preferences";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface PreferencesFormProps {
    onComplete: () => void;
    onBack?: () => void;
}

interface Preferences {
    interests: string[];
    dietaryRestrictions: string[];
    hobbies: string[];
    additionalInfo: string;
}

const AVAILABLE_INTERESTS = [
    { id: "sports", label: "Deportes", icon: Dumbbell },
    { id: "music", label: "Música", icon: Music },
    { id: "cooking", label: "Cocina", icon: Utensils },
    { id: "reading", label: "Lectura", icon: BookOpen },
    { id: "gaming", label: "Videojuegos", icon: Gamepad2 },
    { id: "photography", label: "Fotografía", icon: Camera },
    { id: "art", label: "Arte", icon: Palette },
    { id: "technology", label: "Tecnología", icon: Zap },
];

const DIETARY_OPTIONS = [
    "Vegetariano",
    "Vegano",
    "Sin gluten",
    "Intolerancia a la lactosa",
    "Halal",
    "Kosher",
    "Ninguna",
];

export function PreferencesForm({ onComplete, onBack }: PreferencesFormProps) {
    const [preferences, setPreferences] = useState<Preferences>({
        interests: [],
        dietaryRestrictions: [],
        hobbies: "",
        additionalInfo: "",
    });
    const [isLoading, setIsLoading] = useState(false);

    const toggleInterest = (interestId: string) => {
        setPreferences(prev => ({
            ...prev,
            interests: prev.interests.includes(interestId)
                ? prev.interests.filter(id => id !== interestId)
                : [...prev.interests, interestId]
        }));
    };

    const toggleDietary = (dietary: string) => {
        setPreferences(prev => ({
            ...prev,
            dietaryRestrictions: prev.dietaryRestrictions.includes(dietary)
                ? prev.dietaryRestrictions.filter(d => d !== dietary)
                : [...prev.dietaryRestrictions, dietary]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (preferences.interests.length === 0) {
            toast.error("Por favor selecciona al menos un interés");
            return;
        }

        setIsLoading(true);
        try {
            // TODO: Make API call to save preferences
            // const response = await preferencesService.save(preferences);
            
            // For now, just simulate the save
            console.log("Saving preferences:", preferences);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast.success("¡Preferencias guardadas exitosamente!");
            onComplete();
        } catch (error: any) {
            toast.error(error.message || "Error al guardar preferencias");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }} 
                className="w-full max-w-2xl space-y-6"
            >
                {onBack && (
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> <span>Volver</span>
                    </button>
                )}

                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                        <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Conoceremos tus preferencias</h1>
                    <p className="text-gray-500 mt-2">Para personalizar tu experiencia en NexUS</p>
                </div>

                <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
                    <CardContent className="p-8 space-y-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Interests Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-red-500" />
                                    <Label className="text-lg font-semibold text-gray-900">
                                        ¿Cuáles son tus intereses? (selecciona al menos uno)
                                    </Label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {AVAILABLE_INTERESTS.map(interest => {
                                        const Icon = interest.icon;
                                        const isSelected = preferences.interests.includes(interest.id);
                                        return (
                                            <button
                                                key={interest.id}
                                                type="button"
                                                onClick={() => toggleInterest(interest.id)}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                                    isSelected
                                                        ? "border-[#509550] bg-emerald-50 text-[#509550]"
                                                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                                }`}
                                            >
                                                <Icon className="w-6 h-6" />
                                                <span className="text-sm font-medium">{interest.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dietary Restrictions Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-orange-500" />
                                    <Label className="text-lg font-semibold text-gray-900">
                                        Restricciones dietéticas o alergias (opcional)
                                    </Label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {DIETARY_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleDietary(option)}
                                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                                preferences.dietaryRestrictions.includes(option)
                                                    ? "border-[#509550] bg-emerald-50 text-[#509550]"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Hobbies */}
                            <div className="space-y-3">
                                <Label htmlFor="hobbies" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                    <Gamepad2 className="w-5 h-5 text-blue-500" />
                                    Otros hobbies o actividades (opcional)
                                </Label>
                                <Textarea
                                    id="hobbies"
                                    placeholder="Cuéntanos sobre otras actividades que disfrutes..."
                                    value={preferences.hobbies}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, hobbies: e.target.value }))}
                                    className="min-h-24 resize-none"
                                />
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-3">
                                <Label htmlFor="additionalInfo" className="text-lg font-semibold text-gray-900">
                                    Algo más que quieras que sepamos (opcional)
                                </Label>
                                <Textarea
                                    id="additionalInfo"
                                    placeholder="Puedes escribir cualquier cosa que consideres relevante para mejorar tu experiencia en la residencia..."
                                    value={preferences.additionalInfo}
                                    onChange={(e) => setPreferences(prev => ({ ...prev, additionalInfo: e.target.value }))}
                                    className="min-h-24 resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full h-14 text-lg bg-[#509550] hover:bg-[#3d7a3d] text-white shadow-md transition-all"
                            >
                                {isLoading ? "Guardando preferencias..." : "Completar Perfil"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
