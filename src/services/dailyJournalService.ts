/**
 * Daily Journal Service
 * 
 * Manages CRUD operations for DailyJournalEntry using localStorage.
 * In production, this would connect to a backend API.
 * 
 * Storage Key: `daily-journal-${userId}`
 * Data Structure: Map<date, DailyJournalEntry>
 */

import { DailyJournalEntry, JournalGoals, JournalReflections, TimeSlot } from '@/types/dailyJournal';
import { format, subDays } from 'date-fns';
import { TimeConfig } from '@/context/CalendarContext';

const STORAGE_KEY = 'daily-journal';

// Generate time slots dynamically based on time configuration
const generateTimeSlots = (dateKey: string, timeConfig: TimeConfig): TimeSlot[] => {
  const { startHour, endHour, hourInterval } = timeConfig;
  const numSlots = Math.floor((endHour - startHour) / hourInterval);
  
  return Array.from({ length: numSlots }, (_, i) => {
    const hour = startHour + (i * hourInterval);
    const nextHour = hour + hourInterval;
    
    return {
      id: `slot-${dateKey}-${i}`,
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${nextHour.toString().padStart(2, '0')}:00`,
      planText: '',
      actualText: '',
      done: false,
      deadline: '',
      linkedEventIds: [],
      linkedTaskIds: [],
    };
  });
};

// Get storage key for a user (in production, userId would come from auth)
const getUserStorageKey = (userId: string = 'default-user') => `${STORAGE_KEY}-${userId}`;

// Load all journal entries for a user
const loadAllEntries = (userId: string = 'default-user'): Map<string, DailyJournalEntry> => {
  try {
    const key = getUserStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return new Map();
    
    const parsed = JSON.parse(data);
    // Convert plain object back to Map
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error('Failed to load journal entries:', error);
    return new Map();
  }
};

// Save all journal entries for a user
const saveAllEntries = (entries: Map<string, DailyJournalEntry>, userId: string = 'default-user'): void => {
  try {
    const key = getUserStorageKey(userId);
    // Convert Map to plain object for JSON serialization
    const obj = Object.fromEntries(entries);
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (error) {
    console.error('Failed to save journal entries:', error);
  }
};

// Get journal entry by date
export const getJournalByDate = (date: Date, userId: string = 'default-user', timeConfig?: TimeConfig): DailyJournalEntry | null => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);
  const entry = entries.get(dateKey);
  
  if (entry) {
    // Migration: ensure urgentTasks exists for old entries
    if (!entry.urgentTasks) {
      entry.urgentTasks = [];
    }
    
    // Migration: regenerate time slots if timeConfig changes
    if (timeConfig && entry.timeSlots.length > 0) {
      const firstSlot = entry.timeSlots[0];
      const lastSlot = entry.timeSlots[entry.timeSlots.length - 1];
      
      const currentStartHour = parseInt(firstSlot.startTime.split(':')[0], 10);
      const currentEndHour = parseInt(lastSlot.endTime.split(':')[0], 10);
      const currentInterval = entry.timeSlots.length > 1 
        ? parseInt(entry.timeSlots[1].startTime.split(':')[0], 10) - currentStartHour 
        : 1;
      
      // If time configuration changed, regenerate slots while preserving data
      if (currentStartHour !== timeConfig.startHour || 
          currentEndHour !== timeConfig.endHour || 
          currentInterval !== timeConfig.hourInterval) {
        const newSlots = generateTimeSlots(dateKey, timeConfig);
        
        // Try to preserve existing data by matching time slots
        entry.timeSlots = newSlots.map(newSlot => {
          const existingSlot = entry.timeSlots.find(s => s.startTime === newSlot.startTime);
          return existingSlot || newSlot;
        });
      }
    }
  }
  
  return entry || null;
};

// Create or update journal entry
export const upsertJournal = (entry: Partial<DailyJournalEntry>, date: Date, userId: string = 'default-user', timeConfig?: TimeConfig): DailyJournalEntry => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);
  
  const existingEntry = entries.get(dateKey);
  const now = new Date();
  
  // Use timeConfig to generate slots, or default to existing or default config
  const defaultTimeConfig: TimeConfig = timeConfig || { startHour: 6, endHour: 22, hourInterval: 2 };
  const defaultSlots = existingEntry?.timeSlots || generateTimeSlots(dateKey, defaultTimeConfig);
  
  const updatedEntry: DailyJournalEntry = {
    id: existingEntry?.id || `journal-${dateKey}-${Date.now()}`,
    userId,
    date: dateKey,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    title: entry.title || existingEntry?.title || '',
    timeSlots: entry.timeSlots || defaultSlots,
    urgentTasks: entry.urgentTasks || existingEntry?.urgentTasks || [],
    goals: entry.goals || existingEntry?.goals || {
      yearlyGoalText: '',
      monthlyGoalText: '',
      dailyGoalText: '',
      dailyGoalResult: '',
    },
    reflections: entry.reflections || existingEntry?.reflections || {
      gratitudeGood: '',
      standardizeRules: '',
      notGood: '',
      improvements: '',
      selfEncouragement: '',
      notes: '',
    },
    attachments: entry.attachments || existingEntry?.attachments || [],
    createdAt: existingEntry?.createdAt || now,
    updatedAt: now,
  };
  
  entries.set(dateKey, updatedEntry);
  saveAllEntries(entries, userId);
  
  return updatedEntry;
};

// Copy plan from previous day
export const copyPlanFromPreviousDay = (currentDate: Date, userId: string = 'default-user'): DailyJournalEntry | null => {
  const previousDate = subDays(currentDate, 1);
  const previousEntry = getJournalByDate(previousDate, userId);
  
  if (!previousEntry) return null;
  
  // Copy only plan fields, not actual results or done status
  const copiedTimeSlots = previousEntry.timeSlots.map((slot, idx) => ({
    id: `slot-${format(currentDate, 'yyyy-MM-dd')}-${idx}`,
    startTime: slot.startTime,
    endTime: slot.endTime,
    planText: slot.planText, // Copy plan
    actualText: '', // Reset actual
    done: false, // Reset done
    interleavedText: '', // Reset
    urgentText: '', // Reset
    deadline: '', // Reset
    linkedEventIds: [], // Reset links
    linkedTaskIds: [], // Reset links
  }));
  
  return upsertJournal({
    timeSlots: copiedTimeSlots,
    title: previousEntry.title || '',
  }, currentDate, userId);
};

// Delete journal entry
export const deleteJournal = (date: Date, userId: string = 'default-user'): void => {
  const dateKey = format(date, 'yyyy-MM-dd');
  const entries = loadAllEntries(userId);
  entries.delete(dateKey);
  saveAllEntries(entries, userId);
};

// Get all journal entries (for export or analytics)
export const getAllJournals = (userId: string = 'default-user'): DailyJournalEntry[] => {
  const entries = loadAllEntries(userId);
  return Array.from(entries.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};
