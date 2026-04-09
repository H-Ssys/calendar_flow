import React from 'react';
import { Palette } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

/* ── Highlight color presets ──────────────────────────────────────── */
const HIGHLIGHT_COLORS = [
    { value: '#EFF6FF', label: 'Blue Light' },
    { value: '#FEF3C7', label: 'Amber Light' },
    { value: '#ECFDF5', label: 'Green Light' },
    { value: '#FDF2F8', label: 'Pink Light' },
    { value: '#F5F3FF', label: 'Purple Light' },
    { value: '#FFF7ED', label: 'Orange Light' },
    { value: '#F0F9FF', label: 'Sky Light' },
    { value: '#FEFCE8', label: 'Yellow Light' },
];

/* ── Component ────────────────────────────────────────────────────── */
export const FocusGuardSettings: React.FC = () => {
    const { monthlyViewConfig, setMonthlyViewConfig } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Monthly View Settings</h1>
            <p className="text-sm text-muted-foreground mb-10">
                Customize how the monthly calendar appears. Changes apply immediately.
            </p>

            <div className="space-y-8">
                {/* Row highlight color */}
                <div className="pb-6 border-b border-border">
                    <Label className="text-lg font-bold text-foreground leading-tight block mb-1">
                        Current week highlight
                    </Label>
                    <p className="text-sm text-muted-foreground mb-4">
                        The background color used to highlight the current week row in the monthly grid.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {HIGHLIGHT_COLORS.map(c => (
                            <button
                                key={c.value}
                                onClick={() => setMonthlyViewConfig({ ...monthlyViewConfig, rowHighlightColor: c.value })}
                                className={`group relative w-12 h-12 rounded-xl border-2 transition-all
                                    ${monthlyViewConfig.rowHighlightColor === c.value
                                        ? 'border-primary ring-2 ring-primary/20 scale-110'
                                        : 'border-border hover:border-primary/40 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: c.value }}
                                title={c.label}
                            >
                                {monthlyViewConfig.rowHighlightColor === c.value && (
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

                    {/* Mini month grid */}
                    <div className="space-y-1">
                        {['Week 1', 'Week 2', 'Current', 'Week 4', 'Week 5'].map((label, i) => (
                            <div
                                key={label}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                                style={{
                                    backgroundColor: i === 2 ? monthlyViewConfig.rowHighlightColor : 'transparent',
                                }}
                            >
                                <span className="text-[10px] font-medium text-muted-foreground w-14">{label}</span>
                                <div className="flex-1 flex gap-1">
                                    {Array.from({ length: 7 }, (_, j) => (
                                        <div
                                            key={j}
                                            className={`flex-1 h-5 rounded text-[8px] flex items-center justify-center font-medium
                                                ${i === 2 ? 'text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {i * 7 + j + 1 <= 31 ? i * 7 + j + 1 : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
