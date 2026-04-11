import React, { useState } from 'react';
import { Plus, Check, X, Video, Monitor, Globe, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Provider {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const PROVIDERS: Provider[] = [
    { id: 'zoom', name: 'Zoom', description: 'Create and join Zoom meetings directly from events', icon: <Video className="w-5 h-5" />, color: 'text-blue-500' },
    { id: 'google-meet', name: 'Google Meet', description: 'Automatically add Google Meet links to your calendar', icon: <Monitor className="w-5 h-5" />, color: 'text-green-600' },
    { id: 'teams', name: 'Microsoft Teams', description: 'Schedule Teams meetings for your organization', icon: <Globe className="w-5 h-5" />, color: 'text-blue-700' },
    { id: 'webex', name: 'Cisco Webex', description: 'Enterprise video conferencing and collaboration', icon: <Phone className="w-5 h-5" />, color: 'text-blue-400' },
    { id: 'bluejeans', name: 'BlueJeans', description: 'High-quality video meetings and events', icon: <Video className="w-5 h-5" />, color: 'text-blue-800' },
];

export const ConferencingSettings: React.FC = () => {
    // Stub UI — connection state is in-memory only
    const [connected, setConnected] = useState<string[]>([]);

    const { toast } = useToast();

    const toggle = (id: string) => {
        const provider = PROVIDERS.find(p => p.id === id);
        const isDisconnecting = connected.includes(id);
        setConnected((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
        toast({
            title: isDisconnecting ? 'Disconnected' : 'Connected',
            description: `${provider?.name} has been ${isDisconnecting ? 'disconnected' : 'connected successfully'}.`,
        });
    };

    return (
        <div className="max-w-3xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Conferencing</h1>
            <p className="text-sm text-muted-foreground mb-10">Connect your video conferencing tools to auto-generate meeting links.</p>

            <div className="space-y-0">
                {PROVIDERS.map((p) => {
                    const isConnected = connected.includes(p.id);
                    return (
                        <div key={p.id} className="flex items-center justify-between py-6 border-b border-border last:border-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ${p.color}`}>
                                    {p.icon}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-base font-bold text-foreground leading-tight">{p.name}</h4>
                                        {isConnected && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-0.5">
                                                <Check className="w-3 h-3" /> Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{p.description}</p>
                                </div>
                            </div>
                            <Button
                                variant={isConnected ? 'destructive' : 'outline'}
                                size="sm"
                                className={`gap-2 font-semibold h-9 px-4 transition-all ${isConnected ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : ''}`}
                                onClick={() => toggle(p.id)}
                            >
                                {isConnected ? (
                                    <><X className="w-4 h-4" /> Disconnect</>
                                ) : (
                                    <><Plus className="w-4 h-4" /> Connect</>
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
