import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Users, Building2, MapPin, Contact } from 'lucide-react';
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
    { id: 'google-rooms', name: 'Google Workspace Rooms', description: 'Sync and book your Google meeting rooms', icon: <Building2 className="w-5 h-5" />, color: 'text-red-500' },
    { id: 'ms365-rooms', name: 'Microsoft 365 Rooms', description: 'Integration with Outlook and Teams rooms', icon: <Building2 className="w-5 h-5" />, color: 'text-blue-600' },
    { id: 'zoom-rooms', name: 'Zoom Rooms', description: 'Connect your Zoom physical room systems', icon: <MapPin className="w-5 h-5" />, color: 'text-blue-400' },
    { id: 'directory', name: 'Directory Contacts', description: 'Sync your organization\'s global address list', icon: <Contact className="w-5 h-5" />, color: 'text-green-600' },
    { id: 'personal', name: 'Personal Contacts', description: 'Import contacts from your connected accounts', icon: <Users className="w-5 h-5" />, color: 'text-purple-500' },
];

const LS_KEY = 'settings-rooms-connected';

export const RoomsSettings: React.FC = () => {
    const [connected, setConnected] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        return [];
    });

    useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(connected)); }, [connected]);

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
            <h1 className="text-2xl font-bold mb-2 text-foreground">Rooms & Contacts</h1>
            <p className="text-sm text-muted-foreground mb-10">Connect room booking systems and contact directories.</p>

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
                                                <Check className="w-3 h-3" /> Synced
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
