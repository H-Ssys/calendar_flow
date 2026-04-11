---
type: registry
category: config
updated: 2026-04-09
scan_step: 4/8
scope: project root
---

# Config Files Registry

Catalog of tooling, build, and workspace config at `/home/flow/calendar-main/`. Wires [[shared-packages]] into the frontend [[components]] build.

> **🚨 Build tooling is currently broken.** The recovered frontend ships non-standard file names (`vite.frontend.config.ts`, `tailwind.frontend.config.ts`, `index.frontend.html`) and is **missing `tsconfig.json` entirely**. `components.json` points shadcn at `tailwind.config.ts` which does not exist. `pnpm-workspace.yaml` declares a package `calendar-main` which **is the current directory itself** — the workspace layout is inside-out. Expect `pnpm install` / `pnpm dev` to fail without fixes.

---

## Root configs present

| File | Size | Purpose |
|---|---|---|
| `package.json` | 379 B | Monorepo root — turbo-based scripts, devDeps only |
| `pnpm-workspace.yaml` | 61 B | Workspace layout (broken — references `calendar-main`) |
| `turbo.json` | 400 B | Turborepo pipeline (build / test / lint / type-check / dev) |
| `vite.frontend.config.ts` | 476 B | Vite + SWC React + lovable-tagger; alias `@` → `./src` |
| `tailwind.frontend.config.ts` | 2.7 KB | Tailwind theme (HSL CSS vars), darkMode class, tailwindcss-animate |
| `components.json` | 414 B | shadcn/ui config — **references missing `tailwind.config.ts`** |
| `vitest.config.ts` | 331 B | vitest jsdom, 80% line coverage threshold |
| `playwright.config.ts` | 338 B | Playwright e2e; baseURL from `STAGING_URL` or `localhost:5173` |
| `index.frontend.html` | 1.0 KB | HTML entry (non-standard name; vite expects `index.html`) |
| `.gitignore` | 208 B | Node / Next / Python / test outputs |
| `CLAUDE.md` | 3.8 KB | Project instructions for Claude Code |
| `AGENTS.md` | 2.1 KB | Cross-tool agent rules |
| `README.md` | 19 B | Stub |
| `TESTING.md` | 2.0 KB | Test strategy notes |
| `supabase-schema-dump.sql` | 307 KB | Current Supabase DB snapshot |

## Root configs **missing / expected but absent**
| Missing file | Impact |
|---|---|
| `tsconfig.json` | No root TS project — `tsc --noEmit` and IDE type-check likely fail |
| `tsconfig.app.json` / `tsconfig.node.json` | Normal Vite TS split absent |
| `tailwind.config.ts` | shadcn config points here (components.json). CLI will fail |
| `postcss.config.js` / `postcss.config.cjs` | Tailwind needs a PostCSS config |
| `eslint.config.js` | `package.json` has `lint` script but no config present |
| `index.html` | Vite defaults to `index.html`; current repo has `index.frontend.html` only |

---

## File-by-file details

### package.json
```json
{
  "name": "ofative-calendar-platform",
  "private": true,
  "scripts": {
    "build":      "turbo run build",
    "dev":        "turbo run dev",
    "test":       "turbo run test",
    "lint":       "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.50.0"
  }
}
```
- **Role**: Thin monorepo root. No `dependencies` (React, Vite, Tailwind, shadcn, dnd-kit, date-fns, sonner, react-router, react-i18next, recharts, react-markdown, remark-gfm, react-query, clsx, tailwind-merge, tailwindcss-animate, etc.) are declared here.
- **⚠ Issue**: All runtime deps consumed by `src/**` live in a sub-package's `package.json` that hasn't been recovered yet. This root file cannot bootstrap the frontend on its own. **Blocker for `pnpm install`.**

### pnpm-workspace.yaml
```yaml
packages:
  - 'calendar-main'
  - 'packages/*'
  - 'backend'
```
- **⚠ Issue**: The entry `calendar-main` is literally the directory you are in. Workspaces can't self-reference. Expected layout would be one level up with `calendar-main/` as a child, or this entry should become `frontend` / `apps/frontend`. **Second blocker for `pnpm install`.**

### turbo.json
```json
{
  "pipeline": {
    "build":      { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test":       { "dependsOn": ["^build"] },
    "lint":       {},
    "type-check": { "dependsOn": ["^build"] },
    "dev":        { "cache": false, "persistent": true }
  },
  "globalDependencies": ["**/.env.*local"]
}
```
- **Note**: Uses Turbo v1 schema (`pipeline`), but root package pins `turbo ^2.4.0` which prefers `tasks` key. Should still work but emits deprecation warnings.

### vite.frontend.config.ts
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080, strictPort: true },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
```
- **Port**: `8080` (strict) — conflicts with Playwright baseURL default `localhost:5173`
- **Plugins**: React SWC + `lovable-tagger` (dev only) — legacy from Lovable.dev scaffold, candidate for removal
- **Aliases**: `@ → ./src` matches `tsconfig`/components.json expectations
- **⚠ Naming**: Non-standard `vite.frontend.config.ts`. Vite will pick up `vite.config.ts` by default — this file will NOT auto-load. Running `vite` needs `--config vite.frontend.config.ts` or the file must be renamed.
- **⚠ Missing**: No `build.rollupOptions.input` pointing at `index.frontend.html`, so build cannot find an HTML entry.

### tailwind.frontend.config.ts
```ts
export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}",
            "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: { container: {…}, extend: { colors: {…HSL vars…}, borderRadius: {…}, keyframes: {…}, animation: {…} } },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```
- **Theme**: Full HSL CSS-var scheme (`--background`, `--primary`, `--sidebar-*`, etc.) — consumed by shadcn primitives. CSS var definitions live in `src/index.css` (unread; Step 5+ task).
- **Plugins**: `tailwindcss-animate` only (required by shadcn Radix transitions)
- **⚠ Naming**: Non-standard. `components.json` explicitly expects `tailwind.config.ts` (see below) — **shadcn CLI will not find this file**.

### components.json (shadcn)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```
- **Aliases**: Match actual codebase — `@/components`, `@/lib/utils`, `@/components/ui`, `@/hooks`. ✔
- **⚠ Issue**: `tailwind.config` points at `tailwind.config.ts` which does not exist (actual file is `tailwind.frontend.config.ts`). `npx shadcn add <component>` will fail until one is renamed.

### vitest.config.ts
```ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['packages/*/src/**/*.test.ts', 'calendar-main/src/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'], thresholds: { lines: 80 } },
  },
})
```
- **⚠ Issue**: `include` glob `calendar-main/src/**/*.test.ts` assumes the frontend lives under `calendar-main/` (consistent with the broken `pnpm-workspace.yaml`). From the current root, tests at `src/services/__tests__/*.test.ts` are **not matched** — `pnpm test` finds 0 files.
- **Coverage**: 80% line threshold — will fail until actual test coverage is measured.

### playwright.config.ts
```ts
export default defineConfig({
  testDir: './e2e',
  baseURL: process.env.STAGING_URL ?? 'http://localhost:5173',
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox' } },
  ],
})
```
- **⚠ Port mismatch**: Playwright expects `5173`, but `vite.frontend.config.ts` sets port `8080` strict. E2E against a local dev server will hit wrong port unless `STAGING_URL` is set.
- **Dir**: `./e2e` — confirmed present at repo root.

### .gitignore
Standard Node/Python/test stack: `node_modules/`, `dist/`, `.next/`, `.env*.local`, `coverage/`, `.turbo/`, `test-results/`, `playwright-report/`, `__pycache__/`, `.venv/`, etc. Nothing Flow-specific.

---

## Sub-package / directory layout
- `packages/` — `shared-types/`, `supabase-client/`, `ui/` (workspace packages)
- `backend/` — FastAPI (`app/`, `tests/`, `Dockerfile`, `requirements.txt`)
- `flow-api/` — Secondary FastAPI sidecar per CLAUDE.md
- `supabase/` — migrations + RLS (separate scan)
- `src/` — Frontend
- `docs/vault/` — Obsidian vault

Each sub-package is expected to have its own `package.json` / `tsconfig.json` — not catalogued in this pass (Step 5+).

---

## Summary — action items before next `pnpm install`

1. **Rename or symlink** `vite.frontend.config.ts → vite.config.ts`, `tailwind.frontend.config.ts → tailwind.config.ts`, `index.frontend.html → index.html` (or update vite config to point at `index.frontend.html`).
2. **Create a `tsconfig.json`** (and `tsconfig.app.json` / `tsconfig.node.json`) covering `src/**`, with `paths: { "@/*": ["./src/*"] }`.
3. **Fix `pnpm-workspace.yaml`** — either move frontend into `./calendar-main/` subdir or change entry to `.` / remove.
4. **Fix `vitest.config.ts` include glob** to `src/**/*.test.ts` (or match post-fix workspace layout).
5. **Add a real frontend `package.json`** declaring all runtime deps (React 18, Vite, Tailwind, shadcn peers, dnd-kit, date-fns, sonner, react-router, react-i18next, recharts, react-markdown, remark-gfm, @tanstack/react-query, clsx, tailwind-merge, tailwindcss-animate, lovable-tagger, lucide-react).
6. **Align Vite port 8080 vs Playwright 5173** — pick one.
7. **Add `postcss.config.js`** with `tailwindcss` + `autoprefixer`.
8. **Add `eslint.config.js`** or drop the `lint` script.

---

## Related

- Packages: [[shared-packages]]
- Frontend: [[components]] · [[contexts]]
- Backend: [[api-endpoints]]
- Cleanup: [[dead-code-candidates]]
