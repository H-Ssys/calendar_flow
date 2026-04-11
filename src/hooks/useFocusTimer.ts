import { useState, useRef, useCallback, useEffect } from 'react';
import * as focusSupabaseService from '@/services/supabase/focusSupabaseService';
import { useAuthContext } from '@/context/AuthContext';

// ─── State ───

export interface FocusTimerState {
    isActive: boolean;
    isPaused: boolean;
    timeRemaining: number;     // seconds
    currentPhase: 'work' | 'break';
    sessionsCompleted: number;
    activeTaskId: string | null;
}

// ─── Feature flag ───
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

const STORAGE_KEY = 'focus-timer-state';

const loadStateLocal = (): FocusTimerState | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
};

const saveStateLocal = (state: FocusTimerState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// ─── Hook ───

export const useFocusTimer = (workMinutes = 25, breakMinutes = 5) => {
    const { user } = useAuthContext();
    const userId = user?.id;

    const initial = USE_SUPABASE ? null : loadStateLocal();

    const [state, setState] = useState<FocusTimerState>(initial ?? {
        isActive: false,
        isPaused: false,
        timeRemaining: workMinutes * 60,
        currentPhase: 'work',
        sessionsCompleted: 0,
        activeTaskId: null,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const supabaseRowIdRef = useRef<string | null>(null);
    const supabaseLoadedRef = useRef(false);
    const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Supabase: hydrate latest live state on mount ───────────────
    useEffect(() => {
        if (!USE_SUPABASE || !userId) return;
        let cancelled = false;
        (async () => {
            try {
                const row = await focusSupabaseService.fetchFocusState(userId);
                if (cancelled) return;
                if (row) {
                    supabaseRowIdRef.current = row.id;
                    const restored = focusSupabaseService.metadataToFocusState(row.metadata ?? {}, {
                        isActive: false,
                        isPaused: false,
                        timeRemaining: workMinutes * 60,
                        currentPhase: 'work',
                        sessionsCompleted: 0,
                        activeTaskId: null,
                    });
                    setState(restored);
                }
            } catch (err) {
                console.error('[useFocusTimer] Failed to load focus state from Supabase:', err);
            } finally {
                supabaseLoadedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [userId, workMinutes]);

    // ── Persist state changes ──────────────────────────────────────
    useEffect(() => {
        if (!USE_SUPABASE) {
            saveStateLocal(state);
            return;
        }
        // Supabase mode — debounce writes; don't write before initial hydration
        if (!userId || !supabaseLoadedRef.current) return;

        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(() => {
            focusSupabaseService
                .saveFocusState(userId, state, supabaseRowIdRef.current)
                .then((row) => {
                    supabaseRowIdRef.current = row.id;
                })
                .catch((err) => {
                    console.error('[useFocusTimer] Supabase saveFocusState failed:', err);
                });
        }, 500);

        return () => {
            if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        };
    }, [state, userId]);

    // Timer tick
    useEffect(() => {
        if (state.isActive && !state.isPaused) {
            intervalRef.current = setInterval(() => {
                setState(prev => {
                    if (prev.timeRemaining <= 1) {
                        // Phase complete
                        const nextPhase: 'work' | 'break' = prev.currentPhase === 'work' ? 'break' : 'work';
                        const nextTime = nextPhase === 'work' ? workMinutes * 60 : breakMinutes * 60;
                        const sessions = prev.currentPhase === 'work'
                            ? prev.sessionsCompleted + 1
                            : prev.sessionsCompleted;

                        // Audio ping
                        try {
                            const ctx = new AudioContext();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.frequency.value = nextPhase === 'break' ? 880 : 660;
                            gain.gain.value = 0.15;
                            osc.start();
                            osc.stop(ctx.currentTime + 0.25);
                        } catch { /* ignore audio errors */ }

                        return {
                            ...prev,
                            currentPhase: nextPhase,
                            timeRemaining: nextTime,
                            sessionsCompleted: sessions,
                        };
                    }
                    return { ...prev, timeRemaining: prev.timeRemaining - 1 };
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [state.isActive, state.isPaused, workMinutes, breakMinutes]);

    const start = useCallback((taskId?: string) => {
        setState(prev => ({
            ...prev,
            isActive: true,
            isPaused: false,
            activeTaskId: taskId ?? prev.activeTaskId,
        }));
    }, []);

    const pause = useCallback(() => {
        setState(prev => ({ ...prev, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        setState(prev => ({ ...prev, isPaused: false }));
    }, []);

    const reset = useCallback(() => {
        setState({
            isActive: false,
            isPaused: false,
            timeRemaining: workMinutes * 60,
            currentPhase: 'work',
            sessionsCompleted: 0,
            activeTaskId: null,
        });
    }, [workMinutes]);

    const setActiveTask = useCallback((taskId: string | null) => {
        setState(prev => ({ ...prev, activeTaskId: taskId }));
    }, []);

    return { state, start, pause, resume, reset, setActiveTask };
};
