import React, { useState } from 'react';
import { Event, EventLog, useCalendar, PASTEL_COLORS } from '@/context/CalendarContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    X, Trash2, Calendar, Clock, Users, Video, Tag, FileText,
    History, ChevronDown, ChevronRight, Plus, Check, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EventDetailProps {
    event: Event;
    onClose: () => void;
    logs: EventLog[];
}

const EVENT_EMOJIS = ['📅', '🔥', '⚡', '💫', '🎨', '📝', '📃', '🎯', '🚀', '💡', '🎉', '🏃', '☕', '🍕', '📞', '✈️'];

export const EventDetail: React.FC<EventDetailProps> = ({ event, onClose, logs }) => {
    const { updateEvent, deleteEvent, categories, getCategoryColor } = useCalendar();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [newParticipantName, setNewParticipantName] = useState('');
    const [newParticipantEmail, setNewParticipantEmail] = useState('');

    const update = (field: Partial<Event>) => {
        updateEvent(event.id, field, 'event-page');
    };

    const handleDelete = () => {
        deleteEvent(event.id, 'event-page');
        onClose();
    };

    const addParticipant = () => {
        if (!newParticipantName.trim()) return;
        const current = event.participants || [];
        update({ participants: [...current, { name: newParticipantName.trim(), email: newParticipantEmail.trim() }] });
        setNewParticipantName('');
        setNewParticipantEmail('');
    };

    const removeParticipant = (idx: number) => {
        const current = event.participants || [];
        update({ participants: current.filter((_, i) => i !== idx) });
    };

    const startDate = format(new Date(event.startTime), 'yyyy-MM-dd');
    const startTime = format(new Date(event.startTime), 'HH:mm');
    const endDate = format(new Date(event.endTime), 'yyyy-MM-dd');
    const endTime = format(new Date(event.endTime), 'HH:mm');

    const handleDateTimeChange = (field: 'startTime' | 'endTime', date: string, time: string) => {
        const dt = new Date(`${date}T${time}`);
        if (!isNaN(dt.getTime())) update({ [field]: dt });
    };

    return (
        <div
            className="w-[420px] bg-background shadow-2xl border border-border rounded-xl ring-1 ring-black/5 flex flex-col"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
            {/* Header */}
            <header className="flex items-center justify-between p-4 pb-3 shrink-0 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-xl hover:scale-110 transition-transform cursor-pointer"
                        title="Change emoji"
                    >
                        {event.emoji || '📅'}
                    </button>
                    <h1 className="text-xl font-bold text-foreground">Event Details</h1>
                </div>
                <div className="flex items-center gap-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will remove the event from all calendar views.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                        <X className="w-5 h-5 text-foreground" />
                    </button>
                </div>
            </header>

            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div className="px-4 py-2 border-b border-border bg-muted/10">
                    <div className="flex flex-wrap gap-1">
                        {EVENT_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { update({ emoji }); setShowEmojiPicker(false); }}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-muted transition-colors",
                                    event.emoji === emoji && "bg-primary/10 ring-2 ring-primary"
                                )}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 pt-3">

                {/* Title */}
                <input
                    value={event.title}
                    onChange={e => update({ title: e.target.value })}
                    className="flex w-full rounded-md bg-background px-3 py-2 border-2 text-foreground font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
                    placeholder="Event title"
                />

                {/* Color swatches */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {PASTEL_COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={() => update({ color: c.value })}
                            className={cn(
                                "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                event.color === c.value ? "ring-2 ring-primary ring-offset-1" : ""
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" /> Description
                    </div>
                    <Textarea
                        value={event.description || ''}
                        onChange={e => update({ description: e.target.value })}
                        placeholder="Add a description..."
                        className="min-h-[70px] text-sm resize-none border-dashed"
                    />
                </div>

                {/* Date & Time */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" /> Date & Time
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={event.isAllDay}
                            onChange={e => update({ isAllDay: e.target.checked })}
                            className="rounded"
                        />
                        All day
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground">Start</span>
                            <div className="border border-border rounded-md px-2 py-1.5 bg-background">
                                <input type="date" value={startDate} onChange={e => handleDateTimeChange('startTime', e.target.value, startTime)} className="w-full text-xs bg-transparent focus:outline-none text-foreground" />
                            </div>
                            {!event.isAllDay && (
                                <div className="border border-border rounded-md px-2 py-1.5 bg-background">
                                    <input type="time" value={startTime} onChange={e => handleDateTimeChange('startTime', startDate, e.target.value)} className="w-full text-xs bg-transparent focus:outline-none text-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground">End</span>
                            <div className="border border-border rounded-md px-2 py-1.5 bg-background">
                                <input type="date" value={endDate} onChange={e => handleDateTimeChange('endTime', e.target.value, endTime)} className="w-full text-xs bg-transparent focus:outline-none text-foreground" />
                            </div>
                            {!event.isAllDay && (
                                <div className="border border-border rounded-md px-2 py-1.5 bg-background">
                                    <input type="time" value={endTime} onChange={e => handleDateTimeChange('endTime', endDate, e.target.value)} className="w-full text-xs bg-transparent focus:outline-none text-foreground" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="w-3.5 h-3.5" /> Category
                    </div>
                    <Select value={event.category || 'none'} onValueChange={v => update({ category: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
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

                {/* Recurrence */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> Recurrence
                    </div>
                    <Select value={event.recurrence || 'none'} onValueChange={v => update({ recurrence: v === 'none' ? undefined : v })}>
                        <SelectTrigger className="h-9 text-sm">
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

                {/* Video Call */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Video className="w-3.5 h-3.5" /> Video Call
                    </div>
                    <div className="border border-border rounded-md px-3 py-2 flex items-center gap-2 bg-background">
                        <input
                            value={event.videoCallLink || ''}
                            onChange={e => update({ videoCallLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className="flex-1 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>

                {/* Participants */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> Participants ({event.participants?.length || 0})
                    </div>
                    {event.participants && event.participants.length > 0 && (
                        <div className="space-y-1">
                            {event.participants.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-2 py-1.5 group">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-foreground truncate">{p.name}</div>
                                        {p.email && <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>}
                                    </div>
                                    <button onClick={() => removeParticipant(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-1.5">
                        <div className="border border-border rounded-md bg-background flex-1 overflow-hidden">
                            <input value={newParticipantName} onChange={e => setNewParticipantName(e.target.value)} placeholder="Name" className="w-full h-8 px-3 text-xs focus:outline-none bg-transparent" onKeyDown={e => e.key === 'Enter' && addParticipant()} />
                        </div>
                        <div className="border border-border rounded-md bg-background flex-1 overflow-hidden">
                            <input value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)} placeholder="Email" className="w-full h-8 px-3 text-xs focus:outline-none bg-transparent" onKeyDown={e => e.key === 'Enter' && addParticipant()} />
                        </div>
                        <button onClick={addParticipant} className="h-8 w-8 border border-border rounded-md flex items-center justify-center hover:bg-muted bg-background shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Activity Log */}
                <div className="space-y-2 pt-2 border-t border-border">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                        <History className="w-3.5 h-3.5" />
                        Activity Log ({logs.length})
                        {showLogs ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                    {showLogs && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground">No activity recorded.</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="flex items-start gap-2 text-[11px]">
                                        <span className={cn(
                                            "mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0",
                                            log.action === 'created' && "bg-green-500",
                                            log.action === 'updated' && "bg-blue-500",
                                            log.action === 'deleted' && "bg-red-500",
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium capitalize">{log.action}</span>
                                            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')} · via {log.source}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border shrink-0 bg-background rounded-b-xl">
                <button
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center rounded-lg text-sm font-semibold h-10 px-4 gap-2 bg-[#18181b] dark:bg-white hover:opacity-90 text-white dark:text-black transition-colors"
                >
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                    Save & Close
                </button>
            </div>
        </div>
    );
};
