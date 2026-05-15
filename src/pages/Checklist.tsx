import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useServiceTime, URGENCY_COLORS } from "@/hooks/useServiceTime";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router";
import {
  CheckSquare, Menu, X, AlertTriangle,
  Users, BarChart3, Settings, LogOut, Flag, Check,
  Activity, Plus, Pencil, Trash2, PlusCircle,
  Wifi, WifiOff, CloudSync, CloudOff,
  Timer, HelpCircle, FileText, Bell, BellRing,
  Volume2, VolumeX, Radio
} from "lucide-react";

const PHASES = [
  { key: "all", label: "All" },
  { key: "arrival", label: "Arrival" },
  { key: "video", label: "Video" },
  { key: "presentation", label: "Pres" },
  { key: "streaming", label: "Stream" },
  { key: "audio", label: "Audio" },
  { key: "golive", label: "Go Live" },
  { key: "during", label: "During" },
  { key: "post", label: "Post" },
] as const;

const PHASE_ICONS: Record<string, string> = {
  arrival: "fa-clock", video: "fa-video", presentation: "fa-desktop",
  streaming: "fa-broadcast-tower", audio: "fa-microphone", golive: "fa-play-circle",
  during: "fa-church", post: "fa-check-circle",
};

const ROLE_NAMES: Record<string, string> = {
  "team-lead": "Team Lead", "camera-operator": "Camera Operator",
  "stream-operator": "Stream Operator", "sound-engineer": "Sound Engineer",
  presentation: "Presentation", content: "Content",
  lighting: "Lighting", photography: "Photography", all: "All Tasks",
};

