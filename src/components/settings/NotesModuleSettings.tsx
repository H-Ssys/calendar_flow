import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FileText, Tag, Archive, Sparkles } from 'lucide-react';

interface SettingRow { id: string; title: string; description: string; defaultOn?: boolean; }

function ToggleRow({ row }: { row: SettingRow }) {
  const [on, setOn] = useState(row.defaultOn ?? false);
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{row.title}</p>
        <p className="text-xs text-muted-foreground">{row.description}</p>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

const CONTENT_ROWS: SettingRow[] = [
  { id: 'ai-summary', title: 'AI note summary', description: 'Automatically generate a short summary at the top of long notes', defaultOn: true },
  { id: 'auto-tag', title: 'Auto-tagging', description: 'Suggest tags for notes based on content', defaultOn: true },
  { id: 'link-events', title: 'Link notes to events', description: 'Automatically attach notes to related calendar events', defaultOn: false },
  { id: 'inline-tasks', title: 'Inline task detection', description: 'Convert lines starting with [ ] into tasks automatically', defaultOn: false },
];

const ARCHIVE_ROWS: SettingRow[] = [
  { id: 'auto-archive', title: 'Auto-archive old notes', description: 'Archive notes that haven\'t been edited in 90 days', defaultOn: false },
  { id: 'trash-30', title: 'Delete from trash after 30 days', description: 'Permanently delete notes from trash after 30 days', defaultOn: true },
];

export const NotesModuleSettings: React.FC = () => {
  const [defaultView, setDefaultView] = useState('grid');
  const [editorFont, setEditorFont] = useState('system');

  return (
    <div className="max-w-2xl w-full p-8 pb-32 overflow-auto">
      <h1 className="text-2xl font-bold mb-1 text-foreground">Notes</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage your note-taking preferences and AI features.
      </p>

      <div className="space-y-8">
        {/* Display */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Display</h2>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-border mb-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Default notes view</Label>
              <p className="text-xs text-muted-foreground">How notes are shown on the Notes page</p>
            </div>
            <Select value={defaultView} onValueChange={setDefaultView}>
              <SelectTrigger className="w-[120px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Editor font</Label>
              <p className="text-xs text-muted-foreground">Font used in the note editor</p>
            </div>
            <Select value={editorFont} onValueChange={setEditorFont}>
              <SelectTrigger className="w-[120px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* AI & Content */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">AI &amp; Content</h2>
          </div>
          <div className="divide-y divide-border">
            {CONTENT_ROWS.map(r => <ToggleRow key={r.id} row={r} />)}
          </div>
        </section>

        <Separator />

        {/* Archive & Deletion */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Archive &amp; Deletion</h2>
          </div>
          <div className="divide-y divide-border">
            {ARCHIVE_ROWS.map(r => <ToggleRow key={r.id} row={r} />)}
          </div>
        </section>
      </div>
    </div>
  );
};
