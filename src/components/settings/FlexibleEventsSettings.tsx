import React from 'react';
import { Clock } from 'lucide-react';
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
export const FlexibleEventsSettings: React.FC = () => {
    const { weeklyTimeConfig, setWeeklyTimeConfig } = useCalendar();

    const { startHour, endHour, hourInterval } = weeklyTimeConfig;

    const updateConfig = (patch: Partial<typeof weeklyTimeConfig>) => {
        setWeeklyTimeConfig({ ...weeklyTimeConfig, ...patch });
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Weekly View Settings</h1>
            <p className="text-sm text-muted-foreground mb-10">
                Configure how the weekly grid appears. Changes apply immediately.
            </p>

            <div className="space-y-8">
                {/* Visible Hours */}
                <div className="pb-6 border-b border-border">
                    <Label className="text-lg font-bold text-foreground leading-tight block mb-1">Visible hours</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        Set the default time range shown in the weekly grid.
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
                        <p className="text-sm text-muted-foreground">Row height interval for the weekly grid</p>
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

                {/* Preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                    </div>

                    {/* Mini weekly grid preview */}
                    <div className="flex gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="flex-1 text-center">
                                <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                                <div className="mt-1 space-y-px">
                                    {Array.from({ length: Math.min(Math.ceil((endHour - startHour) / hourInterval), 8) }, (_, i) => (
                                        <div
                                            key={i}
                                            className="h-3 rounded-sm bg-border/30 border border-border/20"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-3">
                        {(() => {
                            const fmtHour = (h: number) => {
                                const hour12 = h % 12 || 12;
                                return `${hour12}:00 ${h < 12 ? 'AM' : 'PM'}`;
                            };
                            return `${fmtHour(startHour)} — ${fmtHour(endHour)} · ${hourInterval}h intervals`;
                        })()}
                    </p>
                </div>
            </div>
        </div>
    );
};