const ROLE_COLORS: Record<string, string> = {
  "team-lead": "#4A32A0", "camera-operator": "#3b82f6", "stream-operator": "#8b5cf6",
  "sound-engineer": "#f59e0b", presentation: "#10b981", content: "#ec4899",
  lighting: "#f97316", photography: "#06b6d4", all: "#797774",
};

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "just now";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Checklist() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { isOnline, syncStatus, pendingCount, queueAction, replayQueue } = useOfflineSync();
  const { notifications, unreadCount, soundEnabled, addNotification, markAsRead, markAllRead, toggleSound } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("all");
  const [currentRole, setCurrentRole] = useState(user?.teamRole || "all");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueDesc, setIssueDesc] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"low" | "medium" | "high">("low");
  const [issueTaskId, setIssueTaskId] = useState<number | undefined>();
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Custom task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"add" | "edit">("add");
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [taskText, setTaskText] = useState("");
  const [taskPhase, setTaskPhase] = useState("arrival");
  const [taskRole, setTaskRole] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; text: string } | null>(null);

  const userId = user?.id ?? 0;
  const utils = trpc.useUtils();

  // Listen for sync completion and refresh data
  useEffect(() => {
    const onSynced = () => {
      utils.checklist.getItems.invalidate();
      utils.customTasks.list.invalidate();
      utils.checklist.getStates.invalidate();
      utils.checklist.getProgress.invalidate();
      utils.team.getProgress.invalidate();
      utils.checklist.getTeamActivity.invalidate();
      showToast("Changes synced!", "success");
    };
    window.addEventListener("mediaprep-synced", onSynced);
    return () => window.removeEventListener("mediaprep-synced", onSynced);
  }, [utils]);



  const { data: items } = trpc.checklist.getItems.useQuery(
    currentPhase === "all" && currentRole === "all"
      ? undefined
      : { phase: currentPhase === "all" ? undefined : currentPhase as any, role: currentRole === "all" ? undefined : currentRole }
  );

  const { data: customItems } = trpc.customTasks.list.useQuery(
    currentPhase === "all" && currentRole === "all"
      ? undefined
      : { phase: currentPhase === "all" ? undefined : currentPhase as any, role: currentRole === "all" ? undefined : currentRole }
  );

  const { data: states } = trpc.checklist.getStates.useQuery({ userId }, { enabled: userId > 0 });
  const { data: progress } = trpc.checklist.getProgress.useQuery({ userId, phase: currentPhase === "all" ? undefined : currentPhase, role: currentRole === "all" ? undefined : currentRole });
  const { data: allIssues } = trpc.issues.list.useQuery({ resolved: false });
  const { data: teamProgress } = trpc.team.getProgress.useQuery();
  const { data: teamActivity } = trpc.checklist.getTeamActivity.useQuery({ limit: 15 });
  const timeStatus = useServiceTime();

  // Detect new critical issues and fire notifications
  const prevIssuesRef = useRef(allIssues);
  useEffect(() => {
    if (!allIssues || !user) return;
    const prevIssues = prevIssuesRef.current;
    prevIssuesRef.current = allIssues;
    const prevIds = new Set(prevIssues?.map((i) => i.id) || []);
    const newIssues = allIssues.filter((i) => !prevIds.has(i.id));
    for (const issue of newIssues) {
      if (issue.severity === "high") {
        addNotification({ title: "Critical Issue Reported", message: `${issue.reporterName}: ${issue.description.substring(0, 80)}${issue.description.length > 80 ? "..." : ""}`, type: "critical" });
        showToast(`Critical issue by ${issue.reporterName}!`, "error");
      } else {
        addNotification({ title: "Issue Reported", message: `${issue.reporterName}: ${issue.description.substring(0, 80)}${issue.description.length > 80 ? "..." : ""}`, type: "issue" });
      }
    }
  }, [allIssues, user, addNotification]);

  const toggleMutation = trpc.checklist.toggleItem.useMutation({
    onSuccess: () => { utils.checklist.getStates.invalidate(); utils.checklist.getProgress.invalidate(); utils.team.getProgress.invalidate(); utils.checklist.getTeamActivity.invalidate(); },
  });

  const createIssueMutation = trpc.issues.create.useMutation({
    onSuccess: () => { setIssueModalOpen(false); setIssueDesc(""); setIssueSeverity("low"); setIssueTaskId(undefined); utils.issues.list.invalidate(); showToast("Issue reported!", "success"); },
  });

  const createTaskMutation = trpc.customTasks.create.useMutation({
    onSuccess: () => { closeTaskModal(); utils.customTasks.list.invalidate(); utils.checklist.getProgress.invalidate(); showToast("Task added!", "success"); },
    onError: (err) => showToast(err.message, "error"),
  });

  const updateTaskMutation = trpc.customTasks.update.useMutation({
    onSuccess: () => { closeTaskModal(); utils.customTasks.list.invalidate(); utils.checklist.getProgress.invalidate(); showToast("Task updated!", "success"); },
  });

  const deleteTaskMutation = trpc.customTasks.delete.useMutation({
    onSuccess: () => { setDeleteConfirm(null); utils.customTasks.list.invalidate(); utils.checklist.getStates.invalidate(); utils.checklist.getProgress.invalidate(); utils.team.getProgress.invalidate(); showToast("Task removed!", "success"); },
  });

  const handleDeleteTask = (id: number) => {
    if (isOnline) {
      deleteTaskMutation.mutate({ id });
    } else {
      queueAction({ type: "deleteTask", id });
      setDeleteConfirm(null);
      showToast("Delete queued — will sync when online", "warning");
    }
  };

  const stateMap = useMemo(() => {
    const map = new Map<number, boolean>();
    states?.forEach((s) => map.set(s.itemId, s.checked));
    return map;
  }, [states]);

  // Merge seeded items + custom items, then group by phase
  const allItems = useMemo(() => {
    const seeded = (items || []).map((i) => ({ ...i, isCustom: false as const, addedByName: null }));
    const custom = (customItems || []).map((i) => ({ ...i, isCustom: true as const, addedByName: i.addedByName }));
    return [...seeded, ...custom];
  }, [items, customItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof allItems> = {};
    allItems.forEach((item) => {
      if (!groups[item.phase]) groups[item.phase] = [];
      groups[item.phase].push(item);
    });
    return groups;
  }, [allItems]);

  const showToast = (message: string, type: string) => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const handleToggle = (itemId: number) => {
    const current = stateMap.get(itemId) || false;
    const newChecked = !current;

    if (isOnline) {
      toggleMutation.mutate({ itemId, userId, checked: newChecked });
    } else {
      // Optimistic update + queue for sync
      queueAction({ type: "toggle", itemId, userId, checked: newChecked });
      // Update local state immediately
      const existing = states?.find((s) => s.itemId === itemId);
      if (existing) {
        existing.checked = newChecked;
      }
      utils.checklist.getStates.invalidate();
      showToast("Saved offline — will sync when online", "warning");
    }
  };

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim()) return;
    createIssueMutation.mutate({ taskId: issueTaskId, description: issueDesc, severity: issueSeverity, reporterName: user?.name || "Unknown" });
  };

  const openAddTask = (phase: string) => { setTaskModalMode("add"); setEditTaskId(null); setTaskText(""); setTaskPhase(phase); setTaskRole(currentRole === "all" ? "all" : currentRole); setTaskModalOpen(true); };
  const openEditTask = (task: any) => { setTaskModalMode("edit"); setEditTaskId(task.id); setTaskText(task.text); setTaskPhase(task.phase); setTaskRole(task.role); setTaskModalOpen(true); };
  const closeTaskModal = () => { setTaskModalOpen(false); setTaskText(""); setEditTaskId(null); };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    if (taskModalMode === "add") {
      if (isOnline) {
        createTaskMutation.mutate({ text: taskText.trim(), phase: taskPhase as any, role: taskRole as any, addedBy: userId, addedByName: user?.name || "Unknown" });
      } else {
        queueAction({ type: "createTask", text: taskText.trim(), phase: taskPhase, role: taskRole, addedBy: userId, addedByName: user?.name || "Unknown" });
        closeTaskModal();
        showToast("Task queued — will sync when online", "warning");
      }
    } else if (editTaskId && isOnline) {
      updateTaskMutation.mutate({ id: editTaskId, text: taskText.trim(), phase: taskPhase as any, role: taskRole as any });
    } else if (editTaskId && !isOnline) {
      closeTaskModal();
      showToast("Edit saved offline — will sync when online", "warning");
    }
  };

  const canDelete = (task: any) => isAdmin || task.isCustom && task.addedBy === userId;
  const canEdit = (task: any) => isAdmin || task.isCustom && task.addedBy === userId;

  const percent = progress?.percent ?? 0;
  const openIssuesCount = allIssues?.length ?? 0;

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-[rgba(252,251,249,0.08)]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="text-[#FCFBF9] hover:text-[#4A32A0] transition-colors"><Menu className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-[#4A32A0]" /><span className="font-bold text-[15px]">MediaPrep</span></div>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync Status */}
            <button
              onClick={() => isOnline && syncStatus === "pending" ? replayQueue() : undefined}
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-1.5 rounded-full transition-all ${
                syncStatus === "offline" || syncStatus === "pending"
                  ? "bg-[#F1A208]/15 text-[#F1A208]"
                  : syncStatus === "syncing"
                    ? "bg-[#4A32A0]/20 text-[#4A32A0] animate-pulse"
                    : "text-[#797774] hover:text-[#FCFBF9]"
              }`}
              style={{ letterSpacing: "0.03em" }}
              title={pendingCount > 0 ? `${pendingCount} pending — tap to sync` : isOnline ? "All synced" : "Offline"}
            >
              {syncStatus === "offline" ? <WifiOff className="w-3.5 h-3.5" />
                : syncStatus === "syncing" ? <CloudSync className="w-3.5 h-3.5" />
                : syncStatus === "pending" ? <CloudOff className="w-3.5 h-3.5" />
                : <Wifi className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {syncStatus === "offline" ? "Offline"
                  : syncStatus === "syncing" ? "Syncing..."
                  : syncStatus === "pending" ? `${pendingCount} pending`
                  : "Synced"}
              </span>
            </button>
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className={`relative flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-1.5 rounded-full transition-all ${
                showNotifPanel ? "bg-[#4A32A0]/20 text-[#4A32A0]"
                  : unreadCount > 0 ? "bg-[#C32E2E]/15 text-[#C32E2E]"
                  : "text-[#797774] hover:text-[#FCFBF9]"
              }`}
              style={{ letterSpacing: "0.03em" }}
            >
              {unreadCount > 0 ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C32E2E] text-[#FCFBF9] text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            <button onClick={() => setShowTeamPanel(!showTeamPanel)} className={`flex items-center gap-1.5 text-[11px] font-bold uppercase px-3 py-1.5 rounded-full transition-all ${showTeamPanel ? "bg-[#4A32A0]/20 text-[#4A32A0]" : "text-[#797774] hover:text-[#FCFBF9]"}`} style={{ letterSpacing: "0.03em" }}>
              <Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Team</span>
            </button>
            {openIssuesCount > 0 && (
              <div className="flex items-center gap-1 bg-[#C32E2E]/15 text-[#C32E2E] px-2 py-0.5 rounded text-[11px] font-bold" style={{ letterSpacing: "0.03em" }}>
                <AlertTriangle className="w-3 h-3" />{openIssuesCount}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-[rgba(252,251,249,0.08)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-[#797774] uppercase" style={{ letterSpacing: "0.03em" }}>Your Progress</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ letterSpacing: "0.03em" }}>{percent}%</span>
        </div>
        <div className="w-full h-[3px] bg-[rgba(252,251,249,0.1)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${percent}%`, background: percent === 100 ? "#2E8B57" : "linear-gradient(90deg, #FCFBF9, #4A32A0)" }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-[#797774]">{progress?.completed ?? 0} done of {progress?.total ?? 0}</span>
          <span className="text-[11px] text-[#797774]">{customItems?.length ?? 0} custom tasks</span>
        </div>

        {/* Service Countdown */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(252,251,249,0.04)]">
          <Timer className="w-3.5 h-3.5 flex-shrink-0" style={{ color: URGENCY_COLORS[timeStatus.urgency] }} />
          <span className="text-[11px] font-bold uppercase tabular-nums" style={{ letterSpacing: "0.03em", color: URGENCY_COLORS[timeStatus.urgency] }}>
            {timeStatus.isLive
              ? "SERVICE IS LIVE"
              : timeStatus.formattedCountdown}
          </span>
          {(timeStatus.urgency === "critical" || timeStatus.urgency === "urgent") && !timeStatus.isLive && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: URGENCY_COLORS[timeStatus.urgency] }} />
          )}
          <span className="text-[10px] text-[#797774] ml-auto">{timeStatus.nextServiceLabel}</span>
        </div>
      </div>

      {/* Team Panel */}
      {showTeamPanel && (
        <div className="border-b border-[rgba(252,251,249,0.08)] bg-[#0a0a0a]">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase text-[#797774] flex items-center gap-2" style={{ letterSpacing: "0.03em" }}>
                <Activity className="w-3.5 h-3.5 text-[#4A32A0]" />Team Progress ({teamProgress?.length ?? 0} members)
              </h3>
              <button onClick={() => setShowTeamPanel(false)} className="text-[#797774] hover:text-[#FCFBF9]"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
              {teamProgress?.map((member) => (
                <div key={member.user.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#4A32A0] rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0">{(member.user.name || "U").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium truncate">{member.user.name || "Unknown"}{member.user.id === user?.id && <span className="text-[#4A32A0] ml-1">(you)</span>}</span>
                      <span className="text-[11px] font-bold tabular-nums ml-2" style={{ color: member.percent >= 80 ? "#2E8B57" : member.percent >= 50 ? "#F1A208" : "#C32E2E" }}>{member.percent}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-[rgba(252,251,249,0.06)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${member.percent}%`, background: member.percent >= 80 ? "#2E8B57" : member.percent >= 50 ? "#F1A208" : "#C32E2E" }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 pb-3 pt-2 border-t border-[rgba(252,251,249,0.04)]">
            <h4 className="text-[11px] font-bold uppercase text-[#797774] mb-2 flex items-center gap-1.5" style={{ letterSpacing: "0.03em" }}><Activity className="w-3 h-3" />Recent Activity</h4>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-hide">
              {teamActivity && teamActivity.length > 0 ? teamActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-[11px]">
                  <Check className="w-3 h-3 text-[#2E8B57] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0"><span className="font-semibold text-[#FCFBF9]">{a.userName}</span><span className="text-[#797774]"> completed </span><span className="text-[#FCFBF9]">{a.itemText.length > 50 ? a.itemText.substring(0, 50) + "..." : a.itemText}</span><span className="text-[#797774] ml-1">{timeAgo(a.timestamp)}</span></div>
                </div>
              )) : <p className="text-[11px] text-[#797774]">No activity yet. Start checking off tasks!</p>}
            </div>
          </div>
        </div>
      )}

      {/* Notification Panel */}
      {showNotifPanel && (
        <div className="border-b border-[rgba(252,251,249,0.08)] bg-[#0a0a0a]">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase text-[#797774] flex items-center gap-2" style={{ letterSpacing: "0.03em" }}>
                {unreadCount > 0 ? <BellRing className="w-3.5 h-3.5 text-[#C32E2E]" /> : <Bell className="w-3.5 h-3.5 text-[#4A32A0]" />}
                Notifications ({notifications.length})
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={toggleSound} className="text-[#797774] hover:text-[#FCFBF9] transition-colors" title={soundEnabled ? "Sound on" : "Sound off"}>
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-[#4A32A0] hover:text-[#FCFBF9] font-medium uppercase" style={{ letterSpacing: "0.03em" }}>Mark all read</button>
                )}
                <button onClick={() => setShowNotifPanel(false)} className="text-[#797774] hover:text-[#FCFBF9]"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-hide">
              {notifications.length === 0 ? (
                <p className="text-[11px] text-[#797774] text-center py-4">No notifications yet. Issues reported will appear here.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notif.read ? "bg-transparent opacity-50" : "bg-[rgba(74,50,160,0.06)]"
                    } ${notif.type === "critical" ? "border-l-[3px] border-[#C32E2E]" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        notif.type === "critical" ? "bg-[#C32E2E]" : notif.type === "issue" ? "bg-[#F1A208]" : "bg-[#4A32A0]"
                      }`} />
                      <div>
                        <p className="text-[11px] font-semibold text-[#FCFBF9]">{notif.title}</p>
                        <p className="text-[10px] text-[#797774] mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-[#797774] mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.read && <div className="w-1.5 h-1.5 bg-[#4A32A0] rounded-full ml-auto mt-1 flex-shrink-0" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Selector */}
      <div className="px-4 py-3 border-b border-[rgba(252,251,249,0.08)]">
        <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Your Role</label>
        <select value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} className="w-full h-10 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 rounded outline-none focus:border-[#4A32A0] transition-colors appearance-none">
          <option value="all">All Tasks (Team Lead View)</option>
          {Object.entries(ROLE_NAMES).filter(([k]) => k !== "all").map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
        </select>
      </div>

      {/* Phase Tabs */}
      <div className="flex overflow-x-auto px-2 py-2 border-b border-[rgba(252,251,249,0.08)] scrollbar-hide">
        {PHASES.map((phase) => (
          <button key={phase.key} onClick={() => setCurrentPhase(phase.key)} className={`flex-shrink-0 px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded transition-all ${currentPhase === phase.key ? "bg-[#FCFBF9] text-black" : "text-[#797774] hover:text-[#FCFBF9]"}`} style={{ letterSpacing: "0.03em" }}>{phase.label}</button>
        ))}
      </div>

      {/* Checklist with Custom Tasks */}
      <div className="pb-32">
        {Object.keys(groupedItems).length === 0 && (
          <div className="text-center py-16 text-[#797774]"><CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-30" /><h3 className="text-[15px] font-semibold">No tasks for this filter</h3><p className="text-[13px] mt-2">Add your first custom task below</p></div>
        )}

        {Object.entries(groupedItems).map(([phase, phaseItems]) => (
          <div key={phase} className="border-b border-[rgba(252,251,249,0.08)]">
            {/* Phase Header with Add Button */}
            <div className="flex items-center justify-between px-4 py-3 bg-[rgba(252,251,249,0.02)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-[#4A32A0]/20"><i className={`fas ${PHASE_ICONS[phase] || "fa-tasks"} text-[#4A32A0] text-sm`} /></div>
                <span className="text-[11px] font-bold uppercase text-[#797774] tracking-wider" style={{ letterSpacing: "0.03em" }}>{phase}</span>
                <span className="text-[10px] text-[#797774]">({phaseItems.length})</span>
              </div>
              <button onClick={() => openAddTask(phase)} className="flex items-center gap-1 text-[11px] font-bold uppercase text-[#4A32A0] hover:text-[#FCFBF9] transition-colors" style={{ letterSpacing: "0.03em" }}>
                <PlusCircle className="w-3.5 h-3.5" />Add Task
              </button>
            </div>

            {/* Items */}
            {phaseItems.map((item) => {
              const isChecked = stateMap.get(item.id) || false;
              return (
                <div key={item.id} className={`group flex items-start gap-3 px-4 py-3 border-t border-[rgba(252,251,249,0.04)] transition-colors ${isChecked ? "opacity-50" : "hover:bg-[rgba(252,251,249,0.02)]"}`}>
                  <div onClick={() => handleToggle(item.id)} className="cursor-pointer w-[10px] h-[10px] mt-1.5 flex-shrink-0 border transition-all duration-150 flex items-center justify-center" style={{ borderRadius: 0, background: isChecked ? "#FCFBF9" : "transparent", borderColor: isChecked ? "#FCFBF9" : "#797774" }}>
                    {isChecked && <Check className="w-[8px] h-[8px] text-black" strokeWidth={4} />}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => handleToggle(item.id)}>
                    <p className={`text-[15px] font-medium leading-snug cursor-pointer ${isChecked ? "line-through text-[#797774]" : "text-[#FCFBF9]"}`}>{item.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ letterSpacing: "0.03em", color: ROLE_COLORS[item.role] || "#797774", background: `${ROLE_COLORS[item.role] || "#797774"}15` }}>{ROLE_NAMES[item.role] || item.role}</span>
                      {item.isCustom && (
                        <span className="text-[10px] text-[#4A32A0] bg-[rgba(74,50,160,0.1)] px-1.5 py-0.5 rounded">custom by {item.addedByName || "team"}</span>
                      )}
                    </div>
                  </div>
                  {/* Edit/Delete actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {canEdit(item) && (
                      <button onClick={(e) => { e.stopPropagation(); openEditTask(item); }} className="p-1.5 text-[#797774] hover:text-[#4A32A0] transition-colors" title="Edit task"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                    {canDelete(item) && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: item.id, text: item.text }); }} className="p-1.5 text-[#797774] hover:text-[#C32E2E] transition-colors" title="Remove task"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Floating buttons */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
        <button onClick={() => openAddTask(currentPhase === "all" ? "arrival" : currentPhase)} className="h-12 px-5 bg-[#4A32A0] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#351C75] transition-colors" style={{ letterSpacing: "0.03em" }}>
          <Plus className="w-4 h-4" />Add Task
        </button>
        <button onClick={() => setIssueModalOpen(true)} className="h-12 px-6 bg-[#C32E2E] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#a82828] transition-colors" style={{ letterSpacing: "0.03em" }}>
          <Flag className="w-4 h-4" />Report
        </button>
      </div>

      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-black border-r border-[rgba(252,251,249,0.08)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[rgba(252,251,249,0.08)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4A32A0] rounded flex items-center justify-center text-[#FCFBF9] font-bold text-sm">{(user?.name || "U").charAt(0).toUpperCase()}</div>
                <div><p className="text-[13px] font-bold text-[#FCFBF9]">{user?.name || "User"}</p><p className="text-[11px] text-[#797774]">{ROLE_NAMES[user?.teamRole || "all"] || "Member"}</p></div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="text-[#797774] hover:text-[#FCFBF9]"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <button onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#FCFBF9] bg-[rgba(252,251,249,0.05)] rounded transition-colors"><CheckSquare className="w-4 h-4 text-[#4A32A0]" />Checklist</button>
              <button onClick={() => { setMenuOpen(false); navigate("/comms"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><Radio className="w-4 h-4 text-[#10b981]" />Comms</button>
              <button onClick={() => { setMenuOpen(false); navigate("/team"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><Users className="w-4 h-4" />Team Members</button>
              {isAdmin && <button onClick={() => { setMenuOpen(false); navigate("/admin"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><BarChart3 className="w-4 h-4" />Admin Dashboard</button>}
              <button onClick={() => { setMenuOpen(false); navigate("/report"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><FileText className="w-4 h-4" />Service Report</button>
              <button onClick={() => { setMenuOpen(false); navigate("/settings"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><Settings className="w-4 h-4" />Service Settings</button>
              <button onClick={() => { setMenuOpen(false); navigate("/guide"); }} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#FCFBF9] hover:bg-[rgba(252,251,249,0.03)] rounded transition-colors"><HelpCircle className="w-4 h-4" />Sunday Guide</button>
            </nav>
            <div className="p-4 border-t border-[rgba(252,251,249,0.08)]">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#797774] hover:text-[#C32E2E] rounded transition-colors"><LogOut className="w-4 h-4" />Sign Out</button>
              <p className="text-center text-[10px] text-[#797774] mt-3" style={{ letterSpacing: "0.03em" }}>MediaPrep v2.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/95" onClick={closeTaskModal} />
          <div className="relative w-full max-w-lg bg-black border border-[rgba(252,251,249,0.08)] rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#FCFBF9] flex items-center gap-2"><PlusCircle className="w-5 h-5 text-[#4A32A0]" />{taskModalMode === "add" ? "Add Custom Task" : "Edit Task"}</h2>
              <button onClick={closeTaskModal} className="text-[#797774] hover:text-[#FCFBF9]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Task Description</label>
                <input type="text" value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="e.g. Test new wireless mic" className="w-full h-12 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[14px] px-3 rounded outline-none focus:border-[#4A32A0] placeholder:text-[#797774]" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Phase</label>
                  <select value={taskPhase} onChange={(e) => setTaskPhase(e.target.value)} className="w-full h-12 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 rounded outline-none focus:border-[#4A32A0] appearance-none">
                    {PHASES.filter(p => p.key !== "all").map(p => (<option key={p.key} value={p.key}>{p.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Role</label>
                  <select value={taskRole} onChange={(e) => setTaskRole(e.target.value)} className="w-full h-12 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 rounded outline-none focus:border-[#4A32A0] appearance-none">
                    {Object.entries(ROLE_NAMES).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending} className="w-full h-14 bg-[#4A32A0] text-[#FCFBF9] text-sm font-bold uppercase tracking-wider rounded hover:bg-[#351C75] transition-colors disabled:opacity-50" style={{ letterSpacing: "0.03em" }}>
                {(createTaskMutation.isPending || updateTaskMutation.isPending) ? "..." : taskModalMode === "add" ? "ADD TASK" : "SAVE CHANGES"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C32E2E]/15 rounded-full flex items-center justify-center"><Trash2 className="w-5 h-5 text-[#C32E2E]" /></div>
              <h3 className="text-[15px] font-bold">Remove Task?</h3>
            </div>
            <p className="text-[13px] text-[#797774] mb-6">Delete <strong className="text-[#FCFBF9]">{deleteConfirm.text.length > 60 ? deleteConfirm.text.substring(0, 60) + "..." : deleteConfirm.text}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-11 border border-[rgba(252,251,249,0.08)] text-[#797774] text-[11px] font-bold uppercase tracking-wider rounded hover:border-[#FCFBF9] hover:text-[#FCFBF9] transition-all" style={{ letterSpacing: "0.03em" }}>Cancel</button>
              <button onClick={() => handleDeleteTask(deleteConfirm.id)} disabled={deleteTaskMutation.isPending} className="flex-1 h-11 bg-[#C32E2E] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#a82828] transition-all disabled:opacity-50" style={{ letterSpacing: "0.03em" }}>{deleteTaskMutation.isPending ? "..." : "Remove"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/95" onClick={() => setIssueModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-black border border-[rgba(252,251,249,0.08)] rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#FCFBF9] flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#C32E2E]" />Report Issue</h2>
              <button onClick={() => setIssueModalOpen(false)} className="text-[#797774] hover:text-[#FCFBF9]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitIssue} className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Related Task</label>
                <select value={issueTaskId || ""} onChange={(e) => setIssueTaskId(e.target.value ? Number(e.target.value) : undefined)} className="w-full h-12 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 rounded outline-none focus:border-[#4A32A0]">
                  <option value="">Select task...</option>
                  {allItems.map((item) => (<option key={item.id} value={item.id}>{item.text.length > 60 ? item.text.substring(0, 60) + "..." : item.text}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Description</label>
                <textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} placeholder="Describe the problem..." rows={3} className="w-full bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[13px] px-3 py-2 rounded outline-none focus:border-[#4A32A0] resize-none placeholder:text-[#797774]" required />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>Severity</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((sev) => (
                    <button key={sev} type="button" onClick={() => setIssueSeverity(sev)} className={`flex-1 h-10 text-[11px] font-bold uppercase tracking-wider rounded border transition-all ${issueSeverity === sev ? (sev === "high" ? "border-[#C32E2E] bg-[#C32E2E]/15 text-[#C32E2E]" : "border-[#4A32A0] bg-[#4A32A0]/15 text-[#4A32A0]") : "border-[rgba(252,251,249,0.08)] text-[#797774] hover:border-[rgba(252,251,249,0.2)]"}`} style={{ letterSpacing: "0.03em" }}>{sev === "high" ? "Critical" : sev}</button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={createIssueMutation.isPending} className="w-full h-14 bg-[#C32E2E] text-[#FCFBF9] text-sm font-bold uppercase tracking-wider rounded hover:bg-[#a82828] transition-colors disabled:opacity-50" style={{ letterSpacing: "0.03em" }}>{createIssueMutation.isPending ? "..." : "FLAG ISSUE"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] px-4 py-3 rounded text-[13px] font-medium flex items-center gap-2 shadow-lg">
          {toast.type === "success" ? <Check className="w-4 h-4 text-[#2E8B57]" /> : <AlertTriangle className="w-4 h-4 text-[#F1A208]" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
