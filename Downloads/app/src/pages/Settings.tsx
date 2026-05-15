import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useServiceTime, type ServiceSlot } from "@/hooks/useServiceTime";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, CalendarDays, CheckCircle, Loader2, Plus, Trash2, RotateCcw } from "lucide-react";

const DAYS = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
] as const;

const DEFAULT_SCHEDULE: ServiceSlot[] = [
  { day: "sunday", time: "09:00" },
  { day: "wednesday", time: "19:00" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const time = useServiceTime();
  const utils = trpc.useUtils();

  const { data: scheduleSetting } = trpc.settings.get.useQuery(
    { key: "serviceSchedule" },
    { staleTime: Infinity }
  );

  const currentSchedule: ServiceSlot[] = useMemo(() => {
    if (!scheduleSetting?.value) return DEFAULT_SCHEDULE;
    try {
      const parsed = JSON.parse(scheduleSetting.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fallback */ }
    if (scheduleSetting.value.includes(":") && !scheduleSetting.value.startsWith("[")) {
      return [{ day: "sunday", time: scheduleSetting.value }];
    }
    return DEFAULT_SCHEDULE;
  }, [scheduleSetting]);

  const [schedule, setSchedule] = useState<ServiceSlot[]>(currentSchedule);
  const [saved, setSaved] = useState(false);

  const setMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate({ key: "serviceSchedule" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    // Remove empty slots
    const clean = schedule.filter((s) => s.day && s.time);
    if (clean.length === 0) return;
    setMutation.mutate({ key: "serviceSchedule", value: JSON.stringify(clean) });
  };

  const addSlot = () => {
    setSchedule((prev) => [...prev, { day: "sunday", time: "09:00" }]);
  };

  const removeSlot = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: "day" | "time", value: string) => {
    setSchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleReset = () => {
    setSchedule(DEFAULT_SCHEDULE);
  };

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9]">
      <div className="max-w-lg mx-auto px-5 py-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#797774] hover:text-[#FCFBF9] text-[13px] font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Checklist
        </button>

        <h1 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Clock className="w-6 h-6 text-[#4A32A0]" /> Service Settings
        </h1>

        {/* Current Status */}
        <div className="bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-5 mb-6">
          <h2 className="text-[13px] font-bold text-[#797774] uppercase mb-4" style={{ letterSpacing: "0.03em" }}>
            Next Service
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#797774]">Next Service</span>
              <span className="text-[15px] font-bold">{time.nextServiceLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#797774]">Countdown</span>
              <span className="text-[15px] font-bold tabular-nums" style={{ color: time.minutesUntilService <= 15 ? "#C32E2E" : time.minutesUntilService <= 45 ? "#F1A208" : "#2E8B57" }}>
                {time.formattedCountdown}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#797774]">Current Date</span>
              <span className="text-[13px] font-medium">{time.formattedDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#797774]">Current Time</span>
              <span className="text-[13px] font-bold tabular-nums">{time.timeOfDay}</span>
            </div>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-[#4A32A0]" />
            <h2 className="text-[13px] font-bold text-[#797774] uppercase" style={{ letterSpacing: "0.03em" }}>
              Service Schedule
            </h2>
          </div>

          <p className="text-[12px] text-[#797774] mb-4">
            Add all service days and times. The countdown will always show the next upcoming service automatically.
          </p>

          <div className="space-y-3 mb-4">
            {schedule.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={slot.day}
                  onChange={(e) => updateSlot(index, "day", e.target.value)}
                  className="flex-1 h-11 bg-black border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 rounded outline-none focus:border-[#4A32A0]"
                >
                  {DAYS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(index, "time", e.target.value)}
                  className="h-11 bg-black border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[14px] px-3 rounded outline-none focus:border-[#4A32A0] w-[110px]"
                />
                <button
                  onClick={() => removeSlot(index)}
                  className="h-11 w-11 flex items-center justify-center text-[#797774] hover:text-[#C32E2E] rounded border border-[rgba(252,251,249,0.08)] hover:border-[#C32E2E] transition-colors"
                  disabled={schedule.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={addSlot}
              className="flex-1 h-10 border border-dashed border-[rgba(252,251,249,0.15)] text-[#797774] text-[11px] font-bold uppercase tracking-wider rounded hover:border-[#4A32A0] hover:text-[#4A32A0] transition-all flex items-center justify-center gap-1.5"
              style={{ letterSpacing: "0.03em" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Service Day
            </button>
            <button
              onClick={handleReset}
              className="h-10 px-4 border border-[rgba(252,251,249,0.08)] text-[#797774] text-[11px] font-bold uppercase tracking-wider rounded hover:border-[#FCFBF9] hover:text-[#FCFBF9] transition-all flex items-center gap-1.5"
              style={{ letterSpacing: "0.03em" }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={setMutation.isPending}
            className="w-full h-12 bg-[#4A32A0] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#351C75] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ letterSpacing: "0.03em" }}
          >
            {setMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
            {setMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Schedule"}
          </button>
        </div>

        {/* Info */}
        <div className="bg-[rgba(74,50,160,0.08)] border border-[#4A32A0]/20 rounded-xl p-4">
          <p className="text-[12px] text-[#797774] leading-relaxed">
            The urgency system uses your next scheduled service to determine which tasks are critical. When under 15 minutes remain, all unchecked tasks are marked as critical (red). The countdown always counts to the nearest upcoming service day.
          </p>
        </div>
      </div>
    </div>
  );
}
