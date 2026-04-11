import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendar } from '@/context/CalendarContext';
import { useTaskContext } from '@/context/TaskContext';
import { useNoteContext } from '@/context/NoteContext';
import { useAuthContext } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    exportAllData,
    exportEventsCSV,
    exportTasksCSV,
    exportNotesCSV,
    importData,
    downloadAsFile,
    resetAllDataForUser,
} from '@/services/dataService';
import { Download, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const {
        events,
        theme, setTheme,
        timeFormat, setTimeFormat,
        weekStart, setWeekStart,
        showDeclinedEvents, setShowDeclinedEvents
    } = useCalendar();
    const { tasks } = useTaskContext();
    const { notes } = useNoteContext();
    const { user } = useAuthContext();
    const userId = user?.id;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Export handlers ──
    const handleExportJSON = async () => {
        if (!userId) { toast.error('You must be signed in to export'); return; }
        try {
            const json = await exportAllData(userId);
            const filename = `ofative-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
            downloadAsFile(json, filename);
            toast.success('Full backup exported');
        } catch (err) {
            console.error('[GeneralSettings] Export failed:', err);
            toast.error('Export failed. See console for details.');
        }
    };

    const handleExportCSV = (type: 'events' | 'tasks' | 'notes') => {
        const csvMap = {
            events: () => exportEventsCSV(events),
            tasks: () => exportTasksCSV(tasks),
            notes: () => exportNotesCSV(notes),
        };
        const csv = csvMap[type]();
        downloadAsFile(csv, `${type}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} CSV exported`);
    };

    // ── Import handler ──
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) {
            if (!userId) toast.error('You must be signed in to import');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const result = await importData(userId, reader.result as string);
            if (result.success) {
                toast.success(result.message + ' Reload to apply.');
            } else {
                toast.error(result.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Reset handler ──
    const handleReset = async () => {
        if (!userId) { toast.error('You must be signed in to reset'); return; }
        if (!window.confirm('This will delete ALL data (events, tasks, notes, journal). Continue?')) return;
        try {
            await resetAllDataForUser(userId);
            toast.success('All data cleared. Reload to apply.');
        } catch (err) {
            console.error('[GeneralSettings] Reset failed:', err);
            toast.error('Reset failed. See console for details.');
        }
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-8">{t('settings.title')}</h1>

            <div className="space-y-8">
                {/* Show declined events */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.showDeclined')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.showDeclinedDesc')}</p>
                    </div>
                    <Switch
                        checked={showDeclinedEvents}
                        onCheckedChange={setShowDeclinedEvents}
                    />
                </div>

                {/* Start of week */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.startOfWeek')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.startOfWeekDesc')}</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setWeekStart('sunday')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${weekStart === 'sunday' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('settings.sunday')}
                        </button>
                        <button
                            onClick={() => setWeekStart('monday')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${weekStart === 'monday' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('settings.monday')}
                        </button>
                    </div>
                </div>

                {/* Time format */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.timeFormat')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.timeFormatDesc')}</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setTimeFormat('12h')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFormat === '12h' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            12-hours
                        </button>
                        <button
                            onClick={() => setTimeFormat('24h')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeFormat === '24h' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            24-hours
                        </button>
                    </div>
                </div>

                {/* Locale */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.language')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.localeDesc')}</p>
                    </div>
                    <Select
                        value={i18n.language}
                        onValueChange={(lang) => {
                            i18n.changeLanguage(lang);
                            // Persisted via profileConfig.language → profiles.language
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Timezone */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.timezone')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.timezoneDesc')}</p>
                    </div>
                    <Select defaultValue="asia-jakarta">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asia-jakarta">Asia/Jakarta</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                            <SelectItem value="pst">PST</SelectItem>
                            <SelectItem value="est">EST</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Default event duration */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.defaultDuration')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.defaultDurationDesc')}</p>
                    </div>
                    <Select defaultValue="30">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">15 - min</SelectItem>
                            <SelectItem value="30">30 - min</SelectItem>
                            <SelectItem value="60">60 - min</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Color theme */}
                <div className="flex items-center justify-between pb-6">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.colorTheme')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.colorThemeDesc')}</p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setTheme('system')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('settings.system')}
                        </button>
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('settings.light')}
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t('settings.dark')}
                        </button>
                    </div>
                </div>

                {/* Use pointer cursor */}
                <div className="flex items-center justify-between pb-6 border-b border-border border-t pt-6">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.pointerCursor')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.pointerCursorDesc')}</p>
                    </div>
                    <Switch defaultChecked />
                </div>

                {/* Reduce motion */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-base font-medium">{t('settings.reduceMotion')}</Label>
                        <p className="text-sm text-muted-foreground">{t('settings.reduceMotionDesc')}</p>
                    </div>
                    <Switch />
                </div>

                {/* ── Data Management ── */}
                <div className="border-t border-border pt-6">
                    <h2 className="text-lg font-semibold mb-4">{t('settings.dataManagement')}</h2>
                    <div className="space-y-4">
                        {/* Export JSON */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{t('settings.exportJSON')}</Label>
                                <p className="text-xs text-muted-foreground">{t('settings.exportJSONDesc')}</p>
                            </div>
                            <button
                                onClick={handleExportJSON}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export JSON
                            </button>
                        </div>

                        {/* Export CSV */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{t('settings.exportCSV')}</Label>
                                <p className="text-xs text-muted-foreground">{t('settings.exportCSVDesc')}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleExportCSV('events')} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors">Events</button>
                                <button onClick={() => handleExportCSV('tasks')} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors">Tasks</button>
                                <button onClick={() => handleExportCSV('notes')} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors">Notes</button>
                            </div>
                        </div>

                        {/* Import */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{t('settings.importData')}</Label>
                                <p className="text-xs text-muted-foreground">{t('settings.importDataDesc')}</p>
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImportFile}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Import
                                </button>
                            </div>
                        </div>

                        {/* Reset */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium text-destructive">{t('settings.resetAll')}</Label>
                                <p className="text-xs text-muted-foreground">{t('settings.resetAllDesc')}</p>
                            </div>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
