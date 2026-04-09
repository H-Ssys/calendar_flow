import React from 'react';
import { Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

const COLOR_PRESETS = [
    { name: 'Blue', value: '#EFF6FF' },
    { name: 'Purple', value: '#F5F3FF' },
    { name: 'Green', value: '#F0FDF4' },
    { name: 'Amber', value: '#FFFBEB' },
    { name: 'Rose', value: '#FFF1F2' },
    { name: 'Slate', value: '#F8FAFC' },
    { name: 'Cyan', value: '#ECFEFF' },
    { name: 'None', value: 'transparent' },
];

export const MonthlySettings: React.FC = () => {
    const { monthlyViewConfig, setMonthlyViewConfig } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Monthly View Settings</h1>
            <p className="text-sm text-muted-foreground mb-8">Customize the appearance of the monthly calendar grid.</p>

            {/* Row Highlight Color */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-foreground mb-2">
                    <Palette className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Row Highlight</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-4">
                    Choose the background color used to highlight the current week row in the monthly view.
                </p>

                <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Highlight Color</Label>
                    <div className="grid grid-cols-4 gap-3">
                        {COLOR_PRESETS.map((color) => (
                            <button
                                key={color.value}
                                className={`
                                    relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                                    ${monthlyViewConfig.rowHighlightColor === color.value
                                        ? 'border-primary ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/40'
                                    }
                                `}
                                onClick={() => setMonthlyViewConfig({ ...monthlyViewConfig, rowHighlightColor: color.value })}
                            >
                                <div
                                    className="w-6 h-6 rounded-md border border-border/50 shrink-0"
                                    style={{ backgroundColor: color.value === 'transparent' ? '#ffffff' : color.value }}
                                />
                                <span className="text-sm font-medium text-foreground">{color.name}</span>
                                {monthlyViewConfig.rowHighlightColor === color.value && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Preview</Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                        {['Week 1', 'Week 2 (current)', 'Week 3'].map((week, i) => (
                            <div
                                key={week}
                                className={`px-4 py-3 text-sm border-b last:border-b-0 border-border ${i === 1 ? 'font-medium' : 'text-muted-foreground'}`}
                                style={i === 1 ? { backgroundColor: monthlyViewConfig.rowHighlightColor } : {}}
                            >
                                {week}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
