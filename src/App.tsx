import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Checklist from "./pages/Checklist";
import Admin from "./pages/Admin";
import Team from "./pages/Team";
import Guide from "./pages/Guide";
import SettingsPage from "./pages/Settings";
import Report from "./pages/Report";
import Comms from "./pages/Comms";
import NotFound from "./pages/NotFound";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#797774] text-[13px]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Checklist />
          </AuthGuard>
        }
      />
      <Route
        path="/admin"
        element={
          <AuthGuard>
            <Admin />
          </AuthGuard>
        }
      />
      <Route
        path="/team"
        element={
          <AuthGuard>
            <Team />
          </AuthGuard>
        }
      />
      <Route
        path="/guide"
        element={
          <AuthGuard>
            <Guide />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <SettingsPage />
          </AuthGuard>
        }
      />
      <Route
        path="/report"
        element={
          <AuthGuard>
            <Report />
          </AuthGuard>
        }
      />
      <Route
        path="/comms"
        element={
          <AuthGuard>
            <Comms />
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
