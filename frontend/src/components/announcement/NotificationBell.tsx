import { useEffect, useState } from "react";
import { CentralNotificationBell, type StudentTab } from "../CentralNotificationBell";
import { authService } from "../../services/auth";

interface NotificationBellProps {
  readonly onMarkAsRead?: () => void;
  readonly className?: string;
  readonly mode?: "notifications" | "announcements";
  readonly onNavigate?: (view: StudentTab) => void;
}
export function NotificationBell(props: Readonly<NotificationBellProps>) {
  const { onMarkAsRead, className, mode = "notifications", onNavigate } = props;
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isSessionUserResolved, setIsSessionUserResolved] = useState(false);

  useEffect(() => {
    authService.me()
      .then((session) => {
        const parsedId = Number(session.user?.id);
        setCurrentUserId(Number.isFinite(parsedId) ? parsedId : null);
        setCurrentUserEmail((session.user?.email || "").trim().toLowerCase());
      })
      .catch(() => {
        setCurrentUserId(null);
        setCurrentUserEmail("");
      })
      .finally(() => {
        setIsSessionUserResolved(true);
      });
  }, []);

  const handleNavigate = (view: StudentTab) => {
    if (mode === "announcements" && view === "announcements") {
      onMarkAsRead?.();
    }
    onNavigate?.(view);
  };

  return (
    <div className={className}>
      <CentralNotificationBell
        onNavigate={handleNavigate}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        isSessionUserResolved={isSessionUserResolved}
      />
    </div>
  );
}