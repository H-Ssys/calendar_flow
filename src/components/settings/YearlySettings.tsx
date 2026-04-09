import React from 'react';
import { Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

const COLOR_PRESETS = [
    { name: 'Blue', value: '#DBEAFE' },
    { name: 'Purple', value: '#EDE9FE' },
    { name: 'Green', value: '#DCFCE7' },
    { name: 'Amber', value: '#FEF3C7' },
    { name: 'Rose', value: '#FFE4E6' },
    { name: 'Slate', value: '#F1F5F9' },
    { name: 'Cyan', value: '#CFFAFE' },
    { name: 'None', value: 'transparent' },
];

export const YearlySettings: React.FC = () => {
    const { yearlyViewConfig, setYearlyViewConfig } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Yearly View Settings</h1>
            <p className="text-sm text-muted-foreground mb-8">Customize the appearance of the yearly calendar overview.</p>

            {/* Month Highlight Color */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-foreground mb-2">
                    <Palette className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Month Highlight</h3>
                </div>
                <p className="text-sm text-muted-foreground -mt-4">
                    Choose the background color used to highlight the current or selected month in the yearly overview.
                </p>

                <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-3 block">Highlight Color</Label>
                    <div className="grid grid-cols-4 gap-3">
                        {COLOR_PRESETS.map((color) => (
                            <button
                                key={color.value}
                                className={`
                                    relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                                    ${yearlyViewConfig.monthHighlightColor === color.value
                                        ? 'border-primary ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/40'
                                    }
                                `}
                                onClick={() => setYearlyViewConfig({ ...yearlyViewConfig, monthHighlightColor: color.value })}
                            >
                                <div
                                    className="w-6 h-6 rounded-md border border-border/50 shrink-0"
                                    style={{ backgroundColor: color.value === 'transparent' ? '#ffffff' : color.value }}
                                />
                                <span className="text-sm font-medium text-foreground">{color.name}</span>
                                {yearlyViewConfig.monthHighlightColor === color.value && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Preview</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {['Jan', 'Feb (current)', 'Mar', 'Apr'].map((month, i) => (
                            <div
                                key={month}
                                className={`px-3 py-4 text-sm text-center rounded-lg border border-border ${i === 1 ? 'font-medium' : 'text-muted-foreground'}`}
                                style={i === 1 ? { backgroundColor: yearlyViewConfig.monthHighlightColor } : {}}
                            >
                                {month}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
