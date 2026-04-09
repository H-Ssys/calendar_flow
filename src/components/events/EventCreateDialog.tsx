import React, { useState } from 'react';
import { useCalendar, PASTEL_COLORS } from '@/context/CalendarContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, addHours, startOfHour } from 'date-fns';

interface EventCreateDialogProps {
    open: boolean;
    onClose: () => void;
}

const EVENT_EMOJIS = ['📅', '🔥', '⚡', '💫', '🎨', '📝', '📃', '🎯', '🚀', '💡', '🎉', '🏃', '☕', '🍕', '📞', '✈️'];

// ── Event templates ─────────────────────────────────────────────────
const TEMPLATES = [
    { label: '🗓 Meeting', emoji: '📅', duration: 60, category: 'Work Plan' },
    { label: '🏃 Workout', emoji: '🏃', duration: 45, category: 'Fitness' },
    { label: '☕ Coffee Chat', emoji: '☕', duration: 30, category: 'Personal' },
    { label: '📞 Call', emoji: '📞', duration: 15, category: 'Work Plan' },
    { label: '🎉 Social', emoji: '🎉', duration: 120, category: 'Holiday' },
    { label: '🎯 Focus', emoji: '🎯', duration: 90, category: 'Project' },
];

export const EventCreateDialog: React.FC<EventCreateDialogProps> = ({ open, onClose }) => {
    const { addEvent, categories } = useCalendar();

    const defaultStart = startOfHour(addHours(new Date(), 1));
    const defaultEnd = addHours(defaultStart, 1);

    const [title, setTitle] = useState('');
    const [emoji, setEmoji] = useState('📅');
    const [color, setColor] = useState(PASTEL_COLORS[2].value); // Periwinkle
    const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState(format(defaultStart, 'HH:mm'));
    const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'));
    const [endTime, setEndTime] = useState(format(defaultEnd, 'HH:mm'));
    const [isAllDay, setIsAllDay] = useState(false);
    const [category, setCategory] = useState<string>('');
    const [description, setDescription] = useState('');
    const [recurrence, setRecurrence] = useState<string>('none');

    const reset = () => {
        const s = startOfHour(addHours(new Date(), 1));
        const e = addHours(s, 1);
        setTitle(''); setEmoji('📅'); setColor(PASTEL_COLORS[2].value);
        setStartDate(format(s, 'yyyy-MM-dd')); setStartTime(format(s, 'HH:mm'));
        setEndDate(format(e, 'yyyy-MM-dd')); setEndTime(format(e, 'HH:mm'));
        setIsAllDay(false); setCategory(''); setDescription(''); setRecurrence('none');
    };

    const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
        setEmoji(tpl.emoji);
        setCategory(tpl.category);
        const s = startOfHour(addHours(new Date(), 1));
        const e = addHours(s, tpl.duration / 60);
        setStartDate(format(s, 'yyyy-MM-dd')); setStartTime(format(s, 'HH:mm'));
        setEndDate(format(e, 'yyyy-MM-dd')); setEndTime(format(e, 'HH:mm'));
    };

    const handleCreate = () => {
        if (!title.trim()) return;
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

        addEvent({
            title: title.trim(),
            emoji,
            color,
            startTime: start,
            endTime: end,
            isAllDay,
            category: category || undefined,
            description: description || undefined,
            recurrence: recurrence === 'none' ? undefined : recurrence,
        }, 'event-page');

        reset();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">{emoji}</span>
                        Create New Event
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Templates */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Quick Templates</label>
                        <div className="flex flex-wrap gap-1.5">
                            {TEMPLATES.map(tpl => (
                                <button
                                    key={tpl.label}
                                    onClick={() => { applyTemplate(tpl); setTitle(tpl.label.substring(2).trim()); }}
                                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-colors"
                                >
                                    {tpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Title *</label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Event title"
                            autoFocus
                            className="font-medium"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                    </div>

                    {/* Emoji */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Emoji</label>
                        <div className="flex flex-wrap gap-1">
                            {EVENT_EMOJIS.map(e => (
                                <button
                                    key={e}
                                    onClick={() => setEmoji(e)}
                                    className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-muted",
                                        emoji === e && "bg-primary/10 ring-2 ring-primary"
                                    )}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <label className="text-[11px] font-medium text-muted-foreground">Date & Time</label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={e => setIsAllDay(e.target.checked)}
                                    className="rounded"
                                />
                                All day
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">Start</span>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
                                {!isAllDay && <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 text-xs" />}
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">End</span>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
                                {!isAllDay && <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 text-xs" />}
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Category</label>
                        <Select value={category || 'none'} onValueChange={v => setCategory(v === 'none' ? '' : v)}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="No category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No category</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.name} value={c.name}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Color */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PASTEL_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setColor(c.value)}
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                        color === c.value ? "border-foreground scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Recurrence */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Recurrence</label>
                        <Select value={recurrence} onValueChange={setRecurrence}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No recurrence</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Description (optional)</label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description..."
                            className="h-8 text-xs"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!title.trim()}>
                            Create Event
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
