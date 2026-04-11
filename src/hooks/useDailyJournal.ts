/**
 * Daily Journal Hook
 * 
 * React hook for managing daily journal entries with autosave functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyJournalEntry, TimeSlot, UrgentTask, JournalGoals, JournalReflections } from '@/types/dailyJournal';
import { getJournalByDate, upsertJournal, copyPlanFromPreviousDay, subscribeToJournal } from '@/services/dailyJournalService';
import { format } from 'date-fns';
import { TimeConfig } from '@/context/CalendarContext';

interface UseDailyJournalProps {
  date: Date;
  userId?: string;
  autosaveDelay?: number; // milliseconds
  timeConfig: TimeConfig;
}

export const useDailyJournal = ({ 
  date, 
  userId = 'default-user',
  autosaveDelay = 800,
  timeConfig 
}: UseDailyJournalProps) => {
  const [entry, setEntry] = useState<DailyJournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  // Load journal entry for the current date.
  // The service hydrates async from Supabase — subscribe so this hook
  // re-renders once the cache fills, then we re-read.
  useEffect(() => {
    let cancelled = false;

    const loadOrInit = (allowInit: boolean) => {
      if (cancelled) return;
      const loaded = getJournalByDate(date, userId, timeConfig);
      if (loaded) {
        if (!loaded.urgentTasks) loaded.urgentTasks = [];
        setEntry(loaded);
        setIsLoading(false);
      } else if (allowInit) {
        // Initialize a new entry only after we've heard from the backend at
        // least once (otherwise we'd race the hydration and clobber state).
        const newEntry = upsertJournal({}, date, userId, timeConfig);
        setEntry(newEntry);
        setIsLoading(false);
      }
    };

    setIsLoading(true);

    // First try synchronously — if the Supabase cache is already hydrated
    // for this user, this returns immediately.
    const initialEntry = getJournalByDate(date, userId, timeConfig);
    if (initialEntry) {
      if (!initialEntry.urgentTasks) initialEntry.urgentTasks = [];
      setEntry(initialEntry);
      setIsLoading(false);
    }

    // Subscribe for async cache updates (Supabase hydration / refetch)
    const unsubscribe = subscribeToJournal(userId, () => loadOrInit(true));

    // If the sync read came up empty, give the async hydration one tick before
    // we initialize a new entry. This avoids creating empty rows for users who
    // already have data stored remotely.
    if (!initialEntry) {
      // Allow init only after the next subscriber notification — but as a
      // safety net, also try after a short delay in case no events fire.
      const t = setTimeout(() => loadOrInit(true), 200);
      return () => {
        cancelled = true;
        clearTimeout(t);
        unsubscribe();
      };
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [date, userId, timeConfig]);

  // Autosave function with debounce
  const save = useCallback((updatedEntry: Partial<DailyJournalEntry>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    isDirtyRef.current = true;
    setIsSaving(true);

    saveTimeoutRef.current = setTimeout(() => {
      const saved = upsertJournal(updatedEntry, date, userId);
      setEntry(saved);
      setLastSaved(new Date());
      setIsSaving(false);
      isDirtyRef.current = false;
    }, autosaveDelay);
  }, [date, userId, autosaveDelay]);

  // Update title
  const updateTitle = useCallback((title: string) => {
    setEntry(prev => {
      if (!prev) return prev;
      const updated = { ...prev, title };
      save({ title });
      return updated;
    });
  }, [save]);

  // Update a specific time slot
  const updateTimeSlot = useCallback((slotId: string, updates: Partial<TimeSlot>) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedSlots = prev.timeSlots.map(slot => 
        slot.id === slotId ? { ...slot, ...updates } : slot
      );
      
      const updated = { ...prev, timeSlots: updatedSlots };
      save({ timeSlots: updatedSlots });
      return updated;
    });
  }, [save]);

  // Toggle done status for a time slot
  const toggleSlotDone = useCallback((slotId: string) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedSlots = prev.timeSlots.map(slot => 
        slot.id === slotId ? { ...slot, done: !slot.done } : slot
      );
      
      const updated = { ...prev, timeSlots: updatedSlots };
      save({ timeSlots: updatedSlots });
      return updated;
    });
  }, [save]);

  // Update goals
  const updateGoals = useCallback((goals: Partial<JournalGoals>) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedGoals = { ...prev.goals, ...goals };
      const updated = { ...prev, goals: updatedGoals };
      save({ goals: updatedGoals });
      return updated;
    });
  }, [save]);

  // Update reflections
  const updateReflections = useCallback((reflections: Partial<JournalReflections>) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedReflections = { ...prev.reflections, ...reflections };
      const updated = { ...prev, reflections: updatedReflections };
      save({ reflections: updatedReflections });
      return updated;
    });
  }, [save]);

  // Copy yesterday's plan
  const copyYesterdayPlan = useCallback(() => {
    const copiedEntry = copyPlanFromPreviousDay(date, userId);
    if (copiedEntry) {
      setEntry(copiedEntry);
      setLastSaved(new Date());
      return true;
    }
    return false;
  }, [date, userId]);

  // Link event to a time slot
  const linkEventToSlot = useCallback((slotId: string, eventId: string, eventText: string) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedSlots = prev.timeSlots.map(slot => {
        if (slot.id === slotId) {
          return {
            ...slot,
            planText: slot.planText ? `${slot.planText}\n${eventText}` : eventText,
            linkedEventIds: [...slot.linkedEventIds, eventId],
          };
        }
        return slot;
      });
      
      const updated = { ...prev, timeSlots: updatedSlots };
      save({ timeSlots: updatedSlots });
      return updated;
    });
  }, [save]);

  // Add urgent task
  const addUrgentTask = useCallback(() => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const newTask: UrgentTask = {
        id: `urgent-${Date.now()}`,
        taskText: '',
        deadline: format(date, 'yyyy-MM-dd'),
        done: false,
        priority: 'high',
      };
      
      const updatedTasks = [...prev.urgentTasks, newTask];
      save({ urgentTasks: updatedTasks });
      return { ...prev, urgentTasks: updatedTasks };
    });
  }, [save, date]);

  // Update urgent task
  const updateUrgentTask = useCallback((taskId: string, updates: Partial<UrgentTask>) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedTasks = prev.urgentTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      save({ urgentTasks: updatedTasks });
      return { ...prev, urgentTasks: updatedTasks };
    });
  }, [save]);

  // Delete urgent task
  const deleteUrgentTask = useCallback((taskId: string) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedTasks = prev.urgentTasks.filter(task => task.id !== taskId);
      save({ urgentTasks: updatedTasks });
      return { ...prev, urgentTasks: updatedTasks };
    });
  }, [save]);

  // Toggle urgent task done
  const toggleUrgentTaskDone = useCallback((taskId: string) => {
    setEntry(prev => {
      if (!prev) return prev;
      
      const updatedTasks = prev.urgentTasks.map(task => 
        task.id === taskId ? { ...task, done: !task.done } : task
      );
      
      save({ urgentTasks: updatedTasks });
      return { ...prev, urgentTasks: updatedTasks };
    });
  }, [save]);

  // Force save (for explicit save button)
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (entry) {
      const saved = upsertJournal(entry, date, userId);
      setEntry(saved);
      setLastSaved(new Date());
      setIsSaving(false);
      isDirtyRef.current = false;
    }
  }, [entry, date, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    entry,
    isLoading,
    isSaving,
    lastSaved,
    updateTitle,
    updateTimeSlot,
    toggleSlotDone,
    updateGoals,
    updateReflections,
    addUrgentTask,
    updateUrgentTask,
    deleteUrgentTask,
    toggleUrgentTaskDone,
    copyYesterdayPlan,
    linkEventToSlot,
    forceSave,
  };
};
