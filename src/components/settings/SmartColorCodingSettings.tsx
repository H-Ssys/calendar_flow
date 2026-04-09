import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { useCalendar, PASTEL_COLORS, Category } from '@/context/CalendarContext';

interface ColorSelectorProps {
    currentColor: string;
    onColorChange: (color: string) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ currentColor, onColorChange }) => (
    <div className="flex items-center gap-1.5">
        {PASTEL_COLORS.map((color) => (
            <button
                key={color.value}
                title={color.name}
                className={`w-3.5 h-3.5 rounded-full border hover:scale-110 transition-transform ${currentColor === color.value ? 'ring-2 ring-primary ring-offset-1 border-primary' : 'border-black/5'
                    }`}
                style={{ backgroundColor: color.value }}
                onClick={() => onColorChange(color.value)}
            />
        ))}
    </div>
);

interface SettingCategoryProps {
    category: Category;
    isActive: boolean;
    onToggle: () => void;
    onColorChange: (color: string) => void;
    onDelete: () => void;
}

const SettingCategory: React.FC<SettingCategoryProps> = ({ category, isActive, onToggle, onColorChange, onDelete }) => (
    <div className="mb-10 last:mb-0">
        <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: category.color }} />
                <span className="text-sm font-bold text-foreground">{category.name}</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={`Delete ${category.name}`}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Switch checked={isActive} onCheckedChange={onToggle} />
            </div>
        </div>

        {isActive && (
            <div className="pl-6 pb-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Category color</span>
                    <ColorSelector currentColor={category.color} onColorChange={onColorChange} />
                </div>
            </div>
        )}
        <div className="h-[1px] bg-border/50 w-full" />
    </div>
);

export const SmartColorCodingSettings: React.FC = () => {
    const { categories, activeCategories, toggleCategory, updateCategory, addCategory, deleteCategory } = useCalendar();

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PASTEL_COLORS[0].value);

    const handleColorChange = (categoryName: string, color: string) => {
        updateCategory(categoryName, { color });
    };

    const handleCreate = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        // Prevent duplicate names
        if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;

        addCategory({ name: trimmed, color: newColor, type: 'default' });
        setNewName('');
        setNewColor(PASTEL_COLORS[0].value);
        setIsCreating(false);
    };

    const handleDelete = (name: string) => {
        deleteCategory(name);
    };

    return (
        <div className="max-w-4xl w-full p-8 pb-32 overflow-auto">
            <h1 className="text-2xl font-bold mb-2 text-foreground">Smart Color-Coding</h1>
            <p className="text-sm text-muted-foreground mb-10">Toggle categories and customize their colors. Active categories show events on your calendar.</p>

            <div className="space-y-0">
                {categories.map((cat) => (
                    <SettingCategory
                        key={cat.name}
                        category={cat}
                        isActive={activeCategories.includes(cat.name)}
                        onToggle={() => toggleCategory(cat.name)}
                        onColorChange={(color) => handleColorChange(cat.name, color)}
                        onDelete={() => handleDelete(cat.name)}
                    />
                ))}
            </div>

            {/* Create Category */}
            {isCreating ? (
                <div className="mt-6 border border-border rounded-xl p-5 bg-muted/30 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: newColor }} />
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Category name"
                            className="flex-1 h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Pick a color</span>
                        <ColorSelector currentColor={newColor} onColorChange={setNewColor} />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setNewName(''); }} className="h-8 px-3 text-xs">
                            <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={handleCreate} disabled={!newName.trim()} className="h-8 px-3 text-xs">
                            <Check className="w-3.5 h-3.5 mr-1" /> Create
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsCreating(true)}
                    className="mt-6 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-1 py-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Category
                </button>
            )}
        </div>
    );
};
