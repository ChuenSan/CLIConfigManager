# PBT Properties: UI Beautification

## Visual Invariants

### INV-01: Color Token Consistency
**Property**: All background colors in rendered components MUST be from semantic token set
**Falsification**: Grep for `bg-gray-*`, `bg-slate-*` (raw) in component files → count should be 0
**Verification**: `rg "bg-(gray|slate)-[0-9]" src/renderer/components/`

### INV-02: Focus Ring Visibility
**Property**: Every interactive element (button, input, checkbox, link) MUST have visible focus ring when focused via keyboard
**Falsification**: Tab through all interactive elements → each must show ring-2 ring-primary
**Verification**: Manual keyboard navigation test

### INV-03: Contrast Ratio
**Property**: Text on all backgrounds MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
**Boundary Conditions**:
- `app-text` (#f8fafc) on `app-bg` (#0f172a) → 15.8:1 ✓
- `app-text-muted` (#94a3b8) on `app-bg` (#0f172a) → 7.1:1 ✓
- `white` on `primary` (#6366f1) → 4.6:1 ✓
**Verification**: Browser DevTools contrast checker

### INV-04: Animation Duration Bounds
**Property**: All animations MUST complete within 200ms (except modal which is 200ms)
**Falsification**: Measure animation duration via Performance API
**Verification**: `duration-200` class presence

### INV-05: Reduced Motion Respect
**Property**: When `prefers-reduced-motion: reduce`, all animations MUST have duration=0 or be disabled
**Falsification**: Enable reduced motion in OS → verify no visible animations
**Verification**: CSS media query `@media (prefers-reduced-motion: reduce)`

### INV-06: Icon Size Consistency
**Property**: Icons in same context MUST have identical size
**Boundary Conditions**:
- Toolbar icons: all 18px
- File list icons: all 16px
- Inline actions: all 14px
**Falsification**: Visual inspection of icon alignment

### INV-07: Scrollbar Presence
**Property**: Custom scrollbar styles MUST apply to all scrollable containers
**Falsification**: Find scrollable elements without custom scrollbar
**Verification**: `::-webkit-scrollbar` styles in index.css

### INV-08: Modal Accessibility
**Property**: Modal MUST trap focus, have aria-modal="true", and close on Escape
**Falsification**:
1. Open modal → Tab should cycle within modal only
2. Press Escape → modal should close
3. Check aria-modal attribute
**Verification**: Radix Dialog provides these by default

### INV-09: Selection State Idempotency
**Property**: Clicking same item twice MUST result in same visual state (selected)
**Falsification**: Click item → verify selected → click again → verify still selected
**Verification**: Manual interaction test

### INV-10: Hover State Reversibility
**Property**: Hover state MUST fully revert when mouse leaves element
**Falsification**: Hover → verify hover style → leave → verify original style
**Verification**: CSS transition on hover classes

## Behavioral Invariants

### BEH-01: Column Animation Direction
**Property**: New columns MUST always slide in from right
**Falsification**: Navigate into folder → verify column appears from right
**Verification**: `translateX(20px)` in animation keyframe

### BEH-02: Disabled State Interaction
**Property**: Disabled elements MUST NOT respond to click/hover
**Falsification**: Click disabled button → verify no action
**Verification**: `pointer-events-none` or `disabled` attribute

### BEH-03: Z-Index Layering
**Property**: Modal overlay MUST be above all other content
**Falsification**: Open modal → verify no content bleeds through
**Verification**: `z-50` on modal overlay

## Boundary Conditions

### BC-01: Empty Directory
**Input**: Directory with 0 files
**Expected**: Empty state with icon + message displayed

### BC-02: Long Filename
**Input**: Filename > 50 characters
**Expected**: Text truncated with ellipsis, full name in title attribute

### BC-03: Deep Nesting
**Input**: 10+ nested directories
**Expected**: Horizontal scroll enabled, columns don't overflow

### BC-04: Rapid Navigation
**Input**: Click 5 folders in < 1 second
**Expected**: Only final column animates, no animation queue buildup
