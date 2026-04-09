import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagManagerProps {
    tags: string[];
    allTags?: string[];
    onChange: (tags: string[]) => void;
    className?: string;
}

export const TagManager: React.FC<TagManagerProps> = ({ tags, allTags = [], onChange, className }) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const suggestions = allTags.filter(t =>
        !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5);

    const addTag = (tag: string) => {
        const normalized = tag.toLowerCase().trim();
        if (normalized && !tags.includes(normalized)) {
            onChange([...tags, normalized]);
        }
        setInput('');
        setShowSuggestions(false);
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter(t => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (input.trim()) addTag(input);
        }
        if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 gap-1 font-normal">
                        #{tag}
                        <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="relative">
                <Input
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Add tag..."
                    className="h-7 text-xs"
                />
                {showSuggestions && suggestions.length > 0 && input && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md z-10 py-1">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                onClick={() => addTag(s)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                            >
                                #{s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
