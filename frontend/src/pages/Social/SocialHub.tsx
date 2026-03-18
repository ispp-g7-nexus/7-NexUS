import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { MyMatchesPage } from "../Matching/MyMatchesPage";
import { Events } from "./Events/Events";
import { StudentChats } from "./Chats/StudentChats";
import { Profile } from "./Profile/Profile";
import { type ChatRealtimeEvent } from "../../services/chats";

type Tab = "eventos" | "chat" | "matches" | "perfil";

export function SocialHub({
  onChatTabActiveChange,
  chatRealtimeTick = 0,
  chatRealtimeEvent = null,
  initialTab = "perfil",
}: {
  readonly onChatTabActiveChange?: (active: boolean) => void;
  readonly chatRealtimeTick?: number;
  readonly chatRealtimeEvent?: ChatRealtimeEvent | null;
  readonly initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    onChatTabActiveChange?.(activeTab === "chat");
    return () => {
      onChatTabActiveChange?.(false);
    };
  }, [activeTab, onChatTabActiveChange]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex bg-gray-100 p-1 rounded-full mb-6 mx-auto w-fit">
        {(["eventos", "chat", "matches", "perfil"] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            className={`rounded-full px-6 capitalize ${activeTab === tab ? "bg-white text-green-700 shadow-sm hover:bg-white" : "text-gray-500"
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
        {activeTab === "chat" && <StudentChats enableRealtimeStream={false} realtimeTick={chatRealtimeTick} realtimeEvent={chatRealtimeEvent} />}
        {activeTab === "matches" && <MyMatchesPage />}
      </div>
    </div>
  );
}
