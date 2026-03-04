import React, { useState, useMemo, useRef, useEffect } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// Estructura de datos: Provincia -> Ciudades principales
const spanishProvinces = {
  "Madrid": [
    "Madrid",
    "Alcalá de Henares",
    "Getafe",
    "Leganés",
    "Fuenlabrada",
    "Alcorcón",
    "Móstoles",
    "Torrejón de Ardoz",
    "Coslada",
    "Rivas-Vaciamadrid",
  ],
  "Barcelona": [
    "Barcelona",
    "L'Hospitalet de Llobregat",
    "Badalona",
    "Santa Coloma de Gramenet",
    "Cornellà de Llobregat",
    "El Prat de Llobregat",
    "Viladecans",
    "Montcada i Reixac",
    "Mataró",
    "Terrassa",
  ],
  "Valencia": [
    "Valencia",
    "Paterna",
    "Torrent",
    "Requena",
    "Utiel",
    "Liria",
    "Puig",
    "Turia",
    "Casinos",
    "Riba-Roja de Túria",
  ],
  "Sevilla": [
    "Sevilla",
    "Dos Hermanas",
    "Alcalá de Guadaíra",
    "Utrera",
    "Écija",
    "Osuna",
    "Marchena",
    "Lebrija",
    "Carmona",
    "Moron de la Frontera",
  ],
  "Zaragoza": [
    "Zaragoza",
    "Utebo",
    "La Cartuja de Sajonia",
    "María de Huerva",
    "Cuarte de Huerva",
    "Épila",
    "Ejea de Los Caballeros",
    "Tarazona",
    "Barbastro",
    "Estadilla",
  ],
  "Málaga": [
    "Málaga",
    "Fuengirola",
    "Marbella",
    "Estepona",
    "Vélez-Málaga",
    "Torremolinos",
    "Benalmádena",
    "Ronda",
    "Antequera",
    "Nerja",
  ],
  "Murcia": [
    "Murcia",
    "Alcantarilla",
    "Lorca",
    "Cartagena",
    "Jumilla",
    "Yecla",
    "Caravaca de la Cruz",
    "Mazarrón",
    "Archena",
    "Torre-Pacheco",
  ],
  "Bilbao": [
    "Bilbao",
    "Getxo",
    "Barakaldo",
    "Basauri",
    "Sestao",
    "Santurtzi",
    "Erandio",
    "Leioa",
    "Galdakao",
    "Arrigorriaga",
  ],
  "Alicante": [
    "Alicante",
    "Elche",
    "Torrevieja",
    "Benidorm",
    "Alcoy",
    "Orihuela",
    "Jijona",
    "Aspe",
    "Novelda",
    "Ibi",
  ],
  "Palma": [
    "Palma",
    "Calvià",
    "Marratxí",
    "Llucmayor",
    "Manacor",
    "Pollença",
    "Muro",
    "Son Servera",
    "Petra",
    "Montuïri",
  ],
  "Córdoba": [
    "Córdoba",
    "Montilla",
    "Puente Genil",
    "Lucena",
    "Priego de Córdoba",
    "Castro del Río",
    "Baena",
    "Fernán Núñez",
    "Cabra",
    "Pozoblanco",
  ],
  "Valladolid": [
    "Valladolid",
    "Arroyo de la Encomienda",
    "Laguna de Duero",
    "Tudela de Duero",
    "Íscar",
    "Mojados",
    "Medina de Rioseco",
    "Olmedo",
    "Tordesillas",
    "Villalón de Campos",
  ],
  "Vigo": [
    "Vigo",
    "Cangas",
    "Moaña",
    "Redondela",
    "O Porriño",
    "Salceda de Caselas",
    "Fornelos de Montes",
    "Barro",
    "Goián",
    "Arbo",
  ],
  "Gijón": [
    "Gijón",
    "Oviedo",
    "Avilés",
    "Siero",
    "Llanera",
    "Las Regueras",
    "Morcín",
    "Llanes",
    "Cabrales",
    "Mieres",
  ],
  "Santa Cruz de Tenerife": [
    "Santa Cruz de Tenerife",
    "San Cristóbal",
    "La Orotava",
    "Los Llanos de Aridane",
    "Güímar",
    "Granadilla de Abona",
    "Adeje",
    "Puerto de la Cruz",
    "Icod de los Vinos",
    "Tegueste",
  ],
  "Toledo": [
    "Toledo",
    "Talavera de la Reina",
    "Puertollano",
    "Ciudad Real",
    "Tomelloso",
    "Almadén",
    "Socuéllamos",
    "Manzanares",
    "Daimiel",
    "Membrilla",
  ],
  "Salamanca": [
    "Salamanca",
    "Ciudad Rodrigo",
    "Béjar",
    "Peñaranda de Bracamonte",
    "Alba de Tormes",
    "Ledesma",
    "Guijuelo",
    "Sequeros",
    "San Esteban de la Sierra",
    "Vitigudino",
  ],
  "Pamplona": [
    "Pamplona",
    "Barañáin",
    "Ansoáin",
    "Burlada",
    "Tudela",
    "Tafalla",
    "Estella-Lizarra",
    "Olite",
    "Sangüesa",
    "Corella",
  ],
  "San Sebastián": [
    "San Sebastián",
    "Donostia",
    "Pasaia",
    "Rentería",
    "Andoain",
    "Lezo",
    "Tolosa",
    "Oñate",
    "Bergara",
    "Eibar",
  ],
};

type CityData = { name: string; province: string };

export function LocationSelector({
  value,
  onChange,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obtener todas las ciudades en un array plano para búsqueda
  const allCities = useMemo(() => {
    const cities: CityData[] = [];
    const seen = new Set<string>();
    
    Object.entries(spanishProvinces).forEach(([province, citiesList]) => {
      citiesList.forEach((city) => {
        const key = `${city}-${province}`;
        if (!seen.has(key)) {
          seen.add(key);
          cities.push({ name: city, province });
        }
      });
    });
    
    return cities;
  }, []);

  // Filtrar ciudades según la búsqueda
  const filteredCities = useMemo(() => {
    if (!searchInput.trim()) {
      return allCities;
    }
    const lowerSearch = searchInput.toLowerCase();
    return allCities.filter(
      (city) =>
        city.name.toLowerCase().includes(lowerSearch) ||
        city.province.toLowerCase().includes(lowerSearch)
    );
  }, [searchInput, allCities]);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchInput("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus input cuando se abre el dropdown
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (cityName: string) => {
    onChange(cityName);
    setIsOpen(false);
    setSearchInput("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <MapPin size={16} />
        Lugar de Origen / Crianza *
      </Label>
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Busca una ciudad..."
            value={isOpen ? searchInput : value}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            className="pr-10"
          />
          {value && !isOpen && (
            <ChevronDown
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          )}
          {isOpen && value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {filteredCities.length > 0 ? (
              <div>
                {filteredCities.map((city, index) => (
                  <button
                    key={`${city.province}-${city.name}-${index}`}
                    onClick={() => handleSelect(city.name)}
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm transition-colors border-b border-gray-100 hover:bg-green-50 flex justify-between items-center last:border-b-0 ${
                      value === city.name ? "bg-green-100 text-green-900" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium">{city.name}</div>
                      <div className="text-xs text-gray-500">
                        {city.province}
                      </div>
                    </div>
                    {value === city.name && (
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No se encontraron ciudades
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
