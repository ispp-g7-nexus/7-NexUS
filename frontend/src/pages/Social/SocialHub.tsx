import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { NotificationBell } from "../../components/announcement/NotificationBell";
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
  onLogout,
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
  readonly onLogout?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    onChatTabActiveChange?.(activeTab === "chat");
    return () => {
      onChatTabActiveChange?.(false);
    };
  }, [activeTab, onChatTabActiveChange]);

  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Social</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => setActiveTab("perfil")}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>
      
      <div className="px-4 py-6 space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-full mb-6 mx-auto w-fit">
        {(["eventos", "chat", "matches", "perfil"] as Tab[]).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            className={`relative rounded-full px-6 capitalize ${activeTab === tab ? "bg-white text-primary shadow-sm hover:bg-white" : "text-gray-500"
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
    </div>
  );
}
