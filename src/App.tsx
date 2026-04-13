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
const Contacts = lazy(() => import("./pages/Contacts"));
const Teams = lazy(() => import("./pages/Teams"));
const JoinPage = lazy(() => import("./pages/JoinPage"));

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
import { Bot } from 'lucide-react';

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
          
          {/* Global AI Assistant FAB */}
          <button 
            className="fixed bottom-6 right-6 z-[60] group flex items-center justify-center w-14 h-14 rounded-full shadow-lg border border-border/50 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300"
            aria-label="AI Assistant"
          >
            <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
            <span className="absolute inset-0 rounded-full animate-ping bg-purple-400/20 pointer-events-none"></span>
            <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-sm pointer-events-none"></span>
          </button>
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
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/teams" element={<Teams />} />
              </Route>

              {/* Public token-based invite */}
              <Route path="/join/:token" element={<JoinPage />} />

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
