import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/providers/trpc";

export type UrgencyLevel = "calm" | "approaching" | "urgent" | "critical" | "live";

export interface ServiceSlot {
  day: string;    // e.g. "sunday", "wednesday"
  time: string;   // e.g. "09:00", "19:00"
}

export interface TimeStatus {
  now: Date;
  nextServiceDate: Date;
  minutesUntilService: number;
  isLive: boolean;
  urgency: UrgencyLevel;
  formattedCountdown: string;
  timeOfDay: string;
  formattedDate: string;
  nextServiceLabel: string;
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const DEFAULT_SCHEDULE: ServiceSlot[] = [
  { day: "sunday", time: "07:15" },
  { day: "wednesday", time: "19:00" },
];

function parseSchedule(jsonStr: string | null | undefined): ServiceSlot[] {
  if (!jsonStr) return DEFAULT_SCHEDULE;
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].day && parsed[0].time) {
      return parsed as ServiceSlot[];
    }
  } catch { /* fallback */ }
  // Legacy: single time string like "09:00"
  if (jsonStr && jsonStr.includes(":") && !jsonStr.startsWith("[")) {
    return [{ day: "sunday", time: jsonStr }];
  }
  return DEFAULT_SCHEDULE;
}

// Find the next upcoming service from the current date/time
function getNextService(now: Date, schedule: ServiceSlot[]): Date {
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check each slot for the next occurrence
  let best: Date | null = null;

  for (const slot of schedule) {
    const slotDayIndex = DAY_INDEX[slot.day.toLowerCase()];
    if (slotDayIndex === undefined) continue;

    const [h, m] = slot.time.split(":").map(Number);
    const slotMinutes = h * 60 + m;

    // Days until this service day
    let daysUntil = slotDayIndex - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && slotMinutes <= currentMinutes)) {
      daysUntil += 7; // Next week
    }

    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + daysUntil);
    candidate.setHours(h, m, 0, 0);

    if (!best || candidate.getTime() < best.getTime()) {
      best = candidate;
    }
  }

  return best || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "LIVE";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getUrgency(minutes: number): UrgencyLevel {
  if (minutes <= 0) return "live";
  if (minutes <= 15) return "critical";
  if (minutes <= 45) return "urgent";
  if (minutes <= 120) return "approaching";
  return "calm";
}

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  calm: "#2E8B57", approaching: "#3b82f6", urgent: "#F1A208",
  critical: "#C32E2E", live: "#2E8B57",
};

const URGENCY_BG: Record<UrgencyLevel, string> = {
  calm: "rgba(46,139,87,0.12)", approaching: "rgba(59,130,246,0.12)",
  urgent: "rgba(241,162,8,0.12)", critical: "rgba(195,46,46,0.12)", live: "rgba(46,139,87,0.12)",
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  calm: "Plenty of time", approaching: "Getting close",
  urgent: "Move fast", critical: "Almost there", live: "Service is live",
};

export { URGENCY_COLORS, URGENCY_BG, URGENCY_LABELS };

export function useServiceTime(): TimeStatus {
  const [now, setNow] = useState(() => new Date());

  const { data: scheduleSetting } = trpc.settings.get.useQuery(
    { key: "serviceSchedule" },
    { staleTime: Infinity }
  );

  const schedule = parseSchedule(scheduleSetting?.value);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const nextServiceDate = getNextService(now, schedule);
    const diffMs = nextServiceDate.getTime() - now.getTime();
    const minutesUntilService = Math.floor(diffMs / 60000);
    const totalSeconds = Math.floor(diffMs / 1000);
    const isLive = minutesUntilService <= 0;
    const urgency = getUrgency(minutesUntilService);
    const formattedCountdown = formatCountdown(totalSeconds);

    const timeOfDay = now.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const nextServiceLabel = nextServiceDate.toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    }) + " at " + nextServiceDate.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return {
      now,
      nextServiceDate,
      minutesUntilService,
      isLive,
      urgency,
      formattedCountdown,
      timeOfDay,
      formattedDate,
      nextServiceLabel,
    };
  }, [now, schedule]);
}

export function getPhaseUrgency(phase: string, minutesUntilService: number): UrgencyLevel {
  if (minutesUntilService <= 0) return "live";
  const phaseDeadlines: Record<string, number> = {
    arrival: 120, video: 90, presentation: 75,
    streaming: 60, audio: 60, golive: 15, during: 0, post: 0,
  };
  const deadline = phaseDeadlines[phase] ?? 60;
  const buffer = minutesUntilService - deadline;
  if (buffer < 0) return "critical";
  if (buffer < 15) return "urgent";
  if (buffer < 45) return "approaching";
  return "calm";
}
