import { motion } from "framer-motion";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import logo from "../assets/logo.png";
import { preferencesService } from "../services/preferences";import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";

interface PreferencesFormProps {
    onComplete: () => void;
    onBack?: () => void;
}

interface Preferences {
    sex: string;
    age: number;
    schedule: string;
    studyLocation: string;
    socialLevel: number;
    weekendReturn: string;
    outsidePlansImportance: string;
    desiredActivities: string; 
    orderImportance: number;
    noiseTolerance: number;
    smokingVaping: string;
    visitorsPreference: string;
    basicItemsPreference: string;
    temperaturePreference: string;
}

const SEX_OPTIONS = [
    { id: "masculino", label: "Masculino" },
    { id: "femenino", label: "Femenino" },
    { id: "otro", label: "Otro" },
];

const SCHEDULE_OPTIONS = [
    { id: "madrugador", label: "Madrugador" },
    { id: "nocturno", label: "Nocturno" },
];

const STUDY_LOCATIONS = [
    { id: "habitacion_silencio", label: "En mi habitación en silencio total" },
    { id: "sala_estudio", label: "En la sala de estudio de la residencia" },
    { id: "biblioteca", label: "En bibliotecas públicas o facultad" },
    { id: "con_musica", label: "Con música o ruido ambiente" },
];

const WEEKEND_OPTIONS = [
    { id: "si_siempre", label: "Sí casi siempre" },
    { id: "a_veces", label: "A veces" },
    { id: "no_vuelvo", label: "No suelo volver a mi casa familiar" },
];

const PLANS_IMPORTANCE_OPTIONS = [
    { id: "muy_importante", label: "Muy importante, no paro en casa" },
    { id: "intermedio", label: "Intermedio" },
    { id: "casero", label: "Soy muy casero y disfruto mi tiempo en la habitación" },
];

const ACTIVITIES_OPTIONS = [
    { id: "esports", label: "Torneos de E-sports" },
    { id: "cenas", label: "Cenas temáticas" },
    { id: "maraton", label: "Maratón de series-películas" },
    { id: "juegos_mesa", label: "Tardes de juegos de mesa" },
    { id: "otro", label: "Otro" },
];

const SMOKING_OPTIONS = [
    { id: "no_me_molesta", label: "No y me molesta que lo hagan" },
    { id: "no_da_igual", label: "No pero me da igual si otro lo hace" },
    { id: "fumo", label: "Sí fumo y vapeo" },
];

const VISITOR_OPTIONS = [
    { id: "privado", label: "Prefiero que sea en un lugar privado solo para nosotros" },
    { id: "aviso", label: "Está bien de vez en cuando avisando antes" },
    { id: "siempre", label: "Me encanta que haya gente, mi cuarto está siempre abierto" },
];

const BASIC_ITEMS_OPTIONS = [
    { id: "estricto", label: "Prefiero que cada uno tenga lo suyo estrictamente" },
    { id: "compartir", label: "Me gusta comprar a medias y compartir" },
    { id: "confianza", label: "No me importa invitar o que me cojan si hay confianza" },
];

const TEMPERATURE_OPTIONS = [
    { id: "friolero", label: "Muy friolero - prefiero ventanas cerradas" },
    { id: "neutro", label: "Neutro" },
    { id: "caluroso", label: "Muy caluroso - necesito ventilar y dormir fresco" },
];

interface NumericInputProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
}

const NumericInput = ({ value, onChange, min, max }: NumericInputProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value.toString());

    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
    };

    const handleInputBlur = () => {
        const numValue = parseInt(inputValue, 10);
        if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
        } else {
            setInputValue(value.toString());
        }
        setIsEditing(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        } else if (e.key === 'Escape') {
            setInputValue(value.toString());
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={handleDecrement}
                disabled={value <= min}
                className="p-2 rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Minus className="w-4 h-4" />
            </button>
            
            {isEditing ? (
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    autoFocus
                    className="w-16 text-center px-3 py-2 border-2 border-[#509550] rounded-lg"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setInputValue(value.toString());
                        setIsEditing(true);
                    }}
                    className="w-16 text-center px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-900 font-semibold hover:border-gray-300 transition-all cursor-pointer"
                >
                    {value}
                </button>
            )}
            
            <button
                type="button"
                onClick={handleIncrement}
                disabled={value >= max}
                className="p-2 rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};

