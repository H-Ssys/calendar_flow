import { useState, useRef, useCallback, useEffect } from 'react';

// ─── State ───

export interface FocusTimerState {
    isActive: boolean;
    isPaused: boolean;
    timeRemaining: number;     // seconds
    currentPhase: 'work' | 'break';
    sessionsCompleted: number;
    activeTaskId: string | null;
}

const STORAGE_KEY = 'focus-timer-state';

const loadState = (): FocusTimerState | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
};

const saveState = (state: FocusTimerState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// ─── Hook ───

export const useFocusTimer = (workMinutes = 25, breakMinutes = 5) => {
    const initial = loadState();

    const [state, setState] = useState<FocusTimerState>(initial ?? {
        isActive: false,
        isPaused: false,
        timeRemaining: workMinutes * 60,
        currentPhase: 'work',
        sessionsCompleted: 0,
        activeTaskId: null,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Persist state changes
    useEffect(() => { saveState(state); }, [state]);

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
