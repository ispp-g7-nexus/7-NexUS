import "./Profile.css";
import { useState, useEffect } from "react";
import { User, Sparkles, Home, Edit, Music, Heart } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ProfileEditForm, type ProfileFormData } from "./components/ProfileEditForm";
import { getStudentProfile } from "../../../services/api";
import { preferencesService } from "../../../services/preferences"; // <-- AÑADIDA ESTA LÍNEA

const emptyProfileData: ProfileFormData = {
  name: "", 
  nickname: "",
  bio: "",
  birthplace: "",
  profileImage: null,
  interests: [],
  customInterests: [],
  chronotype: "flexible",
  studyLevel: 3,
  noiseSensitivity: 3,
  temperaturePreference: "neutral",
  orderLevel: "relaxed",
  lifestyle: [],
  musicGenres: [],
  dealbreakers: [],
  roomNumber: "",
  room: "",
};

export function Profile() {
  const [profileData, setProfileData] = useState<ProfileFormData>(
    emptyProfileData
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from API on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Hacemos ambas peticiones en paralelo para que sea más rápido
        const [apiData, prefData] = await Promise.all([
          getStudentProfile().catch(() => null),
          preferencesService.getMyPreferences().catch(() => null)
        ]);

        if (apiData || prefData) {
          // Map API data to frontend format combinando ambos resultados
          setProfileData(prev => ({
            ...prev,
            nickname: apiData?.nickname || prev.nickname,
            bio: apiData?.bio || prev.bio,
            birthplace: apiData?.birthplace || prev.birthplace,
            profileImage: apiData?.profile_image || prev.profileImage,
            
            // Damos prioridad a prefData (preferences), si no está, usamos apiData (profile)
            chronotype: mapChronotypeFromApi(prefData?.schedule || apiData?.chronotype) || prev.chronotype,
            temperaturePreference: mapTemperatureFromApi(prefData?.temperature_preference || apiData?.temperature_preference) || prev.temperaturePreference,
            orderLevel: mapOrderLevelFromApi(prefData?.order_importance || apiData?.order_level) || prev.orderLevel,
            
            // Adaptamos el nivel de ruido (en preferences viene sobre 10, en tu UI lo muestras sobre 5, así que lo dividimos entre 2 y redondeamos)
            noiseSensitivity: prefData?.noise_tolerance ? Math.round(prefData.noise_tolerance / 2) : (apiData?.noise_sensitivity || prev.noiseSensitivity),
            
            studyLevel: apiData?.study_level || prev.studyLevel,
            interests: apiData?.interests || prev.interests,
            customInterests: apiData?.custom_interests || prev.customInterests,
            lifestyle: apiData?.lifestyle || prev.lifestyle,
            musicGenres: apiData?.music_genres || prev.musicGenres,
            dealbreakers: apiData?.dealbreakers || prev.dealbreakers,
            name: apiData?.name || prev.name,
            room: apiData?.room || apiData?.room_number || prev.room,
          }));
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Helper functions to map API values to frontend format (Actualizadas para entender Español e Inglés)
  const mapChronotypeFromApi = (value: string | undefined | null): "early" | "night" | "flexible" => {
    if (!value) return "flexible";
    const val = String(value).toLowerCase();
    if (val === "morning" || val === "madrugador") return "early";
    if (val === "night" || val === "nocturno") return "night";
    return "flexible";
  };

  const mapTemperatureFromApi = (value: string | undefined | null): "cold" | "neutral" | "warm" => {
    if (!value) return "neutral";
    const val = String(value).toLowerCase();
    if (val === "cold" || val === "friolero" || val === "frio") return "cold";
    if (val === "warm" || val === "hot" || val === "caluroso") return "warm";
    return "neutral";
  };

  const mapOrderLevelFromApi = (value: string | number | undefined | null): "meticulous" | "relaxed" => {
    if (value === undefined || value === null || value === "") return "relaxed";
    // Si viene de preferences (es un número del 1 al 10)
    if (typeof value === 'number') {
      return value > 5 ? "meticulous" : "relaxed";
    }
    // Si viene de profile (es texto)
    const val = String(value).toLowerCase();
    if (val === "very_organized" || val === "organized" || val === "meticuloso") return "meticulous";
    return "relaxed";
  };

  const handleSaveSuccess = (updatedData: ProfileFormData) => {
    setProfileData(updatedData);    
    setIsEditModalOpen(false);
  };

  const getChronotypeLabel = (value: string) => {
    const labels: Record<string, string> = {
      early: "Madrugador 🌅",
      flexible: "Flexible 🌤️",
      night: "Nocturno 🌙",
    };
    return labels[value] || value;
  };

  const getTemperatureLabel = (value: string) => {
    const labels: Record<string, string> = {
      cold: "Frío ❄️",
      neutral: "Neutro 🌡️",
      warm: "Caluroso 🔥",
    };
    return labels[value] || value;
  };

  const getOrderLevelLabel = (value: string) => {
    const labels: Record<string, string> = {
      meticulous: "Meticuloso",
      relaxed: "Relajado",
    };
    return labels[value] || value;
  };

  const allInterests = [
    ...profileData.interests,
    ...profileData.customInterests,
  ];

  if (isLoading) {
    return (
      <div className="profile-container flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header Card */}
      <div className="profile-header-card">
        <div className="profile-header-content">
          <div className="profile-avatar-placeholder">
            {profileData.profileImage ? (
              <img
                src={profileData.profileImage}
                alt={profileData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              profileData.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="profile-name">{profileData.name}</h2>
            {profileData.nickname && (
              <span className="profile-nickname">@{profileData.nickname}</span>
            )}
            <span className="profile-room">
              <Home size={14} /> Habitación {profileData.room || profileData.roomNumber || "Sin asignar"}
            </span>
            <div className="flex items-center gap-2 mt-3">
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/40 rounded-xl border-none"
                >
                  <Edit size={14} className="mr-2" /> Editar Perfil
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Información Card */}
      <div className="profile-info-card">
        <section>
          <h3 className="profile-section-title">
            <User size={18} className="text-primary" /> Sobre mí
          </h3>
          <p className="profile-bio-text">{profileData.bio}</p>
          {profileData.birthplace && (
            <p className="profile-bio-text text-sm text-gray-500 mt-2">
              📍 {profileData.birthplace}
            </p>
          )}
        </section>

        {allInterests.length > 0 && (
          <section className="profile-section">
            <h3 className="profile-section-title">
              <Sparkles size={18} className="text-primary" /> Intereses y Hobbies
            </h3>
            <div className="interests-grid">
              {allInterests.map((item) => (
                <span key={item} className="interest-tag">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="profile-section">
          <h3 className="profile-section-title">🏠 Hábitos y Convivencia</h3>
          <div className="preferences-grid">
            <div className="preference-item">
              <span className="preference-label">Cronotipo</span>
              <span className="preference-value">{getChronotypeLabel(profileData.chronotype)}</span>
            </div>
            <div className="preference-item">
              <span className="preference-label">Nivel de Estudio</span>
              <span className="preference-value">{profileData.studyLevel}/5</span>
            </div>
            <div className="preference-item">
              <span className="preference-label">Sensibilidad Ruido</span>
              <span className="preference-value">{profileData.noiseSensitivity}/5</span>
            </div>
            <div className="preference-item">
              <span className="preference-label">Temperatura</span>
              <span className="preference-value">{getTemperatureLabel(profileData.temperaturePreference)}</span>
            </div>
            <div className="preference-item">
              <span className="preference-label">Nivel de Orden</span>
              <span className="preference-value">{getOrderLevelLabel(profileData.orderLevel)}</span>
            </div>
          </div>
        </section>

        {profileData.lifestyle.length > 0 && (
          <section className="profile-section">
            <h3 className="profile-section-title">❤️ Estilo de Vida</h3>
            <div className="interests-grid">
              {profileData.lifestyle.map((item) => (
                <span key={item} className="interest-tag interest-tag-purple">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {profileData.musicGenres.length > 0 && (
          <section className="profile-section">
            <h3 className="profile-section-title">
              <Music size={18} /> Gustos Musicales
            </h3>
            <div className="interests-grid">
              {profileData.musicGenres.map((item) => (
                <span key={item} className="interest-tag interest-tag-pink">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {profileData.dealbreakers.length > 0 && (
          <section className="profile-section">
            <h3 className="profile-section-title">
              <Heart size={18} className="text-red-600" /> Límites Infranqueables
            </h3>
            <div className="dealbreakers-list">
              {profileData.dealbreakers.map((item) => (
                <span key={item} className="dealbreaker-tag">
                  ⛔ {item}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ProfileEditForm
          initialData={profileData}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveSuccess} 
        />
      )}
    </div>
  );
}