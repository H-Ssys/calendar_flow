import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuthContext } from './AuthContext';
import { uuid } from '@/lib/utils';
import * as eventSupabaseService from '@/services/supabase/eventSupabaseService';
import * as settingsService from '@/services/supabase/settingsSupabaseService';
import type { SettingsBlob } from '@/services/supabase/settingsSupabaseService';
import { mapV1ToV2, mapV2ToV1, mapV1UpdateToV2 } from '@/utils/eventTypeMapper';
import type { Task } from '@/types/task';

// ── Debounce helper for settings saves ─────────────────────────────
function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
    const timer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    return useCallback((...args: unknown[]) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]) as unknown as T;
}

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

export type GlobalPopoverState = null | {
    type: 'menu' | 'event' | 'task';
    x: number;
    y: number;
    date?: Date;
};

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

    // Global Popovers
    popoverState: GlobalPopoverState;
    setPopoverState: (state: GlobalPopoverState) => void;

    // Detail Sheets
    selectedEventForDetail: Event | null;
    setSelectedEventForDetail: (event: Event | null) => void;
    selectedTaskForDetail: Task | null;
    setSelectedTaskForDetail: (task: Task | null) => void;
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

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuthContext();
    const userId = user?.id;

    // ── Events state ─────────────────────────────────────────────────
    const [events, setEvents] = useState<Event[]>([]);

    // ── Fetch events on mount + realtime subscription ────────────────
    useEffect(() => {
        if (!userId) return;

        let cancelled = false;

        eventSupabaseService.fetchEvents(userId).then((rows) => {
            if (cancelled) return;
            setEvents(rows.map(mapV2ToV1));
        });

        const unsubscribe = eventSupabaseService.subscribeToEvents(userId, () => {
            eventSupabaseService.fetchEvents(userId).then((rows) => {
                if (!cancelled) setEvents(rows.map(mapV2ToV1));
            });
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [userId]);

    const [currentView, setCurrentView] = useState<ViewType>('weekly');

    // ── Event Logs (in-memory only — P2 future task to persist) ──────
    const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

    const addEventLog = useCallback((log: Omit<EventLog, 'id' | 'timestamp'>) => {
        const newLog: EventLog = { ...log, id: uuid(), timestamp: new Date() };
        setEventLogs(prev => [newLog, ...prev]);
    }, []);

    const getEventLogs = (eventId: string) => eventLogs.filter(l => l.eventId === eventId);
    const clearEventLogs = () => { setEventLogs([]); };
    const [dailyViewVariant, setDailyViewVariant] = useState<DailyViewVariant>('journal'); // Changed to 'journal' as default
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategories, setActiveCategories] = useState<string[]>(['Work Plan']);
    const [popoverState, setPopoverState] = useState<GlobalPopoverState>(null);
    const [selectedEventForDetail, setSelectedEventForDetail] = useState<Event | null>(null);
    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

    // Settings State (declared early so Supabase settings load effect can reference setTheme)
    const [theme, setTheme] = useState<Theme>('light');
    const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
    const [weekStart, setWeekStart] = useState<WeekStart>('monday');
    const [showDeclinedEvents, setShowDeclinedEvents] = useState(false);

    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

    // Per-View Time Configuration
    const DAILY_DEFAULTS: ViewTimeConfig = { startHour: 6, endHour: 22, hourInterval: 2 };
    const WEEKLY_DEFAULTS: ViewTimeConfig = { startHour: 6, endHour: 22, hourInterval: 2 };

    const [dailyTimeConfig, setDailyTimeConfig] = useState<ViewTimeConfig>(DAILY_DEFAULTS);
    const [weeklyTimeConfig, setWeeklyTimeConfig] = useState<ViewTimeConfig>(WEEKLY_DEFAULTS);
    const [monthlyViewConfig, setMonthlyViewConfig] = useState<MonthlyViewConfig>({ rowHighlightColor: '#EFF6FF' });
    const [yearlyViewConfig, setYearlyViewConfig] = useState<YearlyViewConfig>({ monthHighlightColor: '#DBEAFE' });
    const [menuBarConfig, setMenuBarConfig] = useState<MenuBarConfig>({ enabled: false, eventPeriod: 'today' });
    const [profileConfig, setProfileConfig] = useState<ProfileConfig>({ firstName: '', lastName: '', bio: '', language: 'en', timezone: 'UTC' });
    const [emailNotificationConfig, setEmailNotificationConfig] = useState<EmailNotificationConfig>({ newInvitations: true, eventUpdates: true, eventCancellations: true, dailyAgenda: false, newSignIns: true, securityAlerts: true });

    // Track whether Supabase settings have been loaded (prevents save-on-mount with defaults)
    const settingsLoaded = useRef(false);

    // ── Load settings from Supabase on mount ────────────────────────
    useEffect(() => {
        if (!userId) return;
        settingsService.fetchSettings(userId).then(({ settings: s, profile: p }) => {
            if (s.categories && Array.isArray(s.categories)) setCategories(s.categories as Category[]);
            if (s.dailyTimeConfig) setDailyTimeConfig({ ...DAILY_DEFAULTS, ...s.dailyTimeConfig });
            if (s.weeklyTimeConfig) setWeeklyTimeConfig({ ...WEEKLY_DEFAULTS, ...s.weeklyTimeConfig });
            if (s.monthlyViewConfig) setMonthlyViewConfig(s.monthlyViewConfig as MonthlyViewConfig);
            if (s.yearlyViewConfig) setYearlyViewConfig(s.yearlyViewConfig as YearlyViewConfig);
            if (s.menuBar) setMenuBarConfig(s.menuBar as MenuBarConfig);
            if (s.emailNotifications) setEmailNotificationConfig(s.emailNotifications as EmailNotificationConfig);
            // Profile columns → profileConfig
            setProfileConfig({
                firstName: p.display_name?.split(' ')[0] ?? '',
                lastName: p.display_name?.split(' ').slice(1).join(' ') ?? '',
                bio: '',
                language: p.language ?? 'en',
                timezone: p.timezone ?? 'UTC',
            });
            if (p.theme) setTheme(p.theme as Theme);
            settingsLoaded.current = true;
        }).catch((err) => {
            console.error('[CalendarContext] Failed to load settings from Supabase:', err);
            settingsLoaded.current = true; // proceed with defaults
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ── Debounced Supabase settings save ────────────────────────────
    const saveSettingsToSupabase = useCallback(() => {
        if (!userId || !settingsLoaded.current) return;
        const blob: SettingsBlob = {
            categories,
            dailyTimeConfig,
            weeklyTimeConfig,
            monthlyViewConfig,
            yearlyViewConfig,
            menuBar: menuBarConfig,
            emailNotifications: emailNotificationConfig,
        };
        settingsService.updateSettings(userId, blob).catch((err) => {
            console.error('[CalendarContext] Failed to save settings to Supabase:', err);
        });
    }, [userId, categories, dailyTimeConfig, weeklyTimeConfig, monthlyViewConfig, yearlyViewConfig, menuBarConfig, emailNotificationConfig]);

    const debouncedSaveSettings = useDebouncedCallback(saveSettingsToSupabase, 300);

    // Trigger debounced save whenever any setting changes
    useEffect(() => {
        if (!settingsLoaded.current) return;
        debouncedSaveSettings();
    }, [debouncedSaveSettings]);

    // ── Debounced Supabase profile columns save ─────────────────────
    const saveProfileToSupabase = useCallback(() => {
        if (!userId || !settingsLoaded.current) return;
        const displayName = [profileConfig.firstName, profileConfig.lastName].filter(Boolean).join(' ');
        settingsService.updateProfileColumns(userId, {
            display_name: displayName || null,
            timezone: profileConfig.timezone,
            language: profileConfig.language,
            theme,
        }).catch((err) => {
            console.error('[CalendarContext] Failed to save profile to Supabase:', err);
        });
    }, [userId, profileConfig, theme]);

    const debouncedSaveProfile = useDebouncedCallback(saveProfileToSupabase, 300);

    useEffect(() => {
        if (!settingsLoaded.current) return;
        debouncedSaveProfile();
    }, [debouncedSaveProfile]);

    // Legacy aliases — timeConfig points to weeklyTimeConfig for backward compatibility
    const timeConfig = weeklyTimeConfig;
    const setTimeConfig = setWeeklyTimeConfig;

    // Categories CRUD — debounced settings effect picks up Supabase persistence
    const addCategory = (category: Category) => {
        setCategories(prev => [...prev, category]);
        if (!activeCategories.includes(category.name)) {
            setActiveCategories([...activeCategories, category.name]);
        }
    };

    const updateCategory = (name: string, updates: Partial<Category>) => {
        setCategories(prev => prev.map(c => c.name === name ? { ...c, ...updates } : c));
        if (updates.color) {
            setEvents(prev => prev.map(e => e.category === name ? { ...e, color: updates.color! } : e));
        }
    };

    const deleteCategory = (name: string) => {
        setCategories(prev => prev.filter(c => c.name !== name));
        setActiveCategories(prev => prev.filter(c => c !== name));
        setEvents(prev => prev.map(e => e.category === name ? { ...e, category: undefined } : e));
    };

    const addEvent = useCallback((event: Omit<Event, 'id'>, source: EventLogSource = 'unknown'): Event => {
        const newEvent = { ...event, id: uuid() } as Event;

        // Optimistic local update
        setEvents(prev => [...prev, newEvent]);
        addEventLog({ eventId: newEvent.id, eventTitle: newEvent.title, action: 'created', source });

        if (userId) {
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

        const v2Updates = mapV1UpdateToV2(updates);
        eventSupabaseService.updateEvent(id, v2Updates).catch((err) => {
            console.error('[CalendarContext] Supabase updateEvent failed, rolling back:', err);
            if (existing) {
                setEvents(prev => prev.map(e => e.id === id ? existing : e));
            }
        });
    }, [events, addEventLog]);

    const deleteEvent = useCallback((id: string, source: EventLogSource = 'unknown') => {
        const existing = events.find(e => e.id === id);

        // Optimistic local update
        setEvents(prev => prev.filter(e => e.id !== id));
        if (existing) {
            addEventLog({ eventId: id, eventTitle: existing.title, action: 'deleted', source });
        }

        eventSupabaseService.deleteEvent(id).catch((err) => {
            console.error('[CalendarContext] Supabase deleteEvent failed, rolling back:', err);
            if (existing) {
                setEvents(prev => [...prev, existing]);
            }
        });
    }, [events, addEventLog]);

    const toggleCategory = (category: string) => {
        if (activeCategories.includes(category)) {
            setActiveCategories(activeCategories.filter(c => c !== category));
        } else {
            setActiveCategories([...activeCategories, category]);
        }
    };

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
        // Global Popovers
        popoverState,
        setPopoverState,
        // Detail Sheets
        selectedEventForDetail,
        setSelectedEventForDetail,
        selectedTaskForDetail,
        setSelectedTaskForDetail,
    };

    return (
        <CalendarContext.Provider value={value}>
            {children}
        </CalendarContext.Provider>
    );
};
