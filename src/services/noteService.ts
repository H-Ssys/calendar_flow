// Note Service — localStorage persistence + mock data
import { Note } from '@/types/note';

const STORAGE_KEY = 'ofative-notes';

// ========== Mock Data ==========

const createMockNotes = (): Note[] => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return [
        {
            id: 'note-1',
            title: 'Sprint Planning Notes',
            content: `## Sprint 14 Planning\n\n### Goals\n- Complete user authentication module\n- Ship landing page redesign\n- Fix critical mobile navigation bug\n\n### Key Decisions\n- Use JWT for auth tokens (refresh + access)\n- Deploy to staging by Wednesday\n- Design review scheduled for Thursday\n\n### Action Items\n- [ ] Send API spec to frontend team\n- [ ] Review PR #147\n- [x] Update project timeline\n\n> **Note:** Sprint demo is Friday at 3 PM`,
            excerpt: 'Sprint 14 Planning — Goals, key decisions, and action items for the current sprint...',
            tags: ['sprint', 'planning', 'team'],
            category: 'Work Plan',
            color: '#e0f2fe',
            isPinned: true,
            isFavorite: true,
            linkedDate: now,
            linkedEventIds: ['1'],
            createdAt: twoDaysAgo,
            updatedAt: now,
            wordCount: 72,
        },
        {
            id: 'note-2',
            title: 'Meeting Notes — Design Review',
            content: `## Design Review — Feb 7\n\n### Attendees\n- Sarah (Design Lead)\n- Alex (Frontend)\n- Jordan (PM)\n\n### Feedback\n1. **Hero section** — Gradient needs more contrast\n2. **CTA button** — Make it larger and more prominent\n3. **Footer** — Reduce link density\n\n### Next Steps\n- Sarah will update Figma by Monday\n- Alex to prototype the animated hero\n- Follow-up review on Wednesday`,
            excerpt: 'Design Review — Feb 7 — Feedback on hero section, CTA button, and footer improvements...',
            tags: ['meeting', 'design', 'review'],
            category: 'Project',
            color: '#ede9fe',
            isPinned: true,
            isFavorite: false,
            linkedDate: yesterday,
            linkedEventIds: [],
            createdAt: yesterday,
            updatedAt: yesterday,
            wordCount: 68,
        },
        {
            id: 'note-3',
            title: 'API Architecture Ideas',
            content: `## REST API Architecture\n\n### Endpoints Structure\n\`\`\`\nGET    /api/v1/events\nPOST   /api/v1/events\nPUT    /api/v1/events/:id\nDELETE /api/v1/events/:id\n\nGET    /api/v1/tasks\nPOST   /api/v1/tasks\nPATCH  /api/v1/tasks/:id\nDELETE /api/v1/tasks/:id\n\`\`\`\n\n### Tech Stack Options\n| Option | Pros | Cons |\n|--------|------|------|\n| NestJS | Structured, TypeScript | Heavier |\n| Express | Simple, flexible | Less organized |\n| Fastify | Fastest, schema-first | Smaller ecosystem |\n\n### Decision\nGo with **NestJS** for type safety and structured modules.`,
            excerpt: 'REST API Architecture — Endpoints structure, tech stack comparison, and decision...',
            tags: ['architecture', 'backend', 'api'],
            category: 'Project',
            color: '#f8fafc',
            isPinned: false,
            isFavorite: true,
            linkedEventIds: [],
            createdAt: twoDaysAgo,
            updatedAt: twoDaysAgo,
            wordCount: 56,
        },
        {
            id: 'note-4',
            title: 'Quick Ideas & Brainstorm',
            content: `## Feature Ideas\n\n- 🔔 Smart notification system with snooze\n- 📊 Weekly productivity dashboard\n- 🎨 Custom theme builder for users\n- 📱 Progressive Web App (PWA) support\n- 🔗 Deep linking between tasks and events\n- 📧 Email digest with daily summary\n\n## UX Improvements\n- Keyboard shortcuts help overlay\n- Undo/redo for event changes\n- Drag to create events (click & drag on empty slot)\n- Quick event creation from search bar`,
            excerpt: 'Feature Ideas — Smart notifications, weekly dashboard, custom themes, PWA support...',
            tags: ['ideas', 'brainstorm', 'features'],
            category: 'Personal',
            color: '#fef3c7',
            isPinned: false,
            isFavorite: false,
            linkedEventIds: [],
            createdAt: new Date(now.getTime() - 86400000 * 4),
            updatedAt: yesterday,
            wordCount: 62,
        },
        {
            id: 'note-5',
            title: 'Onboarding Checklist',
            content: `## New Team Member Onboarding\n\n### Day 1\n- [x] Set up development environment\n- [x] Access to GitHub repository\n- [x] Slack channels joined\n- [ ] Review coding standards doc\n\n### Week 1\n- [ ] Complete first PR\n- [ ] Meet with team lead\n- [ ] Shadow a code review session\n- [ ] Read architecture overview\n\n### Month 1\n- [ ] Own a small feature end-to-end\n- [ ] Present at sprint demo\n- [ ] Contribute to documentation`,
            excerpt: 'New Team Member Onboarding — Day 1, Week 1, and Month 1 checklists...',
            tags: ['onboarding', 'team', 'checklist'],
            category: 'Work Plan',
            color: '#d1fae5',
            isPinned: false,
            isFavorite: false,
            linkedEventIds: [],
            createdAt: new Date(now.getTime() - 86400000 * 7),
            updatedAt: new Date(now.getTime() - 86400000 * 3),
            wordCount: 58,
        },
    ];
};

// ========== Service Functions ==========

const reviveDates = (note: any): Note => ({
    ...note,
    linkedDate: note.linkedDate ? new Date(note.linkedDate) : undefined,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(note.updatedAt),
});

export const loadNotes = (): Note[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.map(reviveDates);
        }
    } catch (e) {
        console.error('Failed to load notes:', e);
    }
    const mocks = createMockNotes();
    saveNotes(mocks);
    return mocks;
};

export const saveNotes = (notes: Note[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
        console.error('Failed to save notes:', e);
    }
};

export const searchNotes = (notes: Note[], query: string): Note[] => {
    const q = query.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
    );
};

export const getNotesByTag = (notes: Note[], tag: string): Note[] => {
    return notes.filter(n => n.tags.includes(tag));
};

export const getNotesForDate = (notes: Note[], date: Date): Note[] => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return notes.filter(n => {
        if (!n.linkedDate) return false;
        const d = new Date(n.linkedDate);
        return d >= start && d <= end;
    });
};

export const generateNoteId = (): string => {
    return `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const getWordCount = (content: string): number => {
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export const getExcerpt = (content: string, maxLength: number = 100): string => {
    const plain = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[>\-\[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength).trim() + '...';
};
