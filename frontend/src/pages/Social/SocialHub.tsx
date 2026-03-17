import { useState } from "react";
import { Button } from "../../components/ui/button";
import { MyMatchesPage } from "../Matching/MyMatchesPage";
import { Events } from "./Events/Events";
import { Profile } from "./Profile/Profile";

type Tab = "eventos" | "chat" | "matches" | "perfil";

interface SocialHubProps {
  initialTab?: Tab;
}

export function SocialHub({ initialTab = "perfil" }: SocialHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col w-full">
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

      <div className="mt-2">
        {activeTab === "eventos" && <Events />}
        {activeTab === "perfil" && <Profile />}
        {activeTab === "chat" && <div className="text-center py-10">Chat proximamente</div>}
        {activeTab === "matches" && <MyMatchesPage />}
      </div>
    </div>
  );
}
