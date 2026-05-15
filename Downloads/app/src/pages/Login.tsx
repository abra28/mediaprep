import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import AuroraBackground from "@/components/effects/AuroraBackground";
import { Eye, EyeOff, CheckSquare, Loader2 } from "lucide-react";

const ROLES = [
  { value: "team-lead", label: "Team Lead" },
  { value: "camera-operator", label: "Camera Operator" },
  { value: "stream-operator", label: "Stream Operator" },
  { value: "sound-engineer", label: "Sound Engineer" },
  { value: "presentation", label: "Presentation" },
  { value: "content", label: "Content" },
  { value: "lighting", label: "Lighting" },
  { value: "photography", label: "Photography" },
] as const;

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("camera-operator");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("localUser", JSON.stringify(data.user));
      setError("");
      navigate("/", { replace: true });
      window.location.reload();
    },
    onError: (err) => setError(err.message || "Sign in failed."),
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("localUser", JSON.stringify(data.user));
      setError("");
      navigate("/", { replace: true });
      window.location.reload();
    },
    onError: (err) => setError(err.message || "Registration failed."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      if (!email.trim() || !password) {
        setError("Please enter your email and password.");
        return;
      }
      loginMutation.mutate({ email: email.trim(), password });
    } else {
      if (!name.trim() || !email.trim() || !password || !role) {
        setError("Please fill in all fields.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      registerMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        password,
        teamRole: role as any,
      });
    }
  };

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel - Login form */}
      <div className="w-full lg:w-[65%] bg-black relative z-10 flex flex-col justify-end p-6 lg:p-12 xl:p-16">
        <div className="mb-auto pt-8 lg:pt-0">
          <div className="flex items-center gap-3 mb-2">
            <CheckSquare className="w-8 h-8 text-[#4A32A0]" />
            <h1
              className="text-[#FCFBF9] text-4xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[0.9]"
              style={{ letterSpacing: "-0.02em" }}
            >
              MediaPrep
            </h1>
          </div>
          <p className="text-[#797774] text-sm uppercase tracking-wider mt-2 ml-11" style={{ letterSpacing: "0.03em" }}>
            Media Team Readiness
          </p>
        </div>

        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex gap-6 mb-8 border-b border-[rgba(252,251,249,0.08)]">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                mode === "login" ? "text-[#FCFBF9] border-b-2 border-[#4A32A0]" : "text-[#797774] hover:text-[#FCFBF9]"
              }`}
              style={{ letterSpacing: "0.03em" }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                mode === "register" ? "text-[#FCFBF9] border-b-2 border-[#4A32A0]" : "text-[#797774] hover:text-[#FCFBF9]"
              }`}
              style={{ letterSpacing: "0.03em" }}
            >
              Join Team
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent border-0 border-b border-[rgba(252,251,249,0.2)] text-[#FCFBF9] text-[15px] py-3 px-0 outline-none focus:border-[#FCFBF9] transition-colors placeholder:text-[#797774]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-transparent border-0 border-b border-[rgba(252,251,249,0.2)] text-[#FCFBF9] text-[15px] py-3 px-0 outline-none focus:border-[#FCFBF9] transition-colors placeholder:text-[#797774]"
              />
            </div>

            <div className="relative">
              <label className="block text-[11px] font-medium text-[#797774] uppercase mb-2" style={{ letterSpacing: "0.03em" }}>
                Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-transparent border-0 border-b border-[rgba(252,251,249,0.2)] text-[#FCFBF9] text-[15px] py-3 px-0 pr-10 outline-none focus:border-[#FCFBF9] transition-colors placeholder:text-[#797774]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-[#797774] hover:text-[#FCFBF9]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-[11px] font-medium text-[#797774] uppercase mb-3" style={{ letterSpacing: "0.03em" }}>
                  Your Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`text-left px-4 py-3 rounded text-[13px] font-medium transition-all border ${
                        role === r.value
                          ? "border-[#4A32A0] text-[#4A32A0] bg-[rgba(74,50,160,0.08)]"
                          : "border-[rgba(252,251,249,0.08)] text-[#797774] hover:border-[rgba(252,251,249,0.2)] hover:text-[#FCFBF9]"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-[#C32E2E]/10 border border-[#C32E2E]/30 rounded-lg px-4 py-3">
                <p className="text-[#C32E2E] text-[13px] font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-[#FCFBF9] text-black text-sm font-bold uppercase tracking-wider rounded hover:bg-[#4A32A0] hover:text-[#FCFBF9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ letterSpacing: "0.03em" }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "..." : mode === "login" ? "SIGN IN" : "JOIN TEAM"}
            </button>

            <p className="text-[#797774] text-[11px] text-center" style={{ letterSpacing: "0.03em" }}>
              Use any email with password "demo123" to try it out
            </p>
          </form>
        </div>
      </div>

      {/* Right panel - Aurora shader */}
      <div className="hidden lg:block lg:w-[35%] relative overflow-hidden">
        <AuroraBackground />
        <div
          className="absolute inset-0 z-10"
          style={{ background: "radial-gradient(ellipse at center, transparent 0%, #000 85%)" }}
        />
      </div>
    </div>
  );
}
