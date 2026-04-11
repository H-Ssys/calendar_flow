# Flow Platform — Cross-Tool Agent Rules

## Project Structure
- Source code: src/
- Obsidian vault: docs/vault/
- Agent definitions: .claude/agents/ and .claude/skills/roles/

## Design System
Read: docs/vault/06-design/system.md

## Code Registry (check before building anything)
- docs/vault/04-registry/components.md
- docs/vault/04-registry/dist-analysis.md

## UI/UX Rules
1. Components < 500 lines. Split if larger.
2. Use shadcn/ui (Radix primitives) — don't reinvent.
3. Tailwind CSS v3 utility classes.
4. Handle three states: loading, error, empty.
5. Mobile-responsive: test at 375px, 768px, 1024px.

## After Building UI
Write output to: docs/vault/02-features/{name}/design-output.md
Include: component names, file paths, props interfaces, screenshots.

## Current Task
We are rebuilding the source code from a compiled dist.
The running app is at: http://app.187.77.154.212.sslip.io
Use it as the visual reference for all UI work.

## Security
- Never expose secrets via VITE_ prefix
- All API calls go through Supabase with RLS
