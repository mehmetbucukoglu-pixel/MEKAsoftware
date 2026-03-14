# Frontend Refactor: Legendary Minimalistic UI & Task Strategy Phase 2

This plan outlines the steps to transform the KlinikApp frontend into a premium, state-of-the-art interface while completing the technical goals of the Task Strategy.

## User Review Required

> [!IMPORTANT]
> This refactor will significantly change the layout of the "Workspace" (Tasks) page to be more action-oriented and less document-centric, as per the "Clinic Coordinator" philosophy.

## Proposed Changes

### 🛠️ Infrastructure
- **[NEW]** Install `@tanstack/react-query`.
- **[NEW]** Setup `QueryProvider` in `frontend/src/app/layout.tsx`.

### 🎨 Design System
#### [MODIFY] [globals.css](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/globals.css)
- Refine color palette with more sophisticated HSL/OKLCH values.
- Add premium shadow tokens and glassmorphism utilities.
- Implement smooth transitions and micro-animations for all interactive elements.
- Clean up redundant styles.

### 🧩 Components
#### [MODIFY] [TaskRow.tsx](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/components/workspace/TaskRow.tsx)
- Redesign for high density (36px height).
- Add subtle hover effects and improved typography.
- Implement inline title editing with zero-flicker feedback.

#### [MODIFY] [TaskList.tsx](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/components/workspace/TaskList.tsx)
- Improved grouping and "Ghost Input" experience.
- Better visual separation between Done and Todo states.

### 📄 Pages
#### [MODIFY] [tasks/page.tsx](file:///c:/Users/Lenovo/.gemini/antigravity/scratch/klinikapp/frontend/src/app/(app)/tasks/page.tsx)
- Transition from `useEffect` state to TanStack Query hooks.
- Decouple the "Actionable Reminders" from the Workspace Document.
- Implement the "Detail Drawer" as the primary way to interact with tasks.
- Shift the layout to a more focused "Clinic Coordinator" view.

## Verification Plan

### Automated Tests
- Verify successful build of the frontend.
- Check browser console for any React Query related errors.

### Manual Verification
- Test "Ghost Input" task creation (Enter to submit, stay focused).
- Verify Sidebar drawer slides in smoothly.
- Check responsive behavior of the new minimalistic layout.
- Ensure "Dark Mode" looks premium and consistent.
