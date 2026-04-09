import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendar } from '@/context/CalendarContext';

export const MenuBarSettings: React.FC = () => {
    const { menuBarConfig, setMenuBarConfig } = useCalendar();

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-8 text-foreground">Menu Bar Settings</h1>

            <div className="space-y-8">
                {/* Menu bar toggle */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-lg font-bold text-foreground leading-tight block">Menu bar</Label>
                        <p className="text-sm text-muted-foreground">Shows upcoming meetings in the menu bar</p>
                    </div>
                    <Switch
                        checked={menuBarConfig.enabled}
                        onCheckedChange={(checked) => setMenuBarConfig({ ...menuBarConfig, enabled: checked })}
                    />
                </div>

                {/* Event to include select */}
                <div className="flex items-center justify-between pb-6 border-b border-border">
                    <div className="space-y-1">
                        <Label className="text-lg font-bold text-foreground leading-tight block">Event to include</Label>
                        <p className="text-sm text-muted-foreground">Select days to show events for</p>
                    </div>
                    <Select
                        value={menuBarConfig.eventPeriod}
                        onValueChange={(val) => setMenuBarConfig({ ...menuBarConfig, eventPeriod: val as 'today' | 'tomorrow' | 'week' })}
                    >
                        <SelectTrigger className="w-[140px] bg-background border-border">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="tomorrow">Tomorrow</SelectItem>
                            <SelectItem value="week">Next 7 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};
