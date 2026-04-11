import { useEffect, useState } from 'react';
import { Cloud, Check, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthContext } from '@/context/AuthContext';
import {
  checkMigrationNeeded,
  migrateAllData,
  markMigrated,
  type MigrationProgress,
} from '@/services/migrationService';

type Status = 'idle' | 'running' | 'done' | 'skipped';

export function MigrationBanner() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [needed, setNeeded] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<MigrationProgress | null>(null);

  useEffect(() => {
    if (!userId) return;
    setNeeded(checkMigrationNeeded(userId));
  }, [userId]);

  if (!userId || !needed) return null;
  if (status === 'skipped') return null;

  const handleMigrate = async () => {
    setStatus('running');
    try {
      const result = await migrateAllData(userId, (p) => setProgress(p));
      setProgress(result);
      setStatus('done');
    } catch (err) {
      console.error('[MigrationBanner] Migration threw:', err);
      setProgress((prev) => prev ?? {
        total: 6, completed: 0, current: 'Migration failed', errors: [(err as Error).message],
      });
      setStatus('done');
    }
  };

  const handleSkip = () => {
    if (!userId) return;
    markMigrated(userId);
    setStatus('skipped');
  };

  const handleDismiss = () => {
    setStatus('skipped');
  };

  // ── Idle: invitation ────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="px-4 pt-4">
        <Alert className="border-primary/40 bg-primary/5">
          <Cloud className="h-4 w-4" />
          <AlertTitle>Sync your local data to the cloud</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              We found data on this device that hasn't been backed up. Migrate it to your account so it syncs everywhere.
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSkip}>Skip</Button>
              <Button size="sm" onClick={handleMigrate}>Migrate Now</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Running: progress ───────────────────────────────────────────
  if (status === 'running') {
    const pct = progress
      ? Math.round((progress.completed / Math.max(1, progress.total)) * 100)
      : 0;
    return (
      <div className="px-4 pt-4">
        <Alert className="border-primary/40 bg-primary/5">
          <Cloud className="h-4 w-4 animate-pulse" />
          <AlertTitle>Migrating to cloud…</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 pt-2">
            <span className="text-sm text-muted-foreground">{progress?.current ?? 'Starting…'}</span>
            <Progress value={pct} className="h-2" />
            <span className="text-xs text-muted-foreground">
              {progress?.completed ?? 0} / {progress?.total ?? 6} steps
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Done: result ────────────────────────────────────────────────
  const hasErrors = (progress?.errors.length ?? 0) > 0;
  return (
    <div className="px-4 pt-4">
      <Alert
        className={hasErrors
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-emerald-500/40 bg-emerald-500/5'
        }
      >
        {hasErrors ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        <AlertTitle>
          {hasErrors ? 'Migration finished with warnings' : 'Migration complete'}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2 pt-2">
          {hasErrors ? (
            <>
              <span className="text-sm text-muted-foreground">
                {progress?.errors.length} item(s) could not be migrated. Check the browser console for details.
              </span>
              <ul className="max-h-24 overflow-auto text-xs text-muted-foreground pl-4 list-disc">
                {progress?.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {(progress?.errors.length ?? 0) > 5 && (
                  <li>…and {(progress?.errors.length ?? 0) - 5} more</li>
                )}
              </ul>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              All your local data has been synced. Reload the page to see it in cloud mode.
            </span>
          )}
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              <X className="h-4 w-4 mr-1" /> Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
