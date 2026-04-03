<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# landing

## Purpose
Landing page section components — each represents a visual section of the nesh.sh homepage.

## Key Files

| File | Description |
|------|-------------|
| `hero.tsx` | Hero section with headline and install command |
| `terminal-demo.tsx` | Interactive terminal demo showing nesh in action |
| `features.tsx` | Feature grid — models, agent capabilities, cost tracking |
| `how-it-works.tsx` | Three-step explanation of nesh workflow |
| `architecture.tsx` | Architecture diagram section |
| `cta.tsx` | Call-to-action section with install command |
| `nav.tsx` | Top navigation bar |
| `footer.tsx` | Page footer |
| `matrix-rain.tsx` | Animated matrix rain background effect |
| `fade-in.tsx` | Scroll-triggered fade-in animation wrapper |
| `theme-provider.tsx` | Dark/light theme context provider |
| `theme-toggle.tsx` | Theme toggle button |
| `github-icon.tsx` | GitHub SVG icon component |

## For AI Agents

### Working In This Directory
- Each file is one section — composed in `app/page.tsx`
- Animations use `motion` library (not framer-motion)
- `matrix-rain.tsx` uses canvas for the background effect
- `terminal-demo.tsx` simulates a nesh session with typed text animation

<!-- MANUAL: -->
