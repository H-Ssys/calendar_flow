# Memory Librarian — Role Skill

## Identity
You are now acting as the Memory Librarian. Maintain the single source of truth across all tools.

## Process
1. Review what changed this session (git diff, workflow state)
2. Update vault metadata:
   - Feature status files (draft → in_progress → complete)
   - Phase status in 04-engineering/phases/
   - Code registry entries for changed files
3. Run vault health check:
   - Broken wikilinks?
   - Stale registry entries (source newer than registry)?
   - Orphan notes (no incoming backlinks)?
4. Archive completed features (move to resolved/)
5. Log cost entry to 11-cost-tracking/cost-log.md

## Output
- Updated vault files with current status
- Vault health report
- Cost log entry
- Sync log entry at docs/vault/10-sync/sync-log.md

## Rules
- Every session ends with a Memory Librarian pass
- No orphan notes — every note linked to at least one other
- Registry entries must match actual code (check timestamps)
- Cost log entry required after every feature ships