export function PreferencesForm({ onComplete, onBack }: PreferencesFormProps) {
    const [preferences, setPreferences] = useState<Preferences>({
        sex: "",
        age: 17,
        schedule: "",
        studyLocation: "",
        socialLevel: 5,
        weekendReturn: "",
        outsidePlansImportance: "",
        desiredActivities: "",
        orderImportance: 5,
        noiseTolerance: 5,
        smokingVaping: "",
        visitorsPreference: "",
        basicItemsPreference: "",
        temperaturePreference: "",
    });
    const [isLoading, setIsLoading] = useState(false);


    const setSingle = (key: keyof Preferences, value: string | number) => {
        setPreferences(prev => ({ ...prev, [key]: value } as Preferences));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!preferences.sex) {
            toast.error("Por favor selecciona tu sexo");
            return;
        }
        if (!preferences.schedule) {
            toast.error("Por favor selecciona tu horario");
            return;
        }
        if (!preferences.studyLocation) {
            toast.error("Por favor selecciona dónde prefieres estudiar");
            return;
        }
        if (!preferences.weekendReturn) {
            toast.error("Por favor responde si te quedas los fines de semana");
            return;
        }
        if (!preferences.outsidePlansImportance) {
            toast.error("Por favor selecciona la importancia de planes fuera");
            return;
        }
        if (!preferences.desiredActivities) {
            toast.error("Por favor selecciona qué actividades te gustaría hacer");
            return;
        }
        if (!preferences.smokingVaping) {
            toast.error("Por favor responde sobre fumar o vapear");
            return;
        }
        if (!preferences.visitorsPreference) {
            toast.error("Por favor selecciona tu preferencia sobre visitantes");
            return;
        }
        if (!preferences.basicItemsPreference) {
            toast.error("Por favor selecciona tu preferencia sobre comprar básicos");
            return;
        }
        if (!preferences.temperaturePreference) {
            toast.error("Por favor selecciona tu preferencia térmica");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                sex: preferences.sex,
                age: preferences.age,
                schedule: preferences.schedule,
                study_location: preferences.studyLocation,
                social_level: preferences.socialLevel,
                weekend_return: preferences.weekendReturn,
                outside_plans_importance: preferences.outsidePlansImportance,
                desired_activity: preferences.desiredActivities,
                order_importance: preferences.orderImportance,
                noise_tolerance: preferences.noiseTolerance,
                smoking_vaping: preferences.smokingVaping,
                visitors_preference: preferences.visitorsPreference,
                basic_items_preference: preferences.basicItemsPreference,
                temperature_preference: preferences.temperaturePreference,
            };

            await preferencesService.saveMyPreferences(payload);
            toast.success("¡Preferencias guardadas exitosamente!");
            onComplete();
        } catch (error: any) {
            toast.error(error.message || "Error al guardar preferencias");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full bg-gray-50 flex flex-col items-center justify-start p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.5 }} 
                className="w-full max-w-2xl space-y-6 py-6"
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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cuentanos tus preferencias</h1>
                    <p className="text-gray-500 mt-2">Para personalizar tu experiencia en NexUS</p>
                </div>

                <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
                    <CardContent className="p-8 space-y-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Sexo */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">Sexo</Label>
                                <div className="flex flex-wrap gap-3">
                                    {SEX_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('sex', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.sex === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Edad */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    Edad <span className="text-sm font-normal text-gray-500">(17-35)</span>
                                </Label>
                                <NumericInput
                                    value={preferences.age}
                                    onChange={(value) => setSingle('age', value)}
                                    min={17}
                                    max={35}
                                />
                            </div>

                            {/* Horario */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">Horario</Label>
                                <div className="flex gap-3">
                                    {SCHEDULE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('schedule', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.schedule === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Lugar de estudio */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Dónde prefieres estudiar habitualmente?
                                </Label>
                                <div className="flex flex-col gap-2">
                                    {STUDY_LOCATIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('studyLocation', opt.id)}
                                            className={`text-left px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.studyLocation === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Nivel social */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Cómo de social te consideras? <span className="text-sm font-normal text-gray-500">(1-10)</span>
                                </Label>
                                <NumericInput
                                    value={preferences.socialLevel}
                                    onChange={(value) => setSingle('socialLevel', value)}
                                    min={1}
                                    max={10}
                                />
                            </div>

                            {/* Fin de semana */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Sueles quedarte los fines de semana?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {WEEKEND_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('weekendReturn', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.weekendReturn === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Importancia planes */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Cómo de importante es para ti hacer planes fuera de la residencia?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {PLANS_IMPORTANCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('outsidePlansImportance', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.outsidePlansImportance === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actividades deseadas */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Qué tipo de actividades te gustaría hacer en la residencia?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {ACTIVITIES_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('desiredActivities', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.desiredActivities === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Importancia orden/limpieza */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Qué tan importante es para ti el orden y la limpieza? <span className="text-sm font-normal text-gray-500">(1-10)</span>
                                </Label>
                                <NumericInput
                                    value={preferences.orderImportance}
                                    onChange={(value) => setSingle('orderImportance', value)}
                                    min={1}
                                    max={10}
                                />
                            </div>

                            {/* Tolerancia ruido */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Cuál es tu nivel de tolerancia al ruido cuando intentas descansar? <span className="text-sm font-normal text-gray-500">(1-10)</span>
                                </Label>
                                <NumericInput
                                    value={preferences.noiseTolerance}
                                    onChange={(value) => setSingle('noiseTolerance', value)}
                                    min={1}
                                    max={10}
                                />
                            </div>

                            {/* Fumas/vapeas */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Fumas o vapeas?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {SMOKING_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('smokingVaping', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.smokingVaping === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amigos/pareja */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Cómo te sientes respecto a traer amigos o a tu pareja a la habitación?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {VISITOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('visitorsPreference', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.visitorsPreference === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comprar básicos */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    A la hora de comprar cosas básicas (papel higiénico, jabón...)...
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {BASIC_ITEMS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('basicItemsPreference', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.basicItemsPreference === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Temperamento térmico */}
                            <div className="space-y-4">
                                <Label className="text-lg font-semibold text-gray-900">
                                    ¿Eres más bien friolero o caluroso?
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {TEMPERATURE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSingle('temperaturePreference', opt.id)}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                                preferences.temperaturePreference === opt.id
                                                    ? 'border-[#509550] bg-emerald-50 text-[#509550]'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
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
