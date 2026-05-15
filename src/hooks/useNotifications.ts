import { useState, useCallback } from "react";

const NOTIFICATIONS_KEY = "mediaprep_notifications";
const SOUND_ENABLED_KEY = "mediaprep_sound_enabled";

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: "critical" | "issue" | "activity" | "info";
  read: boolean;
  createdAt: string;
};

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
      const newNotification: Notification = {
        ...notification,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev].slice(0, 50);
        saveNotifications(updated);
        return updated;
      });

      // Play sound for critical issues
      if (notification.type === "critical" && soundEnabled) {
        playCriticalSound();
      }
    },
    [soundEnabled]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    soundEnabled,
    addNotification,
    markAsRead,
    markAllRead,
    toggleSound,
    clearNotifications,
  };
}

function playCriticalSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported
  }
}
