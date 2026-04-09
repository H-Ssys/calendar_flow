import * as React from "react";
import { Plus, User, Search, X, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AddParticipantCardProps {
    onAdd?: (name: string, email: string) => void;
    className?: string;
}

const MOCK_USERS = [
    { name: "Kristin Watson", email: "kristin@gmail.com", avatar: "https://i.pravatar.cc/150?u=kristin" },
    { name: "Cody Fisher", email: "cody@gmail.com", avatar: "https://i.pravatar.cc/150?u=cody" },
    { name: "Esther Howard", email: "esther@gmail.com", avatar: "https://i.pravatar.cc/150?u=esther" },
    { name: "Floyd Miles", email: "floyd@gmail.com", avatar: "https://i.pravatar.cc/150?u=floyd" },
    { name: "Aknia Christine", email: "aknia@gmail.com", avatar: "https://i.pravatar.cc/150?u=aknia" },
];

const AddParticipantCard = ({ onAdd, className }: AddParticipantCardProps) => {
    const [view, setView] = React.useState<'list' | 'form'>('list');
    const [searchQuery, setSearchQuery] = React.useState("");

    // Form State
    const [name, setName] = React.useState("");
    const [email, setEmail] = React.useState("");

    const filteredUsers = MOCK_USERS.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && email.trim()) {
            onAdd?.(name.trim(), email.trim());
            setName("");
            setEmail("");
            setView('list'); // Return to list after adding
        }
    };

    const handleSelectUser = (user: typeof MOCK_USERS[0]) => {
        onAdd?.(user.name, user.email);
    };

    return (
        <Card className={cn("w-full max-w-sm shadow-xl", className)}>
            <CardContent className="p-0">
                {view === 'list' ? (
                    <div className="flex flex-col">
                        {/* Search Header */}
                        <div className="p-3 border-b border-border flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                placeholder="Search by name or email"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* User List */}
                        <div className="max-h-[240px] overflow-y-auto py-1">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <button
                                        key={user.email}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted transition-colors text-left"
                                    >
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-foreground">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No users found
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-2 border-t border-border">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => setView('form')}
                            >
                                <Plus className="w-4 h-4" />
                                New Participant
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setView('list')}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <h3 className="text-sm font-semibold">New Participant</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <Input
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full"
                                autoFocus
                            />
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full"
                            />
                            <Button type="submit" className="w-full gap-2 mt-2">
                                <Plus className="h-4 w-4" />
                                Add Participant
                            </Button>
                        </form>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AddParticipantCard;
