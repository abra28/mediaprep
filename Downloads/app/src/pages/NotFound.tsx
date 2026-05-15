import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold mb-4" style={{ letterSpacing: "-0.02em" }}>
          404
        </h1>
        <p className="text-[#797774] text-[15px] mb-8">Page not found</p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 h-12 px-6 bg-[#FCFBF9] text-black text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#4A32A0] hover:text-[#FCFBF9] transition-all"
          style={{ letterSpacing: "0.03em" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>
      </div>
    </div>
  );
}
