# NOWEN Blog AI Development Rules

## UI design skill

For every task involving frontend UI, UX, themes, layouts, components, motion, responsive behavior, accessibility, or visual review, read these files before changing code:

- `docs/skills/nowen-ui/SKILL.md`
- `docs/skills/nowen-ui/references/design-system.md`
- `docs/skills/nowen-ui/references/component-recipes.md`
- `docs/skills/nowen-ui/references/motion-responsive.md`
- `docs/skills/nowen-ui/references/source-map.md`

The skill defines the shared NOWEN product-family visual language. Apply it to the blog by adapting the design system, not by copying unrelated bookmark, weather, monitoring, or navigation business features.

## nowen-blog adaptation rules

1. Preserve the existing React 18, React Router, Vite, TanStack Query, pnpm workspace, and Tailwind CSS v4 architecture unless the task explicitly requests a migration.
2. Keep the current `html.dark` theme mechanism compatible.
3. Extend semantic CSS tokens before styling individual pages. Preserve existing `--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--brand`, and `--brand-2` variables as compatibility aliases when evolving the theme.
4. Do not add a Tailwind CSS v3 `tailwind.config.js`; this project uses Tailwind CSS v4.
5. Preserve routes, APIs, SEO behavior, data structures, permissions, and admin business logic during visual refactors.
6. Reading pages prioritize typography, contrast, code readability, and stable layout. Atmospheric effects must never reduce article readability.
7. Use glass, glow, Spotlight, border-beam, and Aurora effects selectively. Do not make every surface animated.
8. Disable or simplify mouse tracking, large blurred moving orbs, continuous glow, and expensive effects on mobile, low-power, lite, or reduced-motion states.
9. Mobile layouts must avoid horizontal scrolling, respect `env(safe-area-inset-bottom)`, and provide touch targets of at least 44px for primary controls.
10. Destructive actions keep explicit danger semantics and must not inherit the theme primary color.
11. Prefer reusable UI primitives over repeated long Tailwind class strings or scattered hard-coded colors.
12. Never import source code from `cropflre/NOWEN` blindly. Reimplement only the visual behavior appropriate to this project and its dependency set.

## Required verification

After frontend changes, run at minimum:

```bash
pnpm typecheck
pnpm build
```

For behavior covered by end-to-end tests, also run the relevant Playwright tests. Report changed files, verification results, responsive states checked, and any remaining risks.
