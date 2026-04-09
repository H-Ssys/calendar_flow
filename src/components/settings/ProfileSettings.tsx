import React, { useState } from 'react';
import { User, Camera, Mail, Globe, MapPin, Shield, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCalendar } from '@/context/CalendarContext';

export const ProfileSettings: React.FC = () => {
    const { profileConfig, setProfileConfig } = useCalendar();

    // Local draft state for form editing
    const [draft, setDraft] = useState(profileConfig);
    const [saved, setSaved] = useState(false);

    const hasChanges = JSON.stringify(draft) !== JSON.stringify(profileConfig);

    const handleSave = () => {
        setProfileConfig(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleCancel = () => {
        setDraft(profileConfig);
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-10 text-foreground">Profile Settings</h1>

            <div className="space-y-10">
                {/* Profile Picture Section */}
                <div className="flex items-start gap-8 pb-10 border-b border-border">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-4 border-background shadow-md overflow-hidden">
                            <User className="w-12 h-12" />
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-2 pt-2">
                        <h3 className="text-lg font-bold text-foreground leading-tight">Your Profile Picture</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            This will be displayed on your profile and visible to your team members and people you invite to meetings.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" size="sm" className="font-semibold text-xs h-9">
                                Upload New
                            </Button>
                            <Button variant="ghost" size="sm" className="font-semibold text-xs text-destructive hover:text-destructive hover:bg-destructive/5 h-9">
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-foreground ml-1">First Name</Label>
                        <Input
                            value={draft.firstName}
                            onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                            className="h-11 bg-muted/20 border-border focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-foreground ml-1">Last Name</Label>
                        <Input
                            value={draft.lastName}
                            onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                            className="h-11 bg-muted/20 border-border focus:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-bold text-foreground ml-1">Email Address</Label>
                        <div className="relative">
                            <Input defaultValue="alex.rivera@ofative.com" className="h-11 bg-muted/20 border-border pl-10" readOnly />
                            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                            <div className="absolute right-3 top-2.5 px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-100 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Verified
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Your primary email is used for calendar sync and notifications.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-bold text-foreground ml-1">Bio</Label>
                        <Textarea
                            value={draft.bio}
                            onChange={(e) => setDraft({ ...draft, bio: e.target.value.slice(0, 200) })}
                            className="min-h-[120px] bg-muted/20 border-border resize-none focus:ring-primary/20"
                        />
                        <p className="text-xs text-muted-foreground ml-1">{draft.bio.length}/200 characters.</p>
                    </div>
                </div>

                {/* Location & Language Summary */}
                <div className="bg-muted/30 rounded-2xl p-6 border border-border/50 flex flex-wrap gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg border border-border">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Language</span>
                            <span className="text-sm font-medium text-foreground">{profileConfig.language}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg border border-border">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Timezone</span>
                            <span className="text-sm font-medium text-foreground">{profileConfig.timezone}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg border border-border">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                            <span className="text-sm font-medium text-foreground">Professional Account</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6">
                    {saved && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1 mr-2">
                            <Check className="w-4 h-4" /> Saved!
                        </span>
                    )}
                    <Button variant="ghost" className="font-bold px-6" onClick={handleCancel} disabled={!hasChanges}>Cancel</Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-500/20"
                        onClick={handleSave}
                        disabled={!hasChanges}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};
