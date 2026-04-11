import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import * as eventSupabaseService from '@/services/supabase/eventSupabaseService';
import { mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 } from '@/utils/eventTypeMapper';

// ── Feature flag: 'true' → Supabase, anything else → localStorage ──
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

export interface Event {
    id: string;
    title: string;

    // Date/time handling
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;

    // Metadata
    emoji: string;
    color?: string; // Hex code for custom colors

    // Additional fields
    description?: string;
    participants?: Array<{ name: string; email: string }>;
    recurrence?: string; // 'none' | 'daily' | 'weekly' | 'custom'
    videoCallLink?: string;
    category?: string;
}

// ── Event Changelog ──────────────────────────────────────────────────
export type EventLogAction = 'created' | 'updated' | 'deleted';
export type EventLogSource = 'event-page' | 'daily-view' | 'weekly-view' | 'monthly-view' | 'yearly-view' | 'journal' | 'unknown';

export interface EventLog {
    id: string;
    eventId: string;
    eventTitle: string;
    action: EventLogAction;
    timestamp: Date;
    changes?: Record<string, { from: any; to: any }>;
    source: EventLogSource;
}

// Utility functions for multi-day events
export const isMultiDayEvent = (event: Event): boolean => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start.getTime() !== end.getTime();
};

export const getEventDurationDays = (event: Event): number => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export interface Category {
    name: string;
    color: string;
    type: 'default' | 'custom';
}

export const PASTEL_COLORS = [
    { name: 'Coral', value: '#F8A0A0' },
    { name: 'Mint', value: '#7EE8A8' },
    { name: 'Periwinkle', value: '#96AAFF' },
    { name: 'Lavender', value: '#B8A0E8' },
    { name: 'Purple', value: '#C890E0' },
    { name: 'Pink', value: '#F0A8D0' },
    { name: 'Orange', value: '#F0944A' },
    { name: 'Peach', value: '#F8C870' },
    { name: 'Lime', value: '#D8E878' },
    { name: 'Seafoam', value: '#A0E8D0' },
];

const DEFAULT_CATEGORIES: Category[] = [
    { name: 'Work Plan', color: '#96AAFF', type: 'default' },   // Periwinkle
    { name: 'Project', color: '#B8A0E8', type: 'default' },     // Lavender
    { name: 'Personal', color: '#F0A8D0', type: 'default' },    // Pink
    { name: 'Holiday', color: '#7EE8A8', type: 'default' },     // Mint
    { name: 'Fitness', color: '#F8A0A0', type: 'default' },     // Coral
];

export type Theme = 'light' | 'dark' | 'system';
export type TimeFormat = '12h' | '24h';
export type WeekStart = 'sunday' | 'monday';

export type ViewType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DailyViewVariant = 'timeline' | 'journal'; // Timeline = existing DailyView, Journal = PDAC

export interface TimeConfig {
    startHour: number;    // e.g., 6 for 6:00 AM
    endHour: number;      // e.g., 22 for 10:00 PM
    hourInterval: number; // e.g., 2 for 2-hour intervals
}

// Per-view time config (same shape, separate instances)
export type ViewTimeConfig = TimeConfig;

export interface MonthlyViewConfig {
    rowHighlightColor: string; // CSS color for week-row highlighting
}

export interface YearlyViewConfig {
    monthHighlightColor: string; // CSS color for current/selected month
}

export interface MenuBarConfig {
    enabled: boolean;
    eventPeriod: 'today' | 'tomorrow' | 'week';
}

export interface ProfileConfig {
    firstName: string;
    lastName: string;
    bio: string;
    language: string;
    timezone: string;
}

export interface EmailNotificationConfig {
    newInvitations: boolean;
    eventUpdates: boolean;
    eventCancellations: boolean;
    dailyAgenda: boolean;
    newSignIns: boolean;
    securityAlerts: boolean;
}

interface CalendarContextType {
    events: Event[];
    currentView: ViewType;
    dailyViewVariant: DailyViewVariant;
    currentDate: Date;
    searchQuery: string;
    activeCategories: string[];

    // Actions
    addEvent: (event: Omit<Event, 'id'>, source?: EventLogSource) => Event;
    updateEvent: (id: string, updates: Partial<Event>, source?: EventLogSource) => void;
    deleteEvent: (id: string, source?: EventLogSource) => void;
    setView: (view: ViewType) => void;
    setDailyViewVariant: (variant: DailyViewVariant) => void;
    setDate: (date: Date) => void;
    setSearchQuery: (query: string) => void;
    toggleCategory: (category: string) => void;
    // New Category Management
    categories: Category[];
    addCategory: (category: Category) => void;
    updateCategory: (name: string, updates: Partial<Category>) => void;
    deleteCategory: (name: string) => void;

