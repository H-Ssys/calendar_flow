import React, { useState } from 'react';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { MenuBarSettings } from '@/components/settings/MenuBarSettings';
import { SmartColorCodingSettings } from '@/components/settings/SmartColorCodingSettings';
import { CalendarSettings } from '@/components/settings/CalendarSettings';
import { RoomsSettings } from '@/components/settings/RoomsSettings';
import { ConferencingSettings } from '@/components/settings/ConferencingSettings';
import { DailySettings } from '@/components/settings/DailySettings';
import { WeeklySettings } from '@/components/settings/WeeklySettings';
import { MonthlySettings } from '@/components/settings/MonthlySettings';
import { YearlySettings } from '@/components/settings/YearlySettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { BillingSettings } from '@/components/settings/BillingSettings';
import { FlexibleEventsSettings } from '@/components/settings/FlexibleEventsSettings';
import { FocusGuardSettings } from '@/components/settings/FocusGuardSettings';
import { EventTaskModuleSettings } from '@/components/settings/EventTaskModuleSettings';
import { NotesModuleSettings } from '@/components/settings/NotesModuleSettings';
import { SmartContactsModuleSettings } from '@/components/settings/SmartContactsModuleSettings';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralSettings />;
            case 'menu-bar':
                return <MenuBarSettings />;
            case 'smart-color':
                return <SmartColorCodingSettings />;
            case 'calendar':
                return <CalendarSettings />;
            case 'rooms':
                return <RoomsSettings />;
            case 'conferencing':
                return <ConferencingSettings />;
            case 'daily-settings':
                return <DailySettings />;
            case 'weekly-settings':
                return <WeeklySettings />;
            case 'monthly-settings':
                return <MonthlySettings />;
            case 'yearly-settings':
                return <YearlySettings />;
            case 'profile':
                return <ProfileSettings />;
            case 'emails':
                return <EmailSettings />;
            case 'billing':
                return <BillingSettings />;
            case 'event-task':
                return <EventTaskModuleSettings />;
            case 'notes':
                return <NotesModuleSettings />;
            case 'smart-contacts':
                return <SmartContactsModuleSettings />;
            default:
                return (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Content for {activeTab} coming soon
                    </div>
                );
        }
    };

    return (
        <div className="flex w-full h-screen bg-background overflow-hidden animate-in fade-in duration-300">
            <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="flex-1 overflow-hidden flex bg-background">
                <div className="flex-1 overflow-auto flex justify-center">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default Settings;
