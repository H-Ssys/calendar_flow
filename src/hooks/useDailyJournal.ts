/**
 * Daily Journal Hook
 * 
 * React hook for managing daily journal entries with autosave functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyJournalEntry, TimeSlot, UrgentTask, JournalGoals, JournalReflections } from '@/types/dailyJournal';
import { getJournalByDate, upsertJournal, copyPlanFromPreviousDay } from '@/services/dailyJournalService';
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

  // Load journal entry for the current date
  useEffect(() => {
    setIsLoading(true);
    const loadedEntry = getJournalByDate(date, userId, timeConfig);
    
    if (loadedEntry) {
      // Ensure urgentTasks exists (migration for old entries)
      if (!loadedEntry.urgentTasks) {
        loadedEntry.urgentTasks = [];
      }
      setEntry(loadedEntry);
    } else {
      // Initialize new entry
      const newEntry = upsertJournal({}, date, userId, timeConfig);
      setEntry(newEntry);
    }
    
    setIsLoading(false);
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
