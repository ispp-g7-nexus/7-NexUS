import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import { MyMatchesPage } from "../Matching/MyMatchesPage";
import { Events } from "./Events/Events";
import { StudentChats } from "./Chats/StudentChats";
import { Profile } from "./Profile/Profile";
import { type ChatRealtimeEvent } from "../../services/chats";
import type { StudentTab } from "../../components/StudentHome";

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
  onNavigate,
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
  readonly onNavigate?: (view: StudentTab) => void;
  readonly onLogout?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [manualGroupNews, setManualGroupNews] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);
  const [targetConversationId, setTargetConversationId] = useState<number | null>(null);

  const handleOpenPrivateChat = (conversationId: number) => {
    setTargetConversationId(conversationId);
    setActiveTab("chat");
    onChatSubTabActiveChange?.("privados");
  };

  useEffect(() => {
    onChatTabActiveChange?.(activeTab === "chat");
    return () => {
      onChatTabActiveChange?.(false);
    };
  }, [activeTab, onChatTabActiveChange]);

  const handleNavigateToChat = (groupId?: number) => {
    setActiveTab("chat");
    if (Number.isFinite(groupId) && Number(groupId) > 0) {
      setTargetGroupId(Number(groupId));
    }
    onChatSubTabActiveChange?.("grupos");
  };

  const effectiveHasGroupChatNews = hasGroupChatNews || manualGroupNews;
  const effectiveHasChatNews = hasChatNews || effectiveHasGroupChatNews;

  const handleChatSubTabActiveChange = (tab: "grupos" | "privados") => {
    if (tab === "grupos" && activeTab === "chat") {
      setManualGroupNews(false);
    }
    onChatSubTabActiveChange?.(tab);
  };

  useEffect(() => {
    if (activeTab === "chat") {
      setManualGroupNews(false);
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Social</h1>
        <div className="flex items-center gap-2">
          <NotificationBell onNavigate={onNavigate} />
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
            {tab === "chat" && effectiveHasChatNews && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Button>
        ))}
      </div>

      <div className="mt-2">
        {activeTab === "eventos" && (
          <Events
            onNavigateToChat={handleNavigateToChat}
            onEventChatJoined={() => setManualGroupNews(true)}
          />
        )}
        {activeTab === "perfil" && <Profile />}
        {activeTab === "chat" && (
          <StudentChats
            enableRealtimeStream={false}
            realtimeTick={chatRealtimeTick}
            realtimeEvent={chatRealtimeEvent}
            hasGroupNews={effectiveHasGroupChatNews}
            hasPrivateNews={hasPrivateChatNews}
            onSubTabActiveChange={handleChatSubTabActiveChange}
            onUnreadStatusChange={onChatUnreadStatusChange}
            focusGroupId={targetGroupId}
            onFocusGroupHandled={() => setTargetGroupId(null)}
            focusConversationId={targetConversationId}
            onFocusConversationHandled={() => setTargetConversationId(null)}
          />
        )}
        {activeTab === "matches" && <MyMatchesPage onOpenPrivateChat={handleOpenPrivateChat} />}
      </div>
      </div>
    </div>
  );
}
