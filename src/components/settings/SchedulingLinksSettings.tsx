import React from 'react';
import { Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

/* ── Highlight color presets ──────────────────────────────────────── */
const HIGHLIGHT_COLORS = [
    { value: '#DBEAFE', label: 'Blue' },
    { value: '#FDE68A', label: 'Amber' },
    { value: '#A7F3D0', label: 'Green' },
    { value: '#FBCFE8', label: 'Pink' },
    { value: '#DDD6FE', label: 'Purple' },
    { value: '#FED7AA', label: 'Orange' },
    { value: '#BAE6FD', label: 'Sky' },
    { value: '#FEF08A', label: 'Yellow' },
];

/* ── Component ────────────────────────────────────────────────────── */
export const SchedulingLinksSettings: React.FC = () => {
    const { yearlyViewConfig, setYearlyViewConfig } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Yearly View Settings</h1>
            <p className="text-sm text-muted-foreground mb-10">
                Customize how the yearly overview appears. Changes apply immediately.
            </p>

            <div className="space-y-8">
                {/* Month highlight color */}
                <div className="pb-6 border-b border-border">
                    <Label className="text-lg font-bold text-foreground leading-tight block mb-1">
                        Current month highlight
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        The background color used to highlight the current month in the yearly overview.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {HIGHLIGHT_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setYearlyViewConfig({ ...yearlyViewConfig, monthHighlightColor: c.value })}
                                className={`group relative w-12 h-12 rounded-xl border-2 transition-all
                                    ${yearlyViewConfig.monthHighlightColor === c.value
                                        ? 'border-primary ring-2 ring-primary/20 scale-110'
                                        : 'border-border hover:border-primary/40 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: c.value }}
                                title={c.label}
                            >
                                {yearlyViewConfig.monthHighlightColor === c.value && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
                    </div>

                    {/* Mini year grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
                            const currentMonthIndex = new Date().getMonth();
                            const isCurrent = i === currentMonthIndex;
                            return (
                                <div
                                    key={month}
                                    className={`px-3 py-2.5 rounded-lg text-center text-xs font-medium transition-colors
                                        ${isCurrent ? 'text-foreground font-bold' : 'text-muted-foreground'}`}
                                    style={{
                                        backgroundColor: isCurrent ? yearlyViewConfig.monthHighlightColor : 'transparent',
                                    }}
                                >
                                    {month}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
