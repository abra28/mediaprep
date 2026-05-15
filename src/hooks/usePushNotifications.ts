import { useState, useCallback, useEffect } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // Request permission on first use
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  // Auto-request on mount if never asked
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      requestPermission();
    }
  }, [requestPermission]);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;
      if (document.visibilityState === "visible") return; // Don't notify if user is looking

      try {
        new Notification(title, {
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          requireInteraction: true,
          ...options,
        });
      } catch {
        // Notification failed
      }
    },
    [permission]
  );

  const notifyCriticalIssue = useCallback(
    (description: string, reporter: string) => {
      notify("Critical Issue Reported", {
        body: `${reporter}: ${description.substring(0, 100)}`,
        tag: `issue-${Date.now()}`,
        requireInteraction: true,
      });
    },
    [notify]
  );

  const notifyReady = useCallback(
    (role: string) => {
      notify("MediaPrep — Ready!", {
        body: `${role} is 100% ready for service.`,
        tag: "ready",
      });
    },
    [notify]
  );

  return {
    permission,
    requestPermission,
    notify,
    notifyCriticalIssue,
    notifyReady,
  };
}
