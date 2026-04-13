import React from 'react';
import { ArrowLeft, User, Palette, Calendar, Users, Video, Clock, CreditCard, Mail, Menu, Columns2, CheckSquare, FileText, Rocket, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab = 'general', onTabChange }) => {
    const navigate = useNavigate();

    const menuItems = [
        {
            category: 'My Calendar',
            items: [
                { id: 'general', label: 'General', icon: Columns2 },
                { id: 'menu-bar', label: 'Menu bar', icon: Menu },
                { id: 'smart-color', label: 'Smart color-coding', icon: Palette },
            ]
        },
        {
            category: 'Integration',
            items: [
                { id: 'calendar', label: 'Calendar', icon: Calendar },
                { id: 'rooms', label: 'Rooms & contacts', icon: Users },
                { id: 'conferencing', label: 'Conferencing', icon: Video },
            ]
        },
        {
            category: 'Modules',
            items: [
                { id: 'event-task', label: 'Event & Task', icon: CheckSquare },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'smart-contacts', label: 'Smart Contacts', icon: Users },
            ]
        },
        {
            category: 'Scheduling',
            items: [
                { id: 'daily-settings', label: 'Daily', icon: Clock },
                { id: 'weekly-settings', label: 'Weekly', icon: Calendar },
                { id: 'monthly-settings', label: 'Monthly', icon: Columns2 },
                { id: 'yearly-settings', label: 'Yearly', icon: Rocket },
            ]
        },
        {
            category: 'Account',
            items: [
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'emails', label: 'Emails', icon: Mail },
                { id: 'billing', label: 'Plans & billing', icon: CreditCard },
            ]
        }
    ];

    return (
        <aside className="w-[280px] h-full flex flex-col border-r border-border bg-sidebar-background">
            <div className="p-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-foreground font-medium hover:text-foreground/80 transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                <div className="space-y-6">
                    {menuItems.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="text-xs font-medium text-muted-foreground mb-2 px-3">{section.category}</h3>
                            <div className="space-y-0.5">
                                {section.items.map((item) => (
                                    <button
                                        key={item.id}
                                        className={cn(
                                            "flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            activeTab === item.id
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                        onClick={() => onTabChange?.(item.id)}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-border">
                <button className="flex items-center gap-2 text-destructive font-medium hover:text-destructive/80 transition-colors px-3">
                    <span className="w-4 h-4"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 12L15 8M19 12L15 16M19 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    Logout
                </button>
            </div>
        </aside>
    );
};