    // Settings
    theme: Theme;
    setTheme: (theme: Theme) => void;
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
    weekStart: WeekStart;
    setWeekStart: (start: WeekStart) => void;
    showDeclinedEvents: boolean;
    setShowDeclinedEvents: (show: boolean) => void;

    // Time Configuration (legacy — aliases weeklyTimeConfig for backward compat)
    timeConfig: TimeConfig;
    setTimeConfig: (config: TimeConfig) => void;

    // Per-View Configs
    dailyTimeConfig: ViewTimeConfig;
    setDailyTimeConfig: (config: ViewTimeConfig) => void;
    weeklyTimeConfig: ViewTimeConfig;
    setWeeklyTimeConfig: (config: ViewTimeConfig) => void;
    monthlyViewConfig: MonthlyViewConfig;
    setMonthlyViewConfig: (config: MonthlyViewConfig) => void;
    yearlyViewConfig: YearlyViewConfig;
    setYearlyViewConfig: (config: YearlyViewConfig) => void;

    // Phase 2: Actionable Settings
    menuBarConfig: MenuBarConfig;
    setMenuBarConfig: (config: MenuBarConfig) => void;
    profileConfig: ProfileConfig;
    setProfileConfig: (config: ProfileConfig) => void;
    emailNotificationConfig: EmailNotificationConfig;
    setEmailNotificationConfig: (config: EmailNotificationConfig) => void;

    // Color resolution
    getCategoryColor: (categoryName?: string, fallbackColor?: string) => string;

    // Event Logs
    eventLogs: EventLog[];
    getEventLogs: (eventId: string) => EventLog[];
    clearEventLogs: () => void;
}

export const DEFAULT_CATEGORY_COLOR = '#96AAFF'; // Periwinkle - first palette color

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
    const context = useContext(CalendarContext);
    if (!context) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
};

// Helper to create dates for current week
const getThisWeek = (dayOffset: number, hour: number, minute: number = 0) => {
    const date = new Date();
    const currentDay = (date.getDay() + 6) % 7; // Monday = 0
    date.setDate(date.getDate() - currentDay + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
};

// Initial Mock Data
const INITIAL_EVENTS: Event[] = [
    {
        id: '1',
        title: 'Weekly Meeting',
        startTime: getThisWeek(0, 8, 0),
        endTime: getThisWeek(0, 9, 0),
        isAllDay: false,
        emoji: '📅',
        color: DEFAULT_CATEGORY_COLOR,
        category: 'Work Plan',
        participants: [
            { name: 'Alice', email: 'alice@example.com' },
            { name: 'Bob', email: 'bob@example.com' }
        ]
    },
    {
        id: '2',
        title: 'Feedback Design',
        startTime: getThisWeek(2, 7, 0),
        endTime: getThisWeek(2, 8, 0),
        isAllDay: false,
        emoji: '📝',
        color: '#93E9BE',
        category: 'Holiday'
    },
    {
        id: '3',
        title: 'Sprint 2',
        startTime: getThisWeek(4, 8, 0),
        endTime: getThisWeek(4, 9, 0),
        isAllDay: false,
        emoji: '⚡',
        color: '#90D5FF',
        category: 'Fitness'
    },
    {
        id: '4',
        title: 'Daily Standup',
        startTime: getThisWeek(1, 9, 0),
        endTime: getThisWeek(1, 12, 0),
        isAllDay: false,
        emoji: '🔥',
        color: DEFAULT_CATEGORY_COLOR,
        category: 'Personal',
        participants: [
            { name: 'Charlie', email: 'charlie@example.com' },
            { name: 'Dave', email: 'dave@example.com' },
            { name: 'Eve', email: 'eve@example.com' },
            { name: 'Frank', email: 'frank@example.com' },
            { name: 'Grace', email: 'grace@example.com' }
        ]
    },
    {
        id: '5',
        title: 'Sprint 1',
        startTime: getThisWeek(0, 10, 0),
        endTime: getThisWeek(0, 13, 0),
        isAllDay: false,
        emoji: '⚡️',
        color: '#90D5FF',
        category: 'Fitness'
    },
    {
        id: '6',
        title: 'Prototyping',
        startTime: getThisWeek(2, 10, 0),
        endTime: getThisWeek(2, 13, 0),
        isAllDay: false,
        emoji: '📂',
        color: '#4FD1C5',
        category: 'Work Plan',
        participants: [
            { name: 'Heidi', email: 'heidi@example.com' }
        ]
    },
    {
        id: '7',
        title: 'Wireframe',
        startTime: getThisWeek(5, 10, 0),
        endTime: getThisWeek(5, 11, 0),
        isAllDay: false,
        emoji: '📃',
        color: DEFAULT_CATEGORY_COLOR,
        category: 'Personal'
    },
    {
        id: '8',
        title: 'High Fidelity',
        startTime: getThisWeek(5, 11, 0),
        endTime: getThisWeek(5, 14, 0),
        isAllDay: false,
        emoji: '🎨',
        color: '#4FD1C5',
        category: 'Work Plan'
    },
    {
        id: '9',
        title: 'Daily Standup',
        startTime: getThisWeek(4, 12, 0),
        endTime: getThisWeek(4, 15, 0),
        isAllDay: false,
        emoji: '🔥',
        color: '#FFB088',
        category: 'Project'
    },
    {
        id: '10',
        title: 'Review Design',
        startTime: getThisWeek(1, 14, 0),
        endTime: getThisWeek(1, 15, 0),
        isAllDay: false,
        emoji: '💫',
        color: '#B2F5EA',
        category: 'Holiday'
    },
    {
        id: '11',
        title: 'Feedback Design',
        startTime: getThisWeek(6, 8, 0),
        endTime: getThisWeek(6, 11, 0),
        isAllDay: false,
        emoji: '📝',
        color: '#B2F5EA',
        category: 'Holiday'
    },
];

// Date reviver for JSON.parse
const dateReviver = (_key: string, value: unknown) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value);
    }
    return value;
};

