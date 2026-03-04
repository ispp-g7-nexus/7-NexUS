import "./Profile.css";
import { useState, useEffect } from "react";
import { User, Sparkles, Home, Edit, Music, Heart } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { ProfileEditForm, type ProfileFormData } from "./components/ProfileEditForm";
import { getStudentProfile } from "../../../services/api";

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
        const apiData = await getStudentProfile();
        if (apiData) {
          // Map API data to frontend format
          setProfileData(prev => ({
            ...prev,
            nickname: apiData.nickname || prev.nickname,
            bio: apiData.bio || prev.bio,
            birthplace: apiData.birthplace || prev.birthplace,
            profileImage: apiData.profile_image || prev.profileImage,
            chronotype: mapChronotypeFromApi(apiData.chronotype) || prev.chronotype,
            studyLevel: apiData.study_level || prev.studyLevel,
            noiseSensitivity: apiData.noise_sensitivity || prev.noiseSensitivity,
            temperaturePreference: mapTemperatureFromApi(apiData.temperature_preference) || prev.temperaturePreference,
            orderLevel: mapOrderLevelFromApi(apiData.order_level) || prev.orderLevel,
            interests: apiData.interests || prev.interests,
            customInterests: apiData.custom_interests || prev.customInterests,
            lifestyle: apiData.lifestyle || prev.lifestyle,
            musicGenres: apiData.music_genres || prev.musicGenres,
            dealbreakers: apiData.dealbreakers || prev.dealbreakers,
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

  // Helper functions to map API values to frontend format
  const mapChronotypeFromApi = (value: string): "early" | "night" | "flexible" => {
    if (value === "morning") return "early";
    if (value === "night") return "night";
    return "flexible";
  };

  const mapTemperatureFromApi = (value: string): "cold" | "neutral" | "warm" => {
    if (value === "cold") return "cold";
    if (value === "warm" || value === "hot") return "warm";
    return "neutral";
  };

  const mapOrderLevelFromApi = (value: string): "meticulous" | "relaxed" => {
    if (value === "very_organized" || value === "organized") return "meticulous";
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
              <Home size={14} /> Habitación 305-A
            </span>
            <Button
              onClick={() => setIsEditModalOpen(true)}
              className="mt-3 bg-white/20 border-white/30 text-white hover:bg-white/40 rounded-xl border-none"
            >
              <Edit size={14} className="mr-2" /> Editar Perfil
            </Button>
          </div>
        </div>
      </div>

      {/* Información Card */}
      <div className="profile-info-card">
        <section>
          <h3 className="profile-section-title">
            <User size={18} className="text-green-600" /> Sobre mí
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
              <Sparkles size={18} className="text-green-600" /> Intereses y Hobbies
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

      {/* Edit Modal - PASAMOS handleSaveSuccess en onSaveSuccess */}
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