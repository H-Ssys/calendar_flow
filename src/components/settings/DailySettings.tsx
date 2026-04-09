import React from 'react';
import { Clock, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCalendar } from '@/context/CalendarContext';

// Generate hour options for selects
const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, '0')}:00`,
}));

const INTERVAL_OPTIONS = [
    { value: '1', label: '1 hour' },
    { value: '2', label: '2 hours' },
    { value: '3', label: '3 hours' },
];

export const DailySettings: React.FC = () => {
    const {
        dailyTimeConfig,
        setDailyTimeConfig,
        dailyViewVariant,
        setDailyViewVariant,
    } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Daily View Settings</h1>
            <p className="text-sm text-muted-foreground mb-8">Configure the time grid and default view for the daily calendar.</p>

            {/* Time Grid Configuration */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 mb-8">
                <div className="flex items-center gap-2 text-foreground mb-2">
                    <Clock className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Time Grid</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-4">Set the visible hours and time interval for the daily timeline view.</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Start Time */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Start Time</Label>
                        <Select
                            value={dailyTimeConfig.startHour.toString()}
                            onValueChange={(val) => setDailyTimeConfig({ ...dailyTimeConfig, startHour: parseInt(val) })}
                        >
                            <SelectTrigger className="w-full h-10 bg-muted/30 border-border text-sm font-medium">
                                <SelectValue placeholder="Start hour" />
                            </SelectTrigger>
                            <SelectContent>
                                {HOUR_OPTIONS.filter(h => parseInt(h.value) < dailyTimeConfig.endHour).map(h => (
                                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* End Time */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">End Time</Label>
                        <Select
                            value={dailyTimeConfig.endHour.toString()}
                            onValueChange={(val) => setDailyTimeConfig({ ...dailyTimeConfig, endHour: parseInt(val) })}
                        >
                            <SelectTrigger className="w-full h-10 bg-muted/30 border-border text-sm font-medium">
                                <SelectValue placeholder="End hour" />
                            </SelectTrigger>
                            <SelectContent>
                                {HOUR_OPTIONS.filter(h => parseInt(h.value) > dailyTimeConfig.startHour).map(h => (
                                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Time Interval */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Time Interval</Label>
                        <Select
                            value={dailyTimeConfig.hourInterval.toString()}
                            onValueChange={(val) => setDailyTimeConfig({ ...dailyTimeConfig, hourInterval: parseInt(val) })}
                        >
                            <SelectTrigger className="w-full h-10 bg-muted/30 border-border text-sm font-medium">
                                <SelectValue placeholder="Interval" />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVAL_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Example label */}
                <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border/50">
                    <span className="font-medium">Preview:</span>{' '}
                    {dailyTimeConfig.startHour.toString().padStart(2, '0')}:00 → {dailyTimeConfig.endHour.toString().padStart(2, '0')}:00, {dailyTimeConfig.hourInterval}h intervals
                    <span className="text-xs ml-2 opacity-60">
                        (e.g. {dailyTimeConfig.startHour.toString().padStart(2, '0')}:00–{(dailyTimeConfig.startHour + dailyTimeConfig.hourInterval).toString().padStart(2, '0')}:00 per row)
                    </span>
                </div>
            </div>

            {/* Default View Toggle */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-foreground mb-2">
                    <Eye className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Default View</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-2">Choose which view to show by default when switching to the daily view.</p>

                <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-border/50">
                    <div>
                        <span className="text-sm font-medium text-foreground">
                            {dailyViewVariant === 'journal' ? 'Journal (PDAC)' : 'Timeline'}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {dailyViewVariant === 'journal'
                                ? 'Plan-Do-Act-Check journaling with time slots'
                                : 'Standard timeline with hour-by-hour events'
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Timeline</span>
                        <Switch
                            checked={dailyViewVariant === 'journal'}
                            onCheckedChange={(checked) => setDailyViewVariant(checked ? 'journal' : 'timeline')}
                        />
                        <span className="text-xs text-muted-foreground">Journal</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
