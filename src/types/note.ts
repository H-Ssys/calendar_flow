// Types for Note-taking Module

export interface Note {
    id: string;
    title: string;
    content: string;       // Markdown content
    excerpt: string;        // First ~100 chars for preview

    // Organization
    tags: string[];
    category: string;
    color: string;
    isPinned: boolean;
    isFavorite: boolean;

    // Calendar integration
    linkedDate?: Date;
    linkedEventIds: string[];

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    wordCount: number;
}

export const NOTE_COLORS = [
    { name: 'Default', value: '#f8fafc' },
    { name: 'Rose', value: '#ffe4e6' },
    { name: 'Amber', value: '#fef3c7' },
    { name: 'Emerald', value: '#d1fae5' },
    { name: 'Sky', value: '#e0f2fe' },
    { name: 'Violet', value: '#ede9fe' },
    { name: 'Fuchsia', value: '#fae8ff' },
];