const STORAGE_KEY = 'calendar-events';

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuthContext();
    const userId = user?.id;

    // ── Events state (dual-mode init) ───────────────────────────────
    const [events, setEvents] = useState<Event[]>(() => {
        if (USE_SUPABASE) return []; // loaded async via useEffect
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored, dateReviver);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch { /* ignore corrupt data */ }
        return INITIAL_EVENTS;
    });

    // Track whether initial Supabase load is complete to avoid clobbering
    const supabaseLoaded = useRef(false);

    // ── Supabase mode: fetch events on mount + realtime subscription ─
    useEffect(() => {
        if (!USE_SUPABASE || !userId) return;

        let cancelled = false;

        eventSupabaseService.fetchEvents(userId).then((rows) => {
            if (cancelled) return;
            setEvents(rows.map(mapV2ToV1));
            supabaseLoaded.current = true;
        });

        const unsubscribe = eventSupabaseService.subscribeToEvents(userId, () => {
            // On any realtime change, refetch the full list
            // This is simple and correct — optimistic updates are a future optimization
            eventSupabaseService.fetchEvents(userId).then((rows) => {
                if (!cancelled) setEvents(rows.map(mapV2ToV1));
            });
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [userId]);

    // ── localStorage mode: persist events ────────────────────────────
    useEffect(() => {
        if (USE_SUPABASE) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }, [events]);
    const [currentView, setCurrentView] = useState<ViewType>('weekly');

    // ── Event Logs ──────────────────────────────────────────────────────
    const EVENT_LOGS_KEY = 'calendar-event-logs';
    const [eventLogs, setEventLogs] = useState<EventLog[]>(() => {
        try {
            const stored = localStorage.getItem(EVENT_LOGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored, dateReviver);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch { /* ignore */ }
        return [];
    });
    useEffect(() => {
        localStorage.setItem(EVENT_LOGS_KEY, JSON.stringify(eventLogs));
    }, [eventLogs]);

    const addEventLog = useCallback((log: Omit<EventLog, 'id' | 'timestamp'>) => {
        const newLog: EventLog = { ...log, id: crypto.randomUUID(), timestamp: new Date() };
        setEventLogs(prev => [newLog, ...prev]);
    }, []);

    const getEventLogs = (eventId: string) => eventLogs.filter(l => l.eventId === eventId);
    const clearEventLogs = () => { setEventLogs([]); localStorage.removeItem(EVENT_LOGS_KEY); };
    const [dailyViewVariant, setDailyViewVariant] = useState<DailyViewVariant>('journal'); // Changed to 'journal' as default
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['Work Plan']);
    const [categories, setCategories] = useState<Category[]>(() => {
        try {
            const stored = localStorage.getItem('settings-categories');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return DEFAULT_CATEGORIES;
    });

    // Per-View Time Configuration with localStorage persistence
    const DAILY_DEFAULTS: ViewTimeConfig = { startHour: 6, endHour: 22, hourInterval: 2 };
    const WEEKLY_DEFAULTS: ViewTimeConfig = { startHour: 6, endHour: 22, hourInterval: 2 };

    const [dailyTimeConfig, setDailyTimeConfig] = useState<ViewTimeConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-daily-time-config');
            if (stored) return { ...DAILY_DEFAULTS, ...JSON.parse(stored) };
        } catch { /* ignore */ }
        return DAILY_DEFAULTS;
    });

    const [weeklyTimeConfig, setWeeklyTimeConfig] = useState<ViewTimeConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-weekly-time-config');
            if (stored) return { ...WEEKLY_DEFAULTS, ...JSON.parse(stored) };
        } catch { /* ignore */ }
        return WEEKLY_DEFAULTS;
    });

    const [monthlyViewConfig, setMonthlyViewConfig] = useState<MonthlyViewConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-monthly-view-config');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return { rowHighlightColor: '#EFF6FF' }; // blue-50
    });

    const [yearlyViewConfig, setYearlyViewConfig] = useState<YearlyViewConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-yearly-view-config');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return { monthHighlightColor: '#DBEAFE' }; // blue-100
    });

    // Persist per-view configs
    useEffect(() => { localStorage.setItem('settings-daily-time-config', JSON.stringify(dailyTimeConfig)); }, [dailyTimeConfig]);
    useEffect(() => { localStorage.setItem('settings-weekly-time-config', JSON.stringify(weeklyTimeConfig)); }, [weeklyTimeConfig]);
    useEffect(() => { localStorage.setItem('settings-monthly-view-config', JSON.stringify(monthlyViewConfig)); }, [monthlyViewConfig]);
    useEffect(() => { localStorage.setItem('settings-yearly-view-config', JSON.stringify(yearlyViewConfig)); }, [yearlyViewConfig]);

    // Phase 2: Actionable Settings with localStorage persistence
    const [menuBarConfig, setMenuBarConfig] = useState<MenuBarConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-menu-bar');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return { enabled: false, eventPeriod: 'today' };
    });

    const [profileConfig, setProfileConfig] = useState<ProfileConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-profile');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return { firstName: 'Alex', lastName: 'Rivera', bio: 'Product Designer at Ofative. Passionate about creating seamless user experiences and efficient workflows.', language: 'English (US)', timezone: 'GMT+7 (Jakarta)' };
    });

    const [emailNotificationConfig, setEmailNotificationConfig] = useState<EmailNotificationConfig>(() => {
        try {
            const stored = localStorage.getItem('settings-email-notifications');
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return { newInvitations: true, eventUpdates: true, eventCancellations: true, dailyAgenda: false, newSignIns: true, securityAlerts: true };
    });

    useEffect(() => { localStorage.setItem('settings-menu-bar', JSON.stringify(menuBarConfig)); }, [menuBarConfig]);
    useEffect(() => { localStorage.setItem('settings-profile', JSON.stringify(profileConfig)); }, [profileConfig]);
    useEffect(() => { localStorage.setItem('settings-email-notifications', JSON.stringify(emailNotificationConfig)); }, [emailNotificationConfig]);

    // Legacy aliases — timeConfig points to weeklyTimeConfig for backward compatibility
    const timeConfig = weeklyTimeConfig;
    const setTimeConfig = setWeeklyTimeConfig;

    const addCategory = (category: Category) => {
        // Only persist settings-level categories, not ad-hoc from AddEvent
        const updated = [...categories, category];
        setCategories(updated);
        localStorage.setItem('settings-categories', JSON.stringify(updated));
        // Auto-activate the new category
        if (!activeCategories.includes(category.name)) {
            setActiveCategories([...activeCategories, category.name]);
        }
    };

    const updateCategory = (name: string, updates: Partial<Category>) => {
        const updated = categories.map(c => c.name === name ? { ...c, ...updates } : c);
        setCategories(updated);
        localStorage.setItem('settings-categories', JSON.stringify(updated));
        // Also update event colors if the category color changed
        if (updates.color) {
            setEvents(prev => prev.map(e => e.category === name ? { ...e, color: updates.color! } : e));
        }
    };

    const deleteCategory = (name: string) => {
        const updated = categories.filter(c => c.name !== name);
        setCategories(updated);
        localStorage.setItem('settings-categories', JSON.stringify(updated));
        // Remove from active categories
        setActiveCategories(prev => prev.filter(c => c !== name));
        // Clear category from events but preserve their color
        setEvents(prev => prev.map(e => e.category === name ? { ...e, category: undefined } : e));
    };

    const addEvent = useCallback((event: Omit<Event, 'id'>, source: EventLogSource = 'unknown'): Event => {
        const newEvent = { ...event, id: crypto.randomUUID() } as Event;

        // Optimistic local update
        setEvents(prev => [...prev, newEvent]);
        addEventLog({ eventId: newEvent.id, eventTitle: newEvent.title, action: 'created', source });

        if (USE_SUPABASE && userId) {
            const insert = mapV1ToV2(newEvent, userId);
            eventSupabaseService.createEvent(userId, insert).catch((err) => {
                console.error('[CalendarContext] Supabase createEvent failed, rolling back:', err);
                setEvents(prev => prev.filter(e => e.id !== newEvent.id));
            });
        }

        return newEvent;
    }, [userId, addEventLog]);

    const updateEvent = useCallback((id: string, updates: Partial<Event>, source: EventLogSource = 'unknown') => {
        const existing = events.find(e => e.id === id);

        // Optimistic local update
        setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));

        // Compute field-level diff for event log
        if (existing) {
            const changes: Record<string, { from: any; to: any }> = {};
            for (const key of Object.keys(updates) as (keyof Event)[]) {
                const oldVal = existing[key];
                const newVal = updates[key];
                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    changes[key] = { from: oldVal, to: newVal };
                }
            }
            if (Object.keys(changes).length > 0) {
                addEventLog({ eventId: id, eventTitle: existing.title, action: 'updated', changes, source });
            }
        }

        if (USE_SUPABASE) {
            const v2Updates = mapV1UpdateToV2(updates);
            eventSupabaseService.updateEvent(id, v2Updates).catch((err) => {
                console.error('[CalendarContext] Supabase updateEvent failed, rolling back:', err);
                if (existing) {
                    setEvents(prev => prev.map(e => e.id === id ? existing : e));
                }
            });
        }
    }, [events, addEventLog]);

    const deleteEvent = useCallback((id: string, source: EventLogSource = 'unknown') => {
        const existing = events.find(e => e.id === id);

        // Optimistic local update
        setEvents(prev => prev.filter(e => e.id !== id));
        if (existing) {
            addEventLog({ eventId: id, eventTitle: existing.title, action: 'deleted', source });
        }

        if (USE_SUPABASE) {
            eventSupabaseService.deleteEvent(id).catch((err) => {
                console.error('[CalendarContext] Supabase deleteEvent failed, rolling back:', err);
                if (existing) {
                    setEvents(prev => [...prev, existing]);
                }
            });
        }
    }, [events, addEventLog]);

    const toggleCategory = (category: string) => {
        if (activeCategories.includes(category)) {
            setActiveCategories(activeCategories.filter(c => c !== category));
        } else {
            setActiveCategories([...activeCategories, category]);
        }
    };

    // Settings State
    const [theme, setTheme] = useState<Theme>('light');
    const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
    const [weekStart, setWeekStart] = useState<WeekStart>('monday');
    const [showDeclinedEvents, setShowDeclinedEvents] = useState(false);

    // Theme Effect
    React.useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [theme]);

    // Resolve category → color from context categories
    const getCategoryColor = (categoryName?: string, fallbackColor?: string): string => {
        if (categoryName) {
            const cat = categories.find(c => c.name === categoryName);
            if (cat) return cat.color;
        }
        return fallbackColor || DEFAULT_CATEGORY_COLOR;
    };

    const value = {
        events,
        currentView,
        dailyViewVariant,
        currentDate,
        searchQuery,
        activeCategories,
        addEvent,
        updateEvent,
        deleteEvent,
        setView: setCurrentView,
        setDailyViewVariant,
        setDate: setCurrentDate,
        setSearchQuery,
        toggleCategory,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        // Settings
        theme,
        setTheme,
        timeFormat,
        setTimeFormat,
        weekStart,
        setWeekStart,
        showDeclinedEvents,
        setShowDeclinedEvents,
        // Time Configuration (legacy alias)
        timeConfig,
        setTimeConfig,
        // Per-View Configs
        dailyTimeConfig,
        setDailyTimeConfig,
        weeklyTimeConfig,
        setWeeklyTimeConfig,
        monthlyViewConfig,
        setMonthlyViewConfig,
        yearlyViewConfig,
        setYearlyViewConfig,
        // Phase 2: Actionable Settings
        menuBarConfig,
        setMenuBarConfig,
        profileConfig,
        setProfileConfig,
        emailNotificationConfig,
        setEmailNotificationConfig,
        getCategoryColor,
        // Event Logs
        eventLogs,
        getEventLogs,
        clearEventLogs,
    };

    return (
        <CalendarContext.Provider value={value}>
            {children}
        </CalendarContext.Provider>
    );
};
