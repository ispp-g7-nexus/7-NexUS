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
  onChatSubTabActiveChange,
  onChatUnreadStatusChange,
  chatRealtimeTick = 0,
  chatRealtimeEvent = null,
  hasChatNews = false,
  hasGroupChatNews = false,
  hasPrivateChatNews = false,
  initialTab = "perfil",
}: {
  readonly onChatTabActiveChange?: (active: boolean) => void;
  readonly onChatSubTabActiveChange?: (tab: "grupos" | "privados") => void;
  readonly onChatUnreadStatusChange?: (status: { hasGroupUnread: boolean; hasPrivateUnread: boolean }) => void;
  readonly chatRealtimeTick?: number;
  readonly chatRealtimeEvent?: ChatRealtimeEvent | null;
  readonly hasChatNews?: boolean;
  readonly hasGroupChatNews?: boolean;
  readonly hasPrivateChatNews?: boolean;
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
            className={`relative rounded-full px-6 capitalize ${activeTab === tab ? "bg-white text-green-700 shadow-sm hover:bg-white" : "text-gray-500"
              }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "chat" && hasChatNews && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Button>
        ))}
      </div>

      <div className="mt-2">
        {activeTab === "eventos" && <Events />}
        {activeTab === "perfil" && <Profile />}
        {activeTab === "chat" && (
          <StudentChats
            enableRealtimeStream={false}
            realtimeTick={chatRealtimeTick}
            realtimeEvent={chatRealtimeEvent}
            hasGroupNews={hasGroupChatNews}
            hasPrivateNews={hasPrivateChatNews}
            onSubTabActiveChange={onChatSubTabActiveChange}
            onUnreadStatusChange={onChatUnreadStatusChange}
          />
        )}
        {activeTab === "matches" && <MyMatchesPage />}
      </div>
    </div>
  );
}
