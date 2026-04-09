import React from 'react';
import { Note } from '@/types/note';
import { Badge } from '@/components/ui/badge';
import { Pin, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NoteCardProps {
    note: Note;
    isActive: boolean;
    onClick: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, isActive, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                "p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                "hover:shadow-sm",
                isActive
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-card border-transparent hover:border-border"
            )}
        >
            {/* Header: Title + Indicators */}
            <div className="flex items-start gap-2 mb-1.5">
                <h3 className="text-sm font-medium text-foreground flex-1 leading-tight line-clamp-1">
                    {note.title}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {note.isPinned && <Pin className="w-3 h-3 text-primary" />}
                    {note.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                </div>
            </div>

            {/* Excerpt */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                {note.excerpt || 'Empty note'}
            </p>

            {/* Footer: Date + Tags */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                    {format(new Date(note.updatedAt), 'MMM d')}
                </span>
                {note.linkedDate && (
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                )}
                <div className="flex gap-1 ml-auto">
                    {note.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 h-3.5 font-normal">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Color accent */}
            {note.color && note.color !== '#f8fafc' && (
                <div
                    className="h-0.5 rounded-full mt-2 -mx-1"
                    style={{ backgroundColor: note.color }}
                />
            )}
        </div>
    );
};
