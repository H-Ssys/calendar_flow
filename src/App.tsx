import { Suspense, lazy, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { CalendarProvider } from "./context/CalendarContext";
import { TaskProvider } from "./context/TaskContext";
import { NoteProvider } from "./context/NoteContext";
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { MigrationBanner } from "./components/MigrationBanner";

// ── Code-split routes (loaded on demand) ────────────────────────────
const Settings = lazy(() => import("./pages/Settings"));
const EventTask = lazy(() => import("./pages/EventTask"));
const Notes = lazy(() => import("./pages/Notes"));

const queryClient = new QueryClient();

// ── Suspense fallback ───────────────────────────────────────────────
const RouteFallback = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  </div>
);

// ── Auth guard layout ───────────────────────────────────────────────
function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) return <RouteFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <CalendarProvider>
      <TaskProvider>
        <NoteProvider>
          <MigrationBanner />
          <Outlet />
        </NoteProvider>
      </TaskProvider>
    </CalendarProvider>
  );
}

// ── Public-only route (redirect if already logged in) ───────────────
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) return <RouteFallback />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ── App ─────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

              {/* Protected app routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/tasks" element={<EventTask />} />
                <Route path="/notes" element={<Notes />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
