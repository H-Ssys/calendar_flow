import * as React from "react";
import { Check, ChevronLeft, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, getDate } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface RecurrencePickerProps {
    value: string;
    onChange: (value: string) => void;
    date: Date;
    className?: string;
}

const RecurrencePicker = ({ value, onChange, date, className }: RecurrencePickerProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [view, setView] = React.useState<'main' | 'custom'>('main');

    // Custom state
    const [customFreq, setCustomFreq] = React.useState('WEEKLY');
    const [customInterval, setCustomInterval] = React.useState('1');
    const [selectedDays, setSelectedDays] = React.useState<number[]>([]);
    const [endsMode, setEndsMode] = React.useState<'NEVER' | 'ON_DATE' | 'AFTER'>('NEVER');
    const [endDate, setEndDate] = React.useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [occurrences, setOccurrences] = React.useState('13');

    // Initialize default selected day based on current date if empty
    React.useEffect(() => {
        if (selectedDays.length === 0 && date) {
            setSelectedDays([date.getDay()]);
        }
    }, [date]);

    // Helpers
    const dayName = format(date, 'EEEE');
    const dayOfMonth = getDate(date);
    const getWeekOfMonth = (d: Date) => Math.ceil(d.getDate() / 7);
    const nth = getWeekOfMonth(date);
    const nthStr = nth === 1 ? '1st' : nth === 2 ? '2nd' : nth === 3 ? '3rd' : '4th';

    const OPTIONS = [
        { label: "No repeat", value: "none" },
        { label: "Every day", value: "daily" },
        { label: `Every week on ${dayName}`, value: "weekly" },
        { label: `Every 2 weeks on ${dayName}`, value: "biweekly" },
        { label: `Every month on the ${nthStr} ${dayName}`, value: "monthly_nth" },
        { label: `Every month on the ${dayOfMonth}th`, value: "monthly_date" },
    ];

    const DAYS = [
        { label: 'S', value: 0 },
        { label: 'M', value: 1 },
        { label: 'T', value: 2 },
        { label: 'W', value: 3 },
        { label: 'T', value: 4 },
        { label: 'F', value: 5 },
        { label: 'S', value: 6 },
    ];

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            // Don't allow deselecting the only day
            if (selectedDays.length > 1) {
                setSelectedDays(selectedDays.filter(d => d !== dayIndex));
            }
        } else {
            setSelectedDays([...selectedDays, dayIndex].sort());
        }
    };

    const handleSelect = (val: string) => {
        if (val === 'custom') {
            setView('custom');
        } else {
            onChange(val);
            setIsOpen(false);
        }
    };

    const handleSaveCustom = () => {
        // Construct description
        const freqLabel = customFreq === 'DAILY' ? 'day(s)' : customFreq === 'WEEKLY' ? 'week(s)' : customFreq === 'MONTHLY' ? 'month(s)' : 'year(s)';
        let description = `Every ${customInterval} ${freqLabel}`;

        if (customFreq === 'WEEKLY') {
            const dayLabels = selectedDays.map(d => DAYS[d].label).join(', ');
            description += ` on ${dayLabels}`;
        }

        if (endsMode === 'ON_DATE') {
            description += ` until ${endDate}`;
        } else if (endsMode === 'AFTER') {
            description += `, ${occurrences} times`;
        }

        onChange(description);
        setIsOpen(false);
        setView('main');
    };

    const displayValue = () => {
        const option = OPTIONS.find(o => o.value === value);
        if (option) return option.label;
        if (value === 'none') return 'Repeat';
        return value;
    };

    return (
        <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setView('main'); }}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-2 w-full p-3 bg-card border border-input rounded-lg text-muted-foreground hover:bg-muted transition-colors text-left",
                        value !== 'none' && "text-primary border-primary bg-primary/5",
                        className
                    )}
                >
                    <Repeat className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-sm truncate">
                        {displayValue()}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
                {view === 'main' ? (
                    <div className="space-y-1">
                        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b mb-1">
                            Set recurrence...
                        </div>
                        {OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={cn(
                                    "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left",
                                    value === option.value && "bg-accent/50"
                                )}
                            >
                                {option.label}
                                {value === option.value && <Check className="w-4 h-4 text-primary" />}
                            </button>
                        ))}
                        <button
                            onClick={() => handleSelect('custom')}
                            className="w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left font-medium"
                        >
                            Custom...
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 p-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 -ml-2" onClick={() => setView('main')}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-semibold text-sm">Custom Recurrence</span>
                        </div>

                        {/* Frequency & Interval */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm min-w-[80px]">Repeat every</span>
                            <Input
                                type="number"
                                min="1"
                                value={customInterval}
                                onChange={(e) => setCustomInterval(e.target.value)}
                                className="w-16 h-8"
                            />
                            <Select value={customFreq} onValueChange={setCustomFreq}>
                                <SelectTrigger className="h-8 flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAILY">day</SelectItem>
                                    <SelectItem value="WEEKLY">week</SelectItem>
                                    <SelectItem value="MONTHLY">month</SelectItem>
                                    <SelectItem value="YEARLY">year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Weekly Days Selector */}
                        {customFreq === 'WEEKLY' && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Repeat on</Label>
                                <div className="flex justify-between">
                                    {DAYS.map((day) => {
                                        const isSelected = selectedDays.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full text-xs font-medium transition-colors border",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-muted text-muted-foreground border-transparent hover:border-border"
                                                )}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ends Configuration */}
                        <div className="space-y-3 pt-2 border-t">
                            <Label className="text-sm font-semibold">Ends</Label>
                            <RadioGroup value={endsMode} onValueChange={(v: any) => setEndsMode(v)} className="gap-3">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="NEVER" id="never" />
                                    <Label htmlFor="never">Never</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="ON_DATE" id="on_date" />
                                    <Label htmlFor="on_date" className="w-16">On</Label>
                                    <Input
                                        type="date"
                                        className="h-8 flex-1"
                                        value={endDate}
                                        onChange={(e) => { setEndDate(e.target.value); setEndsMode('ON_DATE'); }}
                                        disabled={endsMode !== 'ON_DATE'}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="AFTER" id="after" />
                                    <Label htmlFor="after" className="w-16">After</Label>
                                    <div className="flex items-center gap-2 flex-1">
                                        <Input
                                            type="number"
                                            min="1"
                                            className="h-8 w-16"
                                            value={occurrences}
                                            onChange={(e) => { setOccurrences(e.target.value); setEndsMode('AFTER'); }}
                                            disabled={endsMode !== 'AFTER'}
                                        />
                                        <span className="text-sm text-muted-foreground">occurrences</span>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button size="sm" onClick={handleSaveCustom} className="w-full">Done</Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default RecurrencePicker;
