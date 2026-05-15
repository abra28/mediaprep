import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import {
  ArrowLeft, MessageSquare, Send, Hash, X,
  Radio, Reply
} from "lucide-react";

const ALL_CHANNELS = [
  { key: "general", label: "General", icon: "fa-comments", color: "#4A32A0" },
  { key: "video", label: "Video", icon: "fa-video", color: "#3b82f6" },
  { key: "audio", label: "Audio", icon: "fa-microphone", color: "#f59e0b" },
  { key: "streaming", label: "Streaming", icon: "fa-broadcast-tower", color: "#8b5cf6" },
  { key: "presentation", label: "Presentation", icon: "fa-desktop", color: "#10b981" },
  { key: "lighting", label: "Lighting", icon: "fa-lightbulb", color: "#f97316" },
  { key: "photography", label: "Photography", icon: "fa-camera", color: "#06b6d4" },
  { key: "content", label: "Content", icon: "fa-pen-nib", color: "#ec4899" },
] as const;

// Map each role to their accessible channels (general + their department)
const ROLE_CHANNEL_MAP: Record<string, string[]> = {
  "team-lead": ["general", "video", "audio", "streaming", "presentation", "lighting", "photography", "content"],
  "camera-operator": ["general", "video"],
  "stream-operator": ["general", "streaming"],
  "sound-engineer": ["general", "audio"],
  "presentation": ["general", "presentation"],
  "lighting": ["general", "lighting"],
  "photography": ["general", "photography"],
  "content": ["general", "content"],
};

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "now";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Comms() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Compute allowed channels based on user role
  const userRole = user?.teamRole || "general";
  const allowedKeys = isAdmin
    ? ROLE_CHANNEL_MAP["team-lead"]
    : (ROLE_CHANNEL_MAP[userRole] || ["general"]);
  const allowedChannels = ALL_CHANNELS.filter((c) => allowedKeys.includes(c.key));

  const [activeChannel, setActiveChannel] = useState("general");
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; text: string; fromName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userId = user?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: messages, isLoading } = trpc.messages.list.useQuery(
    activeChannel === "all" ? { limit: 100 } : { channel: activeChannel, limit: 100 }
  );

  const createMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      setMessageText("");
      setReplyingTo(null);
      utils.messages.list.invalidate();
    },
  });

  // If active channel is not allowed, switch to general
  useEffect(() => {
    if (!allowedKeys.includes(activeChannel)) {
      setActiveChannel("general");
    }
  }, [userRole, isAdmin, activeChannel, allowedKeys]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      utils.messages.list.invalidate();
    }, 5000);
    return () => clearInterval(interval);
  }, [utils, activeChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;
    createMutation.mutate({
      text: messageText.trim(),
      fromUserId: userId,
      fromName: user.name || "Unknown",
      channel: activeChannel as any,
      replyToId: replyingTo?.id,
    });
  };

  const reversedMessages = [...(messages || [])].reverse();

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-[rgba(252,251,249,0.08)]">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => navigate("/")} className="text-[#797774] hover:text-[#FCFBF9] transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Radio className="w-5 h-5 text-[#4A32A0]" />
            <span className="font-bold text-[15px]">Comms</span>
          </div>
          {/* Channel Tabs - horizontal scroll */}
          <div className="flex-1 flex overflow-x-auto scrollbar-hide gap-1 ml-2">
            {allowedChannels.map((ch) => {
              const isActive = activeChannel === ch.key;
              return (
                <button
                  key={ch.key}
                  onClick={() => setActiveChannel(ch.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "text-black"
                      : "text-[#797774] hover:text-[#FCFBF9] bg-[rgba(252,251,249,0.03)]"
                  }`}
                  style={{
                    letterSpacing: "0.03em",
                    background: isActive ? ch.color : undefined,
                  }}
                >
                  <i className={`fas ${ch.icon} text-[10px]`} />
                  {ch.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-[#797774] text-[13px]">Loading messages...</div>
        )}

        {!isLoading && reversedMessages.length === 0 && (
          <div className="text-center py-16 text-[#797774]">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-[15px] font-semibold">No messages yet</p>
            <p className="text-[13px] mt-1">Start the conversation in {ALL_CHANNELS.find(c => c.key === activeChannel)?.label}!</p>
          </div>
        )}

        {reversedMessages.map((msg, idx) => {
          const isMine = msg.fromUserId === userId;
          const prevMsg = idx > 0 ? reversedMessages[idx - 1] : null;
          const showHeader = !prevMsg || prevMsg.fromUserId !== msg.fromUserId;
          const isReplyingToThis = replyingTo?.id === msg.id;

          return (
            <div key={msg.id} className={`group flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
              {showHeader ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 self-start" style={{ background: isMine ? "#4A32A0" : "rgba(252,251,249,0.08)", color: "#FCFBF9" }}>
                  {(msg.fromName || "U").charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-8 flex-shrink-0" />
              )}
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
                {showHeader && (
                  <div className={`flex items-center gap-2 mb-1 ${isMine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[11px] font-semibold text-[#FCFBF9]">{msg.fromName || "Unknown"}</span>
                    <span className="text-[10px] text-[#797774]">{timeAgo(msg.createdAt)}</span>
                    {msg.channel !== "general" && (
                      <span className="text-[9px] text-[#797774] bg-[rgba(252,251,249,0.05)] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        {ALL_CHANNELS.find(c => c.key === msg.channel)?.label || msg.channel}
                      </span>
                    )}
                  </div>
                )}

                {/* Reply context — show original message being replied to */}
                {msg.replyToId && msg.replyToText && (
                  <div className={`mb-1 px-2.5 py-1 rounded-lg text-[11px] text-[#797774] bg-[rgba(252,251,249,0.04)] border-l-2 border-[#4A32A0] max-w-full truncate`}>
                    <span className="text-[#4A32A0] font-semibold">{msg.replyToName || "Unknown"}: </span>
                    {msg.replyToText.length > 60 ? msg.replyToText.substring(0, 60) + "..." : msg.replyToText}
                  </div>
                )}

                <div className="relative">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                      isMine
                        ? "bg-[#4A32A0] text-[#FCFBF9] rounded-tr-sm"
                        : "bg-[#1A1A1A] text-[#FCFBF9] rounded-tl-sm border border-[rgba(252,251,249,0.06)]"
                    } ${isReplyingToThis ? "ring-2 ring-[#4A32A0]/40" : ""}`}
                  >
                    {msg.text}
                  </div>
                  {/* Reply button — appears on hover */}
                  <button
                    onClick={() => {
                      setReplyingTo({ id: msg.id, text: msg.text, fromName: msg.fromName || "Unknown" });
                      inputRef.current?.focus();
                    }}
                    className={`absolute -bottom-5 ${isMine ? "right-0" : "left-0"} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-[#797774] hover:text-[#4A32A0] bg-black px-1.5 py-0.5 rounded`}
                  >
                    <Reply className="w-3 h-3" /> Reply
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgba(252,251,249,0.08)] bg-black px-4 py-3">
        {/* Reply context */}
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="flex-1 bg-[rgba(74,50,160,0.08)] border-l-2 border-[#4A32A0] rounded-r-lg px-3 py-1.5 flex items-center gap-2 min-w-0">
              <Reply className="w-3 h-3 text-[#4A32A0] flex-shrink-0" />
              <span className="text-[11px] text-[#797774] truncate">
                Replying to <strong className="text-[#FCFBF9]">{replyingTo.fromName}</strong>: {replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + "..." : replyingTo.text}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-[#797774] hover:text-[#C32E2E] transition-colors flex-shrink-0 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-[#797774] uppercase flex items-center gap-1" style={{ letterSpacing: "0.03em" }}>
            <i className={`fas ${ALL_CHANNELS.find(c => c.key === activeChannel)?.icon} text-[9px]`} style={{ color: ALL_CHANNELS.find(c => c.key === activeChannel)?.color }} />
            {replyingTo ? "Replying in" : "Sending to"} <strong className="text-[#FCFBF9]">{ALL_CHANNELS.find(c => c.key === activeChannel)?.label}</strong>
          </span>
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={replyingTo ? `Reply to ${replyingTo.fromName}...` : `Message ${ALL_CHANNELS.find(c => c.key === activeChannel)?.label} channel...`}
            className="flex-1 h-12 bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] text-[#FCFBF9] text-[14px] px-4 rounded-full outline-none focus:border-[#4A32A0] transition-colors placeholder:text-[#797774]"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || createMutation.isPending}
            className="w-12 h-12 bg-[#4A32A0] text-[#FCFBF9] rounded-full flex items-center justify-center hover:bg-[#351C75] transition-colors disabled:opacity-30 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
