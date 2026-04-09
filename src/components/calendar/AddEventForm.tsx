import React, { useState } from 'react';
import {
    X, UserPlus, Calendar, Clock, Repeat, Video, Trash2, RefreshCw, Check, Pencil,
    CalendarPlus, CalendarDays, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AddParticipantCard from './AddParticipantCard';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendar, Event, PASTEL_COLORS, DEFAULT_CATEGORY_COLOR } from '@/context/CalendarContext';
import { parse, differenceInMinutes, format, getDay, addDays, addWeeks, addHours, startOfWeek } from 'date-fns';
import RecurrencePicker from './RecurrencePicker';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface AddEventFormProps {
    onClose?: () => void;
    onSave?: (data: EventData) => void;
    onDelete?: () => void;
    onReschedule?: () => void;
    initialEvent?: Event | null;
}

interface EventData {
    title: string;
    date: string;
    fromTime: string;
    toTime: string;
    notes: string;
    participants: Array<{ name: string; email: string }>;
}

export const AddEventForm: React.FC<AddEventFormProps> = ({
    onClose,
    onSave,
    onDelete,
    onReschedule,
    initialEvent
}) => {
    const { addEvent, updateEvent, categories, addCategory, currentDate } = useCalendar();

    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [rescheduleView, setRescheduleView] = useState<'menu' | 'on' | 'time'>('menu');

    const handlePostpone = () => {
        const currentDateObj = new Date(date);
        const newDate = addDays(currentDateObj, 1);
        setDate(format(newDate, 'yyyy-MM-dd'));
        setIsRescheduleOpen(false);
        // Auto-save if editing existing event
        if (initialEvent) {
            const newStart = addDays(new Date(initialEvent.startTime), 1);
            const newEnd = addDays(new Date(initialEvent.endTime), 1);
            updateEvent(initialEvent.id, { startTime: newStart, endTime: newEnd });
        }
    };

    const handleNextWeek = () => {
        const currentDateObj = new Date(date);
        const newDate = addWeeks(currentDateObj, 1);
        setDate(format(newDate, 'yyyy-MM-dd'));
        setIsRescheduleOpen(false);
        // Auto-save if editing existing event
        if (initialEvent) {
            const newStart = addWeeks(new Date(initialEvent.startTime), 1);
            const newEnd = addWeeks(new Date(initialEvent.endTime), 1);
            updateEvent(initialEvent.id, { startTime: newStart, endTime: newEnd });
        }
    };

    const handleSameDay = () => {
        setRescheduleView('time');
    };

    const handleAfter = () => {
        const currentDateObj = new Date(date);
        const newDate = addDays(currentDateObj, 1);
        setDate(format(newDate, 'yyyy-MM-dd'));
        setIsRescheduleOpen(false);
        // Auto-save if editing existing event
        if (initialEvent) {
            const newStart = addDays(new Date(initialEvent.startTime), 1);
            const newEnd = addDays(new Date(initialEvent.endTime), 1);
            updateEvent(initialEvent.id, { startTime: newStart, endTime: newEnd });
        }
    };

    const getInitialTimes = () => {
        if (initialEvent?.startTime && initialEvent?.endTime) {
            return {
                from: format(new Date(initialEvent.startTime), 'HH:mm'),
                to: format(new Date(initialEvent.endTime), 'HH:mm'),
            };
        }
        return { from: '08:30', to: '09:30' };
    };

    const initialTimes = getInitialTimes();

    const [eventTitle, setEventTitle] = useState(initialEvent?.title || 'Daily Standup 🔥');
    const [date, setDate] = useState(() => {
        if (initialEvent?.startTime) return format(new Date(initialEvent.startTime), 'yyyy-MM-dd');
        return format(new Date(), 'yyyy-MM-dd');
    });
    const [fromTime, setFromTime] = useState(initialTimes.from);
    const [toTime, setToTime] = useState(initialTimes.to);
    const [notes, setNotes] = useState(initialEvent?.description || '');
    const [isDateTimeExpanded, setIsDateTimeExpanded] = useState(true);
    const [isAddingParticipant, setIsAddingParticipant] = useState(false);
    const [recurrence, setRecurrence] = useState(initialEvent?.recurrence || 'none');
    const [videoLink, setVideoLink] = useState(initialEvent?.videoCallLink || '');
    const [selectedCategory, setSelectedCategory] = useState(initialEvent?.category || 'Work Plan');
    const [participants, setParticipants] = useState<Array<{ name: string; email: string }>>(initialEvent?.participants || []);

    // New state for Edit Mode
    const [isEditing, setIsEditing] = useState(!initialEvent);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState(PASTEL_COLORS[0].value);
    const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) return;

        // Ad-hoc category — NOT persisted to settings categories
        // The category name + color will be stored directly on the event
        setSelectedCategory(newCategoryName);
        setNewCategoryName('');
        setIsCustomCategoryOpen(false);
    };

    const handleAddParticipant = (name: string, email: string) => {
        setParticipants([...participants, { name, email }]);
        setIsAddingParticipant(false);
    };

    const removeParticipant = (email: string) => {
        setParticipants(participants.filter(p => p.email !== email));
    };

    const handleSave = () => {
        // Parse times to calculate grid position
        const baseDate = new Date();
        const start = parse(fromTime, 'HH:mm', baseDate);
        const end = parse(toTime, 'HH:mm', baseDate);

        // Calculate duration in hours
        const diffMinutes = differenceInMinutes(end, start);
        const duration = diffMinutes / 60;

        // Calculate start hour index (0 = 6 AM)
        const startHourIndex = (start.getHours() + (start.getMinutes() / 60)) - 6;

        // Calculate day index (0 = Monday, 6 = Sunday)
        const selectedDate = new Date(date);
        const jsDay = getDay(selectedDate);
        const dayIndex = (jsDay + 6) % 7;

        // Build proper startTime/endTime
        const [startH, startM] = fromTime.split(':').map(Number);
        const [endH, endM] = toTime.split(':').map(Number);
        const startTime = new Date(selectedDate);
        startTime.setHours(startH, startM, 0, 0);
        const endTime = new Date(selectedDate);
        endTime.setHours(endH, endM, 0, 0);

        // Match color to selected category — fall back to custom color picker or default
        const selectedCatObj = categories.find(c => c.name === selectedCategory);
        const categoryColor = selectedCatObj?.color || newCategoryColor || DEFAULT_CATEGORY_COLOR;
        const categoryColorClass = '';

        const emojis = ['📅', '⚡', '🔥', '📝'];
        const randomEmoji = initialEvent?.emoji || emojis[Math.floor(Math.random() * emojis.length)];

        const eventData = {
            title: eventTitle,
            startTime,
            endTime,
            isAllDay: false,
            emoji: randomEmoji,
            color: categoryColor,
            participants,
            description: notes,
            recurrence,
            videoCallLink: videoLink,
            category: selectedCategory,
        };

        if (initialEvent) {
            updateEvent(initialEvent.id, eventData);
        } else {
            addEvent(eventData);
        }

        onClose?.();
    };

    return (
        <div className="max-w-[400px] w-full bg-card shadow-lg border-l border-border p-3 h-full overflow-y-auto">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-foreground">
                        {initialEvent ? (isEditing ? 'Edit Event' : 'Event Details') : 'Add Event'}
                    </h1>
                </div>

                <div className="flex items-center gap-1">
                    {initialEvent && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="Edit Event"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5 text-foreground" />
                    </button>
                </div>
            </header>

            {/* Form */}
            <form className="mt-2 space-y-2" onSubmit={(e) => e.preventDefault()}>
                {/* Event Title */}
                <Input
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Event title"
                    className="border-2 border-primary focus-visible:ring-primary h-9 text-base font-semibold disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled={!isEditing}
                />

                {/* Add Participant */}
                <div className="space-y-3">
                    <div className="space-y-3">
                        <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setIsAddingParticipant(!isAddingParticipant)}
                            className={`flex items-center gap-2 w-full p-2 bg-card border border-input rounded-lg text-muted-foreground hover:bg-muted transition-colors ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <UserPlus className="w-5 h-5 text-muted-foreground" />
                            <span className="flex-1 text-left text-sm font-medium text-foreground">Add Participant</span>
                        </button>

                        {isAddingParticipant && isEditing && (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <AddParticipantCard
                                    onAdd={handleAddParticipant}
                                    className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10"
                                />
                            </div>
                        )}

                        {participants.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {participants.map((p) => (
                                    <Badge
                                        key={p.email}
                                        variant="secondary"
                                        className="px-3 py-1.5 flex items-center gap-2 group hover:bg-muted"
                                    >
                                        <span className="text-xs font-semibold">{p.name}</span>
                                        {isEditing && (
                                            <button
                                                onClick={() => removeParticipant(p.email)}
                                                className="hover:text-destructive text-muted-foreground"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Date and Time Section */}
                    <div className="bg-card border border-input rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsDateTimeExpanded(!isDateTimeExpanded)}
                            className="flex items-center gap-2 w-full p-2 text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <span className="flex-1 text-left text-sm font-medium text-foreground">Date and Time</span>
                        </button>

                        {isDateTimeExpanded && (
                            <div className={`px-3 pb-3 space-y-3 border-t border-input ${!isEditing ? 'opacity-70 pointer-events-none' : ''}`}>
                                {/* Date Row */}
                                <div className="flex items-center gap-2 pt-3">
                                    <label className="w-12 text-sm text-muted-foreground">On</label>
                                    <div className="flex-1 flex items-center gap-2 p-2 bg-card border border-input rounded-lg">
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-foreground outline-none uppercase disabled:cursor-not-allowed"
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>

                                {/* From Time Row */}
                                <div className="flex items-center gap-2">
                                    <label className="w-12 text-sm text-muted-foreground">From</label>
                                    <div className="flex-1 flex items-center gap-2 p-2 bg-card border border-input rounded-lg">
                                        <input
                                            type="time"
                                            value={fromTime}
                                            onChange={(e) => setFromTime(e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-foreground outline-none disabled:cursor-not-allowed"
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>

                                {/* To Time Row */}
                                <div className="flex items-center gap-2">
                                    <label className="w-12 text-sm text-muted-foreground">To</label>
                                    <div className="flex-1 flex items-center gap-2 p-2 bg-card border border-input rounded-lg">
                                        <input
                                            type="time"
                                            value={toTime}
                                            onChange={(e) => setToTime(e.target.value)}
                                            className="flex-1 bg-transparent text-sm text-foreground outline-none disabled:cursor-not-allowed"
                                            disabled={!isEditing}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Repeat Option */}
                    <div className={`w-full ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                        <RecurrencePicker
                            value={recurrence}
                            onChange={setRecurrence}
                            date={new Date(date)}
                        />
                    </div>

                    {/* Video Call Option */}
                    <Popover>
                        <PopoverTrigger asChild disabled={!isEditing}>
                            <button
                                type="button"
                                disabled={!isEditing}
                                className={`flex items-center gap-2 w-full p-2 bg-card border border-input rounded-lg transition-colors ${videoLink ? 'text-primary' : 'text-muted-foreground'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-muted'}`}
                            >
                                <Video className="w-5 h-5" />
                                <span className="flex-1 text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                    {videoLink || "Add or Generate Video Call"}
                                </span>
                                {videoLink ? <Check className="w-4 h-4" /> : <ChevronIcon />}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3" align="start">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Video Call Link</h4>
                                <Input
                                    placeholder="https://meet.google.com/..."
                                    value={videoLink}
                                    onChange={(e) => setVideoLink(e.target.value)}
                                />
                                {videoLink && (
                                    <Button size="sm" variant="secondary" className="w-full" onClick={() => setVideoLink('')}>
                                        Remove Link
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Calendar Option */}
                    <div className={`w-full ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                        {/* Custom Category Creator */}
                        {isCustomCategoryOpen ? (
                            <div className="bg-muted/30 p-3 rounded-lg border border-primary/20 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-foreground">New Category</span>
                                    <button onClick={() => setIsCustomCategoryOpen(false)} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <Input
                                    placeholder="Category Name"
                                    className="bg-card h-9"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                                <div className="flex gap-2 flex-wrap">
                                    {PASTEL_COLORS.map((col) => (
                                        <button
                                            key={col.name}
                                            type="button"
                                            onClick={() => setNewCategoryColor(col.value)}
                                            className={`w-6 h-6 rounded-full border border-black/10 transition-transform ${newCategoryColor === col.value ? 'ring-2 ring-primary scale-110' : ''}`}
                                            style={{ backgroundColor: col.value }}
                                            title={col.name}
                                        />
                                    ))}
                                </div>
                                <Button size="sm" onClick={handleCreateCategory} className="w-full mt-2" disabled={!newCategoryName.trim()}>
                                    Add Category
                                </Button>
                            </div>
                        ) : (
                            <Select value={selectedCategory} onValueChange={(val) => {
                                if (val === 'custom_action') {
                                    setIsCustomCategoryOpen(true);
                                } else {
                                    setSelectedCategory(val);
                                }
                            }} disabled={!isEditing}>
                                <SelectTrigger className="w-full p-2 h-auto bg-card border-input hover:bg-muted text-muted-foreground flex gap-2 justify-start shadow-none focus:ring-0">
                                    <Calendar className="w-5 h-5 shrink-0" />
                                    <span className="flex-1 text-left">
                                        <SelectValue placeholder="Set calendar" />
                                    </span>
                                </SelectTrigger>
                                <SelectContent position="popper" className="max-h-[300px]">
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.name} value={cat.name}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full border border-black/10"
                                                    style={{ backgroundColor: cat.color }}
                                                ></div>
                                                {cat.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <div className="p-1 border-t border-border mt-1">
                                        <SelectItem value="custom_action" className="font-semibold text-primary cursor-pointer">
                                            + Add Custom...
                                        </SelectItem>
                                    </div>
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                </div>

                {/* Notes */}
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="min-h-[80px] bg-muted/30 resize-none disabled:opacity-100 disabled:cursor-not-allowed"
                    disabled={!isEditing}
                />
            </form>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onDelete}
                    className="shrink-0"
                >
                    <Trash2 className="w-[18px] h-[18px] text-destructive" />
                </Button>

                {initialEvent && (
                    <Popover open={isRescheduleOpen} onOpenChange={(open) => {
                        setIsRescheduleOpen(open);
                        if (!open) setRescheduleView('menu'); // Reset view on close
                    }}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2 bg-background hover:bg-accent text-accent-foreground"
                            >
                                <RefreshCw className="w-[18px] h-[18px]" />
                                Reschedule
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                            {rescheduleView === 'menu' ? (
                                <>
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={handlePostpone}
                                            className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                        >
                                            <div className="mt-0.5 text-teal-600 group-hover:text-teal-700">
                                                <CalendarPlus className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground">Postpone</div>
                                                <div className="text-xs text-muted-foreground">Same time - Next day</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={handleNextWeek}
                                            className="flex items-start gap-3 w-full p-2 hover:bg-muted rounded-lg transition-colors text-left group"
                                        >
                                            <div className="mt-0.5 text-purple-600 group-hover:text-purple-700">
                                                <CalendarDays className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground">Next week</div>
                                                <div className="text-xs text-muted-foreground">Same time - Next week</div>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="h-[1px] bg-border mx-2 my-1" />

                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={handleSameDay}
                                            className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors text-left text-sm font-medium"
                                        >
                                            <span>Same-Day Reschedule</span>
                                            <span className="text-xs text-muted-foreground font-normal">Next 1 hour</span>
                                        </button>
                                        <button
                                            onClick={handleAfter}
                                            className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors text-left text-sm font-medium"
                                        >
                                            <span>After</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => setRescheduleView('on')}
                                            className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg transition-colors text-left text-sm font-medium"
                                        >
                                            <span>On</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                </>
                            ) : rescheduleView === 'time' ? (
                                <div className="p-2 space-y-3">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <button
                                            onClick={() => setRescheduleView('menu')}
                                            className="p-1 hover:bg-muted rounded-md transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-semibold">Select Time</span>
                                        <div className="w-6" />
                                    </div>
                                    <div className="space-y-3 px-2">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                                            <Input
                                                type="time"
                                                value={fromTime}
                                                onChange={(e) => setFromTime(e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">End Time</label>
                                            <Input
                                                type="time"
                                                value={toTime}
                                                onChange={(e) => setToTime(e.target.value)}
                                                className="h-8"
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => {
                                                setIsRescheduleOpen(false);
                                                setRescheduleView('menu');
                                            }}
                                        >
                                            Done
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2">
                                    <div className="flex items-center justify-between mb-2 px-2">
                                        <button
                                            onClick={() => setRescheduleView('menu')}
                                            className="p-1 hover:bg-muted rounded-md transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-semibold">Select Date</span>
                                        <div className="w-6" /> {/* Spacer */}
                                    </div>
                                    <CalendarComponent
                                        mode="single"
                                        selected={new Date(date)}
                                        onSelect={(day) => {
                                            if (day) {
                                                setDate(format(day, 'yyyy-MM-dd'));
                                                setIsRescheduleOpen(false);
                                                setRescheduleView('menu');
                                            }
                                        }}
                                        initialFocus
                                    />
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                )}

                {isEditing && (
                    <Button
                        onClick={handleSave}
                        className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground animate-in fade-in"
                    >
                        <Check className="w-[18px] h-[18px]" />
                        {initialEvent ? 'Update Event' : 'Save'}
                    </Button>
                )}
            </div>
        </div>
    );
};

const ChevronIcon = () => (
    <svg
        className="w-5 h-5"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M7.5 15L12.5 10L7.5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default AddEventForm;
