import React, { useState } from 'react';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { useTaskContext } from '@/context/TaskContext';
import { Play, Pause, RotateCcw, X, Timer, Coffee, ChevronUp, ChevronDown } from 'lucide-react';

export const FocusMode: React.FC = () => {
    const { state, start, pause, resume, reset, setActiveTask } = useFocusTimer();
    const { tasks, updateTask } = useTaskContext();
    const [isExpanded, setIsExpanded] = useState(false);

    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const activeTask = state.activeTaskId
        ? tasks.find(t => t.id === state.activeTaskId)
        : inProgressTasks[0] ?? null;

    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const progress = state.currentPhase === 'work'
        ? 1 - state.timeRemaining / (25 * 60)
        : 1 - state.timeRemaining / (5 * 60);

    const handleStartFocus = () => {
        if (activeTask) setActiveTask(activeTask.id);
        start(activeTask?.id);
    };

    const handleComplete = () => {
        if (activeTask) {
            updateTask(activeTask.id, { status: 'done' });
        }
        reset();
    };

    // Collapsed pill
    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className={`
                    fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5
                    rounded-full shadow-lg border border-border
                    transition-all hover:scale-105 hover:shadow-xl
                    ${state.isActive
                        ? state.currentPhase === 'work'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-green-600 text-white'
                        : 'bg-background text-foreground'
                    }
                `}
            >
                {state.isActive ? (
                    <>
                        {state.currentPhase === 'work'
                            ? <Timer className="w-4 h-4" />
                            : <Coffee className="w-4 h-4" />
                        }
                        <span className="text-sm font-bold tabular-nums">{timeStr}</span>
                    </>
                ) : (
                    <>
                        <Timer className="w-4 h-4" />
                        <span className="text-sm font-semibold">Focus</span>
                    </>
                )}
                <ChevronUp className="w-3 h-3 opacity-60" />
            </button>
        );
    }

    // Expanded widget
    return (
        <div className="fixed bottom-6 right-6 z-50 w-72 bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-2.5 ${state.currentPhase === 'work'
                    ? 'bg-primary/10'
                    : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                <div className="flex items-center gap-2">
                    {state.currentPhase === 'work'
                        ? <Timer className="w-4 h-4 text-primary" />
                        : <Coffee className="w-4 h-4 text-green-600" />
                    }
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        {state.currentPhase === 'work' ? 'Focus Time' : 'Break Time'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-1 hover:bg-muted rounded"
                    >
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => { reset(); setIsExpanded(false); }}
                        className="p-1 hover:bg-muted rounded"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Timer Display */}
            <div className="px-4 py-5 text-center">
                {/* Progress ring */}
                <div className="relative w-28 h-28 mx-auto mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none" stroke="hsl(var(--muted))"
                            strokeWidth="6"
                        />
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke={state.currentPhase === 'work' ? 'hsl(var(--primary))' : '#16a34a'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold tabular-nums text-foreground">
                            {timeStr}
                        </span>
                    </div>
                </div>

                {/* Session counter */}
                <p className="text-xs text-muted-foreground mb-3">
                    {state.sessionsCompleted} session{state.sessionsCompleted !== 1 ? 's' : ''} completed
                </p>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Reset"
                    >
                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {!state.isActive ? (
                        <button
                            onClick={handleStartFocus}
                            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Start Focus
                        </button>
                    ) : state.isPaused ? (
                        <button
                            onClick={resume}
                            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Resume
                        </button>
                    ) : (
                        <button
                            onClick={pause}
                            className="px-5 py-2 bg-muted text-foreground rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors flex items-center gap-2"
                        >
                            <Pause className="w-4 h-4" />
                            Pause
                        </button>
                    )}

                    {state.isActive && activeTask && (
                        <button
                            onClick={handleComplete}
                            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-green-600"
                            title="Complete task"
                        >
                            ✓
                        </button>
                    )}
                </div>
            </div>

            {/* Active task */}
            {activeTask && (
                <div className="px-4 py-3 border-t border-border bg-muted/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
                        Working on
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">
                        {activeTask.title}
                    </p>
                </div>
            )}

            {/* Task selector when no task */}
            {!activeTask && inProgressTasks.length > 0 && (
                <div className="px-4 py-3 border-t border-border bg-muted/30">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">
                        Pick a task
                    </p>
                    {inProgressTasks.slice(0, 3).map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTask(t.id)}
                            className="block w-full text-left text-sm text-foreground truncate py-1 hover:text-primary transition-colors"
                        >
                            {t.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
