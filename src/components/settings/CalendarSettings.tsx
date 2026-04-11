import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Provider {
    id: string;
    name: string;
    icon: string;
    color: string;
}

const PROVIDERS: Provider[] = [
    { id: 'google', name: 'Google Calendar', icon: 'G', color: 'text-red-500' },
    { id: 'outlook', name: 'Outlook Calendar', icon: 'O', color: 'text-blue-500' },
    { id: 'icloud', name: 'iCloud Calendar', icon: 'i', color: 'text-blue-400' },
    { id: 'exchange', name: 'Exchange', icon: 'E', color: 'text-blue-600' },
];

export const CalendarSettings: React.FC = () => {
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
            <h1 className="text-2xl font-bold mb-2 text-foreground">Calendar Accounts</h1>
            <p className="text-sm text-muted-foreground mb-10">Connect external calendar providers to sync your events.</p>

            <div className="space-y-0">
                {PROVIDERS.map((p) => {
                    const isConnected = connected.includes(p.id);
                    return (
                        <div key={p.id} className="flex items-center justify-between py-6 border-b border-border last:border-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center font-bold text-lg ${p.color}`}>
                                    {p.icon}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-base font-bold text-foreground leading-tight">{p.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {isConnected ? 'Connected — events are syncing' : `Connect your ${p.name} account`}
                                    </p>
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
