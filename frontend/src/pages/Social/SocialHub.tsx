import { useState } from "react";
import { Events } from "./Events/Events";
import { Profile } from "./Profile/Profile";
import { Button } from "../../components/ui/button";

type Tab = "eventos" | "chat" | "matches" | "perfil";

export function SocialHub() {
  const [activeTab, setActiveTab] = useState<Tab>("perfil"); // Empezamos en perfil para ver a Carlos

  return (
    <div className="flex flex-col w-full">
      {/* Selector de pestañas manual estilo Figma */}
      <div className="flex bg-gray-100 p-1 rounded-full mb-6 mx-auto w-fit">
        {(["eventos", "chat", "matches", "perfil"] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            className={`rounded-full px-6 capitalize ${
              activeTab === tab ? "bg-white text-green-700 shadow-sm hover:bg-white" : "text-gray-500"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Renderizado condicional */}
      <div className="mt-2">
        {activeTab === "eventos" && <Events />}
        {activeTab === "perfil" && <Profile />}
        {activeTab === "chat" && <div className="text-center py-10">Chat próximamente</div>}
        {activeTab === "matches" && <div className="text-center py-10">Matches próximamente</div>}
      </div>
    </div>
  );
}