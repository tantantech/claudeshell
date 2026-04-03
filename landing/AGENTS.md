<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# landing

## Purpose
Marketing landing page for nesh.sh — Next.js 16 with React 19, Tailwind CSS 4, and motion animations.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Next.js 16, React 19, Tailwind 4, motion, shadcn |
| `postcss.config.mjs` | PostCSS config for Tailwind |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Source code (see `src/AGENTS.md`) |
| `public/` | Static assets served at root |

## For AI Agents

### Working In This Directory
- **CRITICAL**: Next.js 16 has breaking changes — check `node_modules/next/dist/docs/` first
- Uses Tailwind CSS v4 (not v3) — different config syntax
- Animations via `motion` library (not framer-motion)
- shadcn components in `src/components/ui/`
- Run `npm run dev` from this directory for local development

### Testing Requirements
- `npm run lint` for ESLint checks
- `npm run build` to verify production build

## Dependencies

### External
- `next` 16.2.2 — React framework
- `react` 19.2.4 — UI library
- `motion` — Animations
- `shadcn` — UI component library
- `tailwindcss` v4 — Utility-first CSS
- `lucide-react` — Icons

<!-- MANUAL: -->
