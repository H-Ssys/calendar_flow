import { useEffect } from 'react';
import { useCalendar, ViewType } from '@/context/CalendarContext';
import { addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from 'date-fns';

/**
 * Global keyboard shortcuts for calendar navigation.
 *
 * Shortcuts:
 *  ← / → : Navigate back/forward by period (day/week/month/year)
 *  t      : Jump to today
 *  1–4    : Switch view (daily/weekly/monthly/yearly)
 *  n      : Create new event (calls onNewEvent callback)
 */
export const useCalendarKeyboard = (onNewEvent?: () => void) => {
    const { currentView, currentDate, setView, setDate } = useCalendar();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip when typing in inputs / textareas / contenteditable
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setDate(navigate(currentView, currentDate, -1));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setDate(navigate(currentView, currentDate, 1));
                    break;
                case 't':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setDate(new Date());
                    }
                    break;
                case '1': if (!e.ctrlKey && !e.metaKey) setView('daily'); break;
                case '2': if (!e.ctrlKey && !e.metaKey) setView('weekly'); break;
                case '3': if (!e.ctrlKey && !e.metaKey) setView('monthly'); break;
                case '4': if (!e.ctrlKey && !e.metaKey) setView('yearly'); break;
                case 'n':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onNewEvent?.();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentView, currentDate, setView, setDate, onNewEvent]);
};

function navigate(view: ViewType, date: Date, direction: 1 | -1): Date {
    const fn = direction === 1;
    switch (view) {
        case 'daily': return fn ? addDays(date, 1) : subDays(date, 1);
        case 'weekly': return fn ? addWeeks(date, 1) : subWeeks(date, 1);
        case 'monthly': return fn ? addMonths(date, 1) : subMonths(date, 1);
        case 'yearly': return fn ? addYears(date, 1) : subYears(date, 1);
        default: return date;
    }
}
