import { useEffect, useState, useCallback } from "react";
import { CheckCircle } from "lucide-react";

interface CelebrationProps {
  role: string;
  onDone: () => void;
}

const PARTICLE_COLORS = ["#4A32A0", "#FCFBF9", "#2E8B57", "#F1A208", "#3b82f6", "#C32E2E"];

export default function Celebration({ role, onDone }: CelebrationProps) {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  // Auto-dismiss after 2.5s
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2500);
    const t2 = setTimeout(() => setPhase("gone"), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Call onDone when gone
  useEffect(() => {
    if (phase === "gone") onDone();
  }, [phase, onDone]);

  const handleClick = useCallback(() => {
    setPhase("out");
    setTimeout(() => setPhase("gone"), 400);
  }, []);

  if (phase === "gone") return null;

  const fading = phase === "out";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease-out",
      }}
      onClick={handleClick}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Particles */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = (i * 3.3) % 100;
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        const size = 4 + (i % 5) * 2;
        const delay = (i % 10) * 0.05;
        const dur = 1.2 + (i % 5) * 0.15;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              bottom: "30%",
              width: size,
              height: size,
              backgroundColor: color,
              opacity: fading ? 0 : undefined,
              transition: "opacity 0.3s",
              animation: `celebrate-up ${dur}s ease-out ${delay}s forwards`,
            }}
          />
        );
      })}

      {/* Center message */}
      <div
        className="relative flex flex-col items-center gap-4 select-none"
        style={{
          transform: fading ? "scale(0.9)" : "scale(1)",
          opacity: fading ? 0 : 1,
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s",
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
          style={{
            background: "linear-gradient(135deg, #4A32A0, #2E8B57)",
            boxShadow: "0 0 60px rgba(74,50,160,0.6), 0 0 120px rgba(46,139,87,0.3)",
          }}
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#FCFBF9]" style={{ letterSpacing: "-0.02em" }}>
            All Clear!
          </h2>
          <p className="text-[15px] text-[#797774] mt-2">
            {role} is ready for service
          </p>
          <p className="text-[11px] text-[#797774] mt-4 opacity-50">
            Tap anywhere to dismiss
          </p>
        </div>
      </div>

      <style>{`
        @keyframes celebrate-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-350px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
