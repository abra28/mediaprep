import { useState, useEffect, useCallback, useRef } from "react";

type QueuedAction =
  | { type: "toggle"; itemId: number; userId: number; checked: boolean }
  | { type: "createTask"; text: string; phase: string; role: string; addedBy: number; addedByName: string }
  | { type: "deleteTask"; id: number }
  | { type: "createIssue"; taskId?: number; description: string; severity: "low" | "medium" | "high" };

const QUEUE_KEY = "mediaprep_sync_queue";
const CACHE_KEY = "mediaprep_cache";

function loadQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function loadCache(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCacheEntry(key: string, value: unknown) {
  const cache = loadCache();
  cache[key] = value;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function getCacheEntry<T>(key: string): T | null {
  const cache = loadCache();
  return (cache[key] as T) ?? null;
}

export type SyncStatus = "online" | "offline" | "syncing" | "pending";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    navigator.onLine ? "online" : "offline"
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setSyncStatus("syncing");
      replayQueue();
    };
    const onOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Auto-retry sync every 30s when pending and online
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    const interval = setInterval(() => {
      replayQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, pendingCount]);

  const queueAction = useCallback((action: QueuedAction) => {
    const queue = loadQueue();
    queue.push(action);
    saveQueue(queue);
    setPendingCount(queue.length);
    if (!navigator.onLine) {
      setSyncStatus("offline");
    } else {
      setSyncStatus("pending");
    }
  }, []);

  const replayQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    const queue = loadQueue();
    if (queue.length === 0) {
      setSyncStatus("online");
      setPendingCount(0);
      syncingRef.current = false;
      return;
    }

    setSyncStatus("syncing");
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === "toggle") {
          const res = await fetch("/api/trpc/checklist.toggleItem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              json: { itemId: action.itemId, userId: action.userId, checked: action.checked },
            }),
          });
          if (!res.ok) remaining.push(action);
        } else if (action.type === "createTask") {
          const res = await fetch("/api/trpc/customTasks.create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              json: {
                text: action.text,
                phase: action.phase,
                role: action.role,
                addedBy: action.addedBy,
                addedByName: action.addedByName,
              },
            }),
          });
          if (!res.ok) remaining.push(action);
        } else if (action.type === "deleteTask") {
          const res = await fetch("/api/trpc/customTasks.delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ json: { id: action.id } }),
          });
          if (!res.ok) remaining.push(action);
        } else if (action.type === "createIssue") {
          const res = await fetch("/api/trpc/issues.create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              json: {
                taskId: action.taskId,
                description: action.description,
                severity: action.severity,
              },
            }),
          });
          if (!res.ok) remaining.push(action);
        }
      } catch {
        // Network error — keep in queue
        remaining.push(action);
      }
    }

    saveQueue(remaining);
    setPendingCount(remaining.length);
    setSyncStatus(remaining.length > 0 ? (navigator.onLine ? "pending" : "offline") : "online");
    if (remaining.length === 0) setLastSynced(new Date());
    syncingRef.current = false;

    // Refresh page data if we synced something
    if (remaining.length < queue.length) {
      window.dispatchEvent(new Event("mediaprep-synced"));
    }
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setPendingCount(0);
    setSyncStatus(isOnline ? "online" : "offline");
  }, [isOnline]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    lastSynced,
    queueAction,
    replayQueue,
    clearQueue,
  };
}
