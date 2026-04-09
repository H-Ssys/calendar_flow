import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CalendarProvider } from "./context/CalendarContext";
import { TaskProvider } from "./context/TaskContext";
import { NoteProvider } from "./context/NoteContext";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CalendarProvider>
        <TaskProvider>
          <NoteProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/tasks" element={<EventTask />} />
                  <Route path="/notes" element={<Notes />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NoteProvider>
        </TaskProvider>
      </CalendarProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
