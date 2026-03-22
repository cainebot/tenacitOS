# Phase 4: Animation Migration + Final Verification - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all motion.div, motion.span, and AnimatePresence in SmartAddModal.tsx with tailwindcss-animate equivalents. Migrate remaining var(--*) inline styles in SmartAddModal. Also migrate SkillPreviewCard.tsx and DiscoveryPanel.tsx (imported by SmartAddModal). Run final grep sweep across ALL Wave B+C files to confirm zero legacy tokens. Verify next build succeeds and functional correctness.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure/migration phase. Key notes:
- SmartAddModal.tsx already partially migrated — uses @circos/ui (Modal, ModalBody, Badge, Popover)
- Still has heavy inline style={{}} with var(--*) tokens
- motion imports from 'motion/react' (not framer-motion):
  - AnimatePresence wrapping review section
  - motion.div with initial/animate/exit for review card fade-in
  - Nested motion.div for skill card slide-up (y: 12 → 0)
  - AnimatePresence wrapping detection badge
  - motion.div for badge spring animation
  - motion.span for loading dots (looping pulse animation)
- Replace with CSS transitions + tailwindcss-animate classes:
  - fade-in → animate-in fade-in
  - slide-up → animate-in slide-in-from-bottom-2
  - spring badge → animate-in zoom-in
  - loading dots pulse → animate-pulse
  - AnimatePresence exit animations → CSS transition + conditional rendering
- SkillPreviewCard.tsx: 10+ var(--*), imports from @circos/ui already
- DiscoveryPanel.tsx: 6 var(--*), no special imports

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- tailwindcss-animate classes available: animate-in, fade-in, slide-in-from-bottom-*, zoom-in, animate-pulse, duration-*, fill-mode-forwards
- @circos/ui: Modal, ModalBody, Badge, Popover already imported by SmartAddModal
- cx() from @circos/ui for conditional classes

### Established Patterns
- Phase 1-3 established token mapping (var(--*) → Tailwind classes)
- Phase 2 replaced @keyframes fadeIn/pulse in boards/[id] with tailwindcss-animate

### Integration Points
- SmartAddModal is imported by skills/page.tsx (already migrated in Phase 1)
- SkillPreviewCard.tsx is imported by SmartAddModal
- DiscoveryPanel.tsx is imported by SmartAddModal

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the spec.

</specifics>

<deferred>
## Deferred Ideas

None — this is the final phase.

</deferred>
