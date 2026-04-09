import React from 'react';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

/* ── Time option generators ───────────────────────────────────────── */
const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, '0')}:00`,
}));

const INTERVAL_OPTIONS = [
    { value: 1, label: '1 hour' },
    { value: 2, label: '2 hours' },
    { value: 3, label: '3 hours' },
];

/* ── Component ────────────────────────────────────────────────────── */
export const WorkingHoursSettings: React.FC = () => {
    const { dailyTimeConfig, setDailyTimeConfig, dailyViewVariant, setDailyViewVariant } = useCalendar();

    const { startHour, endHour, hourInterval } = dailyTimeConfig;

    const updateConfig = (patch: Partial<typeof dailyTimeConfig>) => {
        setDailyTimeConfig({ ...dailyTimeConfig, ...patch });
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Daily View Settings</h1>
            <p className="text-sm text-muted-foreground mb-10">
                Configure how the daily timeline appears. Changes apply immediately.
            </p>

            <div className="space-y-8">
                {/* Visible Hours */}
                <div className="pb-6 border-b border-border">
                    <Label className="text-lg font-bold text-foreground leading-tight block mb-1">Visible hours</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Set the default time range shown in the daily timeline. Events outside this range will still be visible — the timeline extends automatically.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Start hour */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">From</Label>
                            <Select
                                value={String(startHour)}
                                onValueChange={(v) => {
                                    const val = Number(v);
                                    updateConfig({ startHour: val, endHour: Math.max(val + 1, endHour) });
                                }}
                            >
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {HOUR_OPTIONS.filter(o => o.value < 24).map(o => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* End hour */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">To</Label>
                            <Select
                                value={String(endHour)}
                                onValueChange={(v) => updateConfig({ endHour: Number(v) })}
                            >
                                <SelectTrigger className="bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {HOUR_OPTIONS.filter(o => o.value > startHour).map(o => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Time Interval */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-lg font-bold text-foreground leading-tight block">Time interval</Label>
                        <p className="text-sm text-muted-foreground">Spacing between time labels on the grid</p>
                    </div>
                    <Select
                        value={String(hourInterval)}
                        onValueChange={(v) => updateConfig({ hourInterval: Number(v) })}
                    >
                        <SelectTrigger className="w-[140px] bg-background border-border">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {INTERVAL_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Default View */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-lg font-bold text-foreground leading-tight block">Default daily view</Label>
                        <p className="text-sm text-muted-foreground">
                            {dailyViewVariant === 'journal'
                                ? 'Opens with the Journal (notes + tasks) view'
                                : 'Opens with the Timeline (events) view'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${dailyViewVariant === 'timeline' ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Timeline
                        </span>
                        <Switch
                            checked={dailyViewVariant === 'journal'}
                            onCheckedChange={(checked) => setDailyViewVariant(checked ? 'journal' : 'timeline')}
                        />
                        <span className={`text-xs font-medium ${dailyViewVariant === 'journal' ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Journal
                        </span>
                    </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                    </div>
                    <div className="space-y-0">
                        {Array.from({ length: Math.min(endHour - startHour, 6) }, (_, i) => {
                            const hour = startHour + i;
                            if (i % hourInterval !== 0) return null;
                            const h = hour % 12 || 12;
                            const ampm = hour < 12 ? 'AM' : 'PM';
                            return (
                                <div key={hour} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                                    <span className="text-xs font-medium text-muted-foreground w-16">
                                        {h}:00 {ampm}
                                    </span>
                                    <div className="flex-1 h-px bg-border/50" />
                                </div>
                            );
                        })}
                        {endHour - startHour > 6 && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                                ...{endHour - startHour - 6} more hours
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
