import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { ArrowLeft, Users, AlertTriangle, Wifi, WifiOff, CheckCircle, Loader2 } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

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

export default function Team() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const offline = useOfflineSync();
  const utils = trpc.useUtils();

  const { data: members } = trpc.team.list.useQuery(undefined, { refetchInterval: 10000 });
  const { data: issuesList } = trpc.issues.list.useQuery({ resolved: false }, { refetchInterval: 5000 });

  const resolveMutation = trpc.issues.resolve.useMutation({
    onSuccess: () => {
      utils.issues.list.invalidate();
    },
  });

  const allUsers = members || [];
  const openIssues = issuesList || [];

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9]">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#797774] hover:text-[#FCFBF9] text-[13px] font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Checklist
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-[#4A32A0]" />
            Team Members
          </h1>
          <div className="flex items-center gap-1.5">
            {offline.isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-[#2E8B57]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#F1A208]" />
            )}
            <span className="text-[10px] font-bold uppercase text-[#797774]" style={{ letterSpacing: "0.03em" }}>
              {offline.isOnline ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {allUsers.length === 0 && (
            <div className="text-center py-12 text-[#797774] bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No team members yet.</p>
              <p className="text-[11px] mt-1">Share the app with your team!</p>
            </div>
          )}

          {allUsers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-4"
            >
              <div className="w-10 h-10 bg-[#4A32A0] rounded flex items-center justify-center text-[#FCFBF9] font-bold text-sm flex-shrink-0">
                {(member.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">{member.name || "Unknown"}</p>
                <p className="text-[11px] text-[#797774]">{ROLE_NAMES[member.teamRole || ""] || member.teamRole || "Member"}</p>
              </div>
              {member.email && (
                <span className="text-[11px] text-[#797774] hidden sm:block">{member.email}</span>
              )}
            </div>
          ))}
        </div>

        {/* Issues Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#C32E2E]" />
            Issues ({openIssues.length})
          </h2>

          {openIssues.length === 0 ? (
            <div className="text-center py-8 text-[#797774] bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl">
              <p className="text-[13px]">No open issues. Great!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-[#1A1A1A] border-l-4 border-[#C32E2E] rounded-r-xl p-4 flex items-start justify-between gap-3 group"
                >
                  <div>
                    <p className="text-[13px] font-medium mb-1">{issue.description}</p>
                    <p className="text-[11px] text-[#797774]">
                      By: {issue.reporterName} · Severity: {issue.severity}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => resolveMutation.mutate({ id: issue.id })}
                      disabled={resolveMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[#2E8B57] hover:text-[#FCFBF9] transition-all disabled:opacity-30"
                      title="Resolve"
                    >
                      {resolveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
