import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, Sparkles, RefreshCw, Tag } from 'lucide-react';

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

const AI_ROWS: SettingRow[] = [
  { id: 'smart-suggest', title: 'Smart suggestions', description: 'AI-driven contact suggestions based on your interactions', defaultOn: true },
  { id: 'auto-enrich', title: 'Auto-enrich profiles', description: 'Automatically fetch public info (LinkedIn, company) for contacts', defaultOn: false },
  { id: 'dupe-detect', title: 'Duplicate detection', description: 'Warn when adding a contact that may already exist', defaultOn: true },
  { id: 'sentiment', title: 'Relationship health scores', description: 'Track interaction frequency and score contact relationships', defaultOn: false },
];

const SYNC_ROWS: SettingRow[] = [
  { id: 'auto-sync', title: 'Automatically sync contacts', description: 'Keep contacts in sync across all your connected accounts', defaultOn: false },
  { id: 'import-vcf', title: 'Allow vCard import', description: 'Enable importing contacts from .vcf files', defaultOn: true },
  { id: 'export-vcf', title: 'Allow vCard export', description: 'Enable exporting contacts as .vcf files', defaultOn: true },
];

export const SmartContactsModuleSettings: React.FC = () => {
  const [defaultSort, setDefaultSort] = useState('name');
  const [cardScan, setCardScan] = useState('auto');

  return (
    <div className="max-w-2xl w-full p-8 pb-32 overflow-auto">
      <h1 className="text-2xl font-bold mb-1 text-foreground">Smart Contacts</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Configure AI-powered contact management and sync settings.
      </p>

      <div className="space-y-8">
        {/* Display */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Display</h2>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-border mb-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Default sort</Label>
              <p className="text-xs text-muted-foreground">How contacts are ordered in the list</p>
            </div>
            <Select value={defaultSort} onValueChange={setDefaultSort}>
              <SelectTrigger className="w-[140px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="recent">Recently added</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Business card scan quality</Label>
              <p className="text-xs text-muted-foreground">GPU resource usage for AI card extraction</p>
            </div>
            <Select value={cardScan} onValueChange={setCardScan}>
              <SelectTrigger className="w-[140px] bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="fast">Fast (lower quality)</SelectItem>
                <SelectItem value="accurate">Accurate (slower)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* AI */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">AI Features</h2>
          </div>
          <div className="divide-y divide-border">
            {AI_ROWS.map(r => <ToggleRow key={r.id} row={r} />)}
          </div>
        </section>

        <Separator />

        {/* Sync & Import */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Sync &amp; Import</h2>
          </div>
          <div className="divide-y divide-border">
            {SYNC_ROWS.map(r => <ToggleRow key={r.id} row={r} />)}
          </div>
        </section>
      </div>
    </div>
  );
};
