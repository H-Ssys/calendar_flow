import React from 'react';
import { Mail, Check, Plus, BellRing, ShieldCheck, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCalendar, EmailNotificationConfig } from '@/context/CalendarContext';

interface EmailAccountProps {
    email: string;
    isPrimary: boolean;
    isVerified: boolean;
}

const EmailAccount: React.FC<EmailAccountProps> = ({ email, isPrimary, isVerified }) => (
    <div className="flex items-center justify-between py-5 border-b border-border last:border-0">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{email}</span>
                    {isPrimary && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Primary</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {isVerified ? (
                        <span className="text-[11px] text-green-600 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                        </span>
                    ) : (
                        <button className="text-[11px] text-blue-600 hover:underline font-medium">Resend verification</button>
                    )}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {!isPrimary && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-[11px] font-semibold">
                {isPrimary ? 'Manage' : 'Make Primary'}
            </Button>
        </div>
    </div>
);

interface NotificationToggleProps {
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({ title, description, checked, onCheckedChange }) => (
    <div className="flex items-center justify-between py-6 border-b border-border last:border-0">
        <div className="space-y-1 pr-8">
            <Label className="text-sm font-bold text-foreground leading-tight block">{title}</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);

export const EmailSettings: React.FC = () => {
    const { emailNotificationConfig, setEmailNotificationConfig } = useCalendar();

    const updateNotif = (key: keyof EmailNotificationConfig, value: boolean) => {
        setEmailNotificationConfig({ ...emailNotificationConfig, [key]: value });
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-10 text-foreground">Email Settings</h1>

            <div className="space-y-12">
                {/* Email Addresses Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-foreground leading-tight">Email Addresses</h3>
                            <p className="text-sm text-muted-foreground">Manage the email addresses associated with your account.</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 px-4 gap-2 font-bold border-border hover:bg-muted transition-colors">
                            <Plus className="w-4 h-4" />
                            Add Email
                        </Button>
                    </div>
                    <div className="bg-muted/10 rounded-2xl border border-border/50 px-6">
                        <EmailAccount email="alex.rivera@ofative.com" isPrimary={true} isVerified={true} />
                        <EmailAccount email="personal.alex@gmail.com" isPrimary={false} isVerified={true} />
                        <EmailAccount email="work@design-studio.io" isPrimary={false} isVerified={false} />
                    </div>
                </div>

                {/* Calendar Notifications */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                            <BellRing className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-lg font-bold text-foreground leading-tight">Calendar Notifications</h3>
                            <p className="text-sm text-muted-foreground">Control which calendar events trigger an email.</p>
                        </div>
                    </div>
                    <div className="space-y-0 pl-1">
                        <NotificationToggle
                            title="New Invitations"
                            description="Receive an email when you're invited to a new meeting or event."
                            checked={emailNotificationConfig.newInvitations}
                            onCheckedChange={(v) => updateNotif('newInvitations', v)}
                        />
                        <NotificationToggle
                            title="Event Updates"
                            description="Get notified when the time, location, or details of an event change."
                            checked={emailNotificationConfig.eventUpdates}
                            onCheckedChange={(v) => updateNotif('eventUpdates', v)}
                        />
                        <NotificationToggle
                            title="Event Cancellations"
                            description="Be informed immediately if a meeting you're attending is cancelled."
                            checked={emailNotificationConfig.eventCancellations}
                            onCheckedChange={(v) => updateNotif('eventCancellations', v)}
                        />
                        <NotificationToggle
                            title="Daily Agenda"
                            description="Start your morning with a summary of all scheduled events for the day."
                            checked={emailNotificationConfig.dailyAgenda}
                            onCheckedChange={(v) => updateNotif('dailyAgenda', v)}
                        />
                    </div>
                </div>

                {/* Account Security */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg text-orange-600 border border-orange-100">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-lg font-bold text-foreground leading-tight">Security & Activity</h3>
                            <p className="text-sm text-muted-foreground">Stay informed about your account security.</p>
                        </div>
                    </div>
                    <div className="space-y-0 pl-1">
                        <NotificationToggle
                            title="New Sign-ins"
                            description="Receive an alert when your account is accessed from a new device or browser."
                            checked={emailNotificationConfig.newSignIns}
                            onCheckedChange={(v) => updateNotif('newSignIns', v)}
                        />
                        <NotificationToggle
                            title="Security Alerts"
                            description="Important emails about password changes or account recovery actions."
                            checked={emailNotificationConfig.securityAlerts}
                            onCheckedChange={(v) => updateNotif('securityAlerts', v)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
