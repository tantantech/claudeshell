<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# app

## Purpose
Next.js 16 App Router — root layout, home page, and global styles.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout with metadata, fonts, theme provider |
| `page.tsx` | Home page — composes all landing sections |
| `globals.css` | Global styles, Tailwind imports, custom CSS |
| `favicon.ico` | Site favicon |

## For AI Agents

### Working In This Directory
- `page.tsx` imports and composes all section components from `components/landing/`
- Sections: MatrixRain → Nav → Hero → TerminalDemo → Features → HowItWorks → Architecture → CTA → Footer
- Uses `FadeIn` wrapper for scroll-triggered animations

<!-- MANUAL: -->
