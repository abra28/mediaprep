import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useServiceTime, URGENCY_COLORS, URGENCY_LABELS } from "@/hooks/useServiceTime";
import {
  Users, CheckCircle, Clock, AlertTriangle,
  ArrowLeft, RotateCcw, CheckSquare, Trash2, FileText
} from "lucide-react";

const ROLE_NAMES: Record<string, string> = {
  "team-lead": "Team Lead",
  "camera-operator": "Camera Operator",
  "stream-operator": "Stream Operator",
  "sound-engineer": "Sound Engineer",
  presentation: "Presentation",
  content: "Content",
  lighting: "Lighting",
  photography: "Photography",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ready: { label: "Ready", color: "#2E8B57", bg: "rgba(46,139,87,0.15)" },
  warning: { label: "In Progress", color: "#F1A208", bg: "rgba(241,162,8,0.15)" },
  critical: { label: "Behind", color: "#C32E2E", bg: "rgba(195,46,46,0.15)" },
};

export default function Admin() {
  const { isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const time = useServiceTime();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string | null } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isLoading, isAdmin, navigate]);

  const utils = trpc.useUtils();

  const { data: stats, refetch: refetchStats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 5000,
  });
  const { data: teamProgress, refetch: refetchTeam } = trpc.admin.getTeamProgress.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 5000,
  });
  const { data: issuesList, refetch: refetchIssues } = trpc.issues.list.useQuery({ resolved: false }, {
    enabled: isAdmin,
    refetchInterval: 3000,
  });

  const resetMutation = trpc.admin.resetProgress.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchTeam();
      refetchIssues();
    },
  });

  const deleteMutation = trpc.admin.deleteMember.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      refetchStats();
      refetchTeam();
      refetchIssues();
      utils.team.list.invalidate();
    },
  });

  const resolveMutation = trpc.issues.resolve.useMutation({
    onSuccess: () => {
      refetchIssues();
      refetchStats();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-[#797774] text-[13px]">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#FCFBF9]">
      {/* Header */}
      <header className="border-b border-[rgba(252,251,249,0.08)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-[#797774] hover:text-[#FCFBF9] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <CheckSquare className="w-6 h-6 text-[#4A32A0]" />
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ letterSpacing: "-0.015em" }}>
                  MediaPrep Admin
                </h1>
                <p className="text-[11px] text-[#797774] uppercase" style={{ letterSpacing: "0.03em" }}>
                  Team Lead Dashboard
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/report")}
              className="flex items-center gap-2 h-10 px-4 bg-[#4A32A0] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#351C75] transition-all"
              style={{ letterSpacing: "0.03em" }}
            >
              <FileText className="w-3.5 h-3.5" />
              View Report
            </button>
            <button
              onClick={() => {
                if (confirm("Reset all checklist progress? This cannot be undone.")) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
              className="flex items-center gap-2 h-10 px-4 border border-[rgba(252,251,249,0.08)] text-[#797774] text-[11px] font-bold uppercase tracking-wider rounded hover:border-[#FCFBF9] hover:text-[#FCFBF9] transition-all disabled:opacity-50"
              style={{ letterSpacing: "0.03em" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {resetMutation.isPending ? "..." : "Reset Progress"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="border border-[rgba(252,251,249,0.08)] rounded-xl p-5">
            <Users className="w-6 h-6 text-[#4A32A0] mb-3" />
            <div className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.015em" }}>
              {stats?.teamSize ?? 0}
            </div>
            <div className="text-[11px] text-[#797774] uppercase mt-1" style={{ letterSpacing: "0.03em" }}>
              Team Members
            </div>
          </div>

          <div className="border border-[rgba(252,251,249,0.08)] rounded-xl p-5">
            <CheckCircle className="w-6 h-6 text-[#2E8B57] mb-3" />
            <div className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.015em", color: "#2E8B57" }}>
              {stats?.overallCompletion ?? 0}%
            </div>
            <div className="text-[11px] text-[#797774] uppercase mt-1" style={{ letterSpacing: "0.03em" }}>
              Overall Completion
            </div>
          </div>

          <div className="border border-[rgba(252,251,249,0.08)] rounded-xl p-5">
            <Clock className="w-6 h-6 mb-3" style={{ color: URGENCY_COLORS[time.urgency] }} />
            <div className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.015em", color: URGENCY_COLORS[time.urgency] }}>
              {time.formattedCountdown}
            </div>
            <div className="text-[11px] text-[#797774] uppercase mt-1" style={{ letterSpacing: "0.03em" }}>
              {URGENCY_LABELS[time.urgency]}
            </div>
          </div>

          <div className="border border-[rgba(252,251,249,0.08)] rounded-xl p-5">
            <AlertTriangle className="w-6 h-6 text-[#C32E2E] mb-3" />
            <div className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.015em", color: "#C32E2E" }}>
              {stats?.openIssues ?? 0}
            </div>
            <div className="text-[11px] text-[#797774] uppercase mt-1" style={{ letterSpacing: "0.03em" }}>
              Open Issues
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Progress */}
          <div className="lg:col-span-2 border border-[rgba(252,251,249,0.08)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(252,251,249,0.08)] flex items-center justify-between">
              <h2 className="text-[15px] font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4A32A0]" />
                Team Progress
              </h2>
              <span className="text-[11px] text-[#797774] uppercase" style={{ letterSpacing: "0.03em" }}>
                {teamProgress?.length ?? 0} members
              </span>
            </div>

            {!teamProgress || teamProgress.length === 0 ? (
              <div className="text-center py-12 text-[#797774]">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-[13px]">No team members yet.</p>
                <p className="text-[11px] mt-1">Team members need to sign up first.</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(252,251,249,0.04)]">
                {teamProgress.map((member) => {
                  const status = STATUS_CONFIG[member.status] || STATUS_CONFIG.critical;
                  return (
                    <div
                      key={member.user.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-[rgba(252,251,249,0.02)] transition-colors group"
                    >
                      <div className="w-10 h-10 bg-[#4A32A0] rounded flex items-center justify-center text-[#FCFBF9] font-bold text-sm flex-shrink-0">
                        {(member.user.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{member.user.name || "Unknown"}</p>
                        <p className="text-[11px] text-[#797774]">
                          {ROLE_NAMES[member.user.role || ""] || member.user.role || "Member"}
                        </p>
                      </div>
                      <div className="flex-1 max-w-[200px] hidden sm:block">
                        <div className="w-full h-[4px] bg-[rgba(252,251,249,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${member.percent}%`,
                              background: member.percent >= 80 ? "#2E8B57" : member.percent >= 50 ? "#F1A208" : "#C32E2E",
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[13px] font-bold tabular-nums">{member.percent}%</span>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className="text-[11px] font-bold uppercase px-2.5 py-1 rounded"
                          style={{
                            letterSpacing: "0.03em",
                            color: status.color,
                            background: status.bg,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({ id: member.user.id, name: member.user.name })}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#797774] hover:text-[#C32E2E] transition-all p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Issues */}
          <div className="border border-[rgba(252,251,249,0.08)] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(252,251,249,0.08)]">
              <h2 className="text-[15px] font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C32E2E]" />
                Issues ({issuesList?.length ?? 0})
              </h2>
            </div>

            {!issuesList || issuesList.length === 0 ? (
              <div className="text-center py-12 text-[#797774]">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-[13px]">No open issues.</p>
                <p className="text-[11px] mt-1">Everything is running smoothly.</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(252,251,249,0.04)]">
                {issuesList.map((issue) => (
                  <div key={issue.id} className="px-5 py-4 flex gap-3 group">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: issue.severity === "high" ? "#C32E2E" : issue.severity === "medium" ? "#F1A208" : "#3b82f6",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{issue.description}</p>
                      <p className="text-[11px] text-[#797774] mt-1">
                        By: {issue.reporterName} Severity: {issue.severity}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveMutation.mutate({ id: issue.id })}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#2E8B57] hover:text-[#FCFBF9] transition-all"
                      title="Resolve"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C32E2E]/15 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-[#C32E2E]" />
              </div>
              <h3 className="text-[15px] font-bold">Remove Team Member</h3>
            </div>
            <p className="text-[13px] text-[#797774] mb-6">
              Are you sure you want to remove <strong className="text-[#FCFBF9]">{deleteTarget.name || "Unknown"}</strong>? This will delete their account, checklist progress, and reported issues. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 border border-[rgba(252,251,249,0.08)] text-[#797774] text-[11px] font-bold uppercase tracking-wider rounded hover:border-[#FCFBF9] hover:text-[#FCFBF9] transition-all"
                style={{ letterSpacing: "0.03em" }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id })}
                disabled={deleteMutation.isPending}
                className="flex-1 h-11 bg-[#C32E2E] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#a82828] transition-all disabled:opacity-50"
                style={{ letterSpacing: "0.03em" }}
              >
                {deleteMutation.isPending ? "..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
