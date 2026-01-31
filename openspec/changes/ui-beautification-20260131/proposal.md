# Proposal: Frontend UI Beautification

## Context
CLI Config Manager 桌面应用需要从原型级 UI 升级为专业级视觉体验。

## Confirmed Constraints (User Approved)
- **Theme**: Dark mode only
- **Glass Effect**: Modal backdrop only
- **Animation**: Column container slide-in only
- **Dependencies**: lucide-react, clsx, tailwind-merge, @fontsource/inter

---

## Design Specification (Zero-Decision)

### DS-01: Color Palette (Semantic Tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `app-bg` | `#0f172a` (slate-900) | Window background |
| `app-surface` | `#1e293b` (slate-800) | Panels, sidebar |
| `app-surface-hover` | `#334155` (slate-700) | Hover states |
| `app-border` | `#334155` (slate-700) | All borders |
| `app-text` | `#f8fafc` (slate-50) | Primary text |
| `app-text-muted` | `#94a3b8` (slate-400) | Secondary text |
| `primary` | `#6366f1` (indigo-500) | Primary actions |
| `primary-hover` | `#4f46e5` (indigo-600) | Primary hover |
| `danger` | `#ef4444` (red-500) | Destructive actions |
| `danger-surface` | `rgba(239,68,68,0.1)` | Danger button bg |
| `success` | `#10b981` (emerald-500) | Success states |
| `focus-ring` | `#6366f1` (indigo-500) | Focus indicators |

### DS-02: Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Body | 14px (`text-sm`) | 400 | 1.5 |
| File names | 13px | 400 | 1.4 |
| Folder names | 13px | 500 | 1.4 |
| Headers | 16px (`text-base`) | 600 | 1.25 |
| Muted/Labels | 12px (`text-xs`) | 400 | 1.5 |

Font: Inter (via @fontsource/inter)

### DS-03: Spacing & Dimensions

| Element | Value |
|---------|-------|
| Toolbar height | 48px |
| Sidebar width | 200px |
| ColumnView row height | 32px |
| ColumnView row padding | `px-3 py-1.5` |
| Column default width | 220px |
| Column min width | 150px |
| Column max width | 400px |
| Button height (default) | 32px |
| Icon button size | 32x32px |
| Control height | 32px |

### DS-04: Border Radius

| Element | Value |
|---------|-------|
| Buttons | `rounded-md` (6px) |
| Panels/Cards | `rounded-lg` (8px) |
| Modal | `rounded-xl` (12px) |
| Inputs | `rounded-md` (6px) |
| Pills/Tags | `rounded-full` |

### DS-05: Shadows (Dark Theme Optimized)

| Element | Value |
|---------|-------|
| Modal | `shadow-2xl` + custom: `0 25px 50px -12px rgba(0,0,0,0.5)` |
| Dropdown | `shadow-lg` |
| Panels | None (use border only) |

### DS-06: Focus Ring

- Width: 2px
- Color: `focus-ring` (indigo-500)
- Offset: 2px
- Style: `ring-2 ring-primary ring-offset-2 ring-offset-app-bg`

### DS-07: Animation

| Animation | Duration | Easing | Transform |
|-----------|----------|--------|-----------|
| Column slide-in | 200ms | `ease-out` | `translateX(20px)` → `translateX(0)` |
| Modal fade-in | 150ms | `ease-out` | opacity 0→1 |
| Modal slide-in | 200ms | `ease-out` | `translateY(10px)` → `translateY(0)` |
| Hover transitions | 150ms | `ease-in-out` | - |

Reduced motion: `prefers-reduced-motion` → duration=0

### DS-08: Icons (Lucide)

| Context | Size | Stroke |
|---------|------|--------|
| Toolbar | 18px | 2 |
| File list | 16px | 2 |
| Inline actions | 14px | 2 |
| Empty states | 48px | 1.5 |

### DS-09: Scrollbar

| Property | Value |
|----------|-------|
| Width | 10px |
| Thumb color | `slate-700` |
| Thumb hover | `slate-600` |
| Track | transparent |
| Thumb radius | `rounded-full` |
| Visibility | Always visible |

### DS-10: Modal Overlay

- Background: `rgba(0,0,0,0.6)`
- Backdrop blur: `backdrop-blur-sm` (4px)
- Z-index: 50

### DS-11: Component-Specific

#### Sidebar
- Background: `app-surface`
- Active item: `bg-primary text-white`
- Inactive item: `text-app-text-muted hover:bg-app-surface-hover hover:text-white`

#### ColumnView Selection
- Selected row: `bg-primary text-white`
- Hover (unselected): `bg-app-surface-hover`
- Checkbox accent: `accent-primary`

#### Toolbar Buttons
- Primary: `bg-primary text-white hover:bg-primary-hover`
- Ghost: `text-app-text-muted hover:bg-app-surface-hover hover:text-white`
- Danger: `bg-danger-surface text-danger hover:bg-danger/20`

#### Empty States
- Icon: 48px, `text-app-text-muted`
- Text: `text-sm text-app-text-muted`

### DS-12: Disabled States
- Opacity: 50% (`opacity-50`)
- Cursor: `cursor-not-allowed`
- Apply to: text, border, icons equally

---

## Implementation Files

| File | Changes |
|------|---------|
| `tailwind.config.js` | Add semantic colors, animations, font |
| `src/renderer/index.css` | Scrollbar, selection, base styles |
| `src/renderer/App.tsx` | Refactor Navigation to Sidebar |
| `src/renderer/components/ColumnView.tsx` | Selection styles, animations |
| `src/renderer/components/FilePreview.tsx` | Typography, spacing |
| `src/renderer/components/FileOpsToolbar.tsx` | Button variants |
| `src/renderer/components/BackupManager.tsx` | Radix Dialog migration |
| `package.json` | Add dependencies |

---

## Success Criteria

1. All semantic tokens applied consistently
2. No hardcoded gray-* colors in components
3. Keyboard focus visible on all interactive elements
4. Modal uses Radix Dialog with proper accessibility
5. Column slide-in animation smooth at 60fps
6. Scrollbars styled consistently across all scroll areas
7. Icons replaced with Lucide throughout
