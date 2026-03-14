# Antigravity Task Redesign Strategy

This document outlines the strategic transformation of the Antigravity Task experience, moving from a standard management tool to a next-gen collaborative workspace.

---

## SECTION 1 — Diagnose the Problem

### 10 Reasons Why Most Task Pages Feel Bad
1.  **Context Switching Fatigue**: Opening a task requires a modal or page navigation, breaking the user's flow and mental model.
2.  **Input Friction**: Creating a task feels like filling out a tax form. Too many mandatory fields before the thought is even captured.
3.  **Visual Noise**: Over-reliance on borders, saturated colors, and heavy shadows creates a "busy" UI that increases cognitive load.
4.  **Static Data Relationship**: Tasks feel disconnected from the "work" (documents, code, chat). They are orphans in the system.
5.  **Modal Overload**: Using modals for everything. Modals are "interruption containers." They hide the background context you likely need to finish the task.
6.  **Filter Friction**: Users spend more time defining what they want to see than actually doing the work.
7.  **Search Blindness**: Searching for a task is slow and returns irrelevant results because of poor metadata indexing.
8.  **Ambiguous Status Logic**: Unclear transitions between "In Progress," "Blocked," and "Review."
9.  **Lack of Keyboard Latency**: Not being able to navigate, create, and assign tasks without touching the mouse.
10. **The "Enterprise" Stink**: Too many "helpful" features that clutter 90% of the screen for 10% of use cases.

### Common UX Mistakes & Anti-Patterns
*   **The "Everything is a Button" Trap**: Using standard buttons for inline actions. Modern UX uses click-to-edit and hover-disclosed controls.
*   **Poor Hierarchy**: Priority levels or labels competing for attention with the task title.
*   **Notification Spam**: Notifying everyone for every sub-change instead of batching or intelligent mentioning.

---

## SECTION 2 — Define the Ideal Task Experience

### The "Perfect" Feel
*   **Emotionally**: It should feel **calm and reliable**. Like a high-end notebook, not a spreadsheet.
*   **Visually**: High-density titles with low-density metadata. Use whitespace to separate *contextual groups*, not just elements. High contrast for content, low contrast for UI chrome.
*   **Interaction-wise**: **Inline-first**. Everything should be editable where it sits. Keyboard-driven navigation (Cmd+K menus, arrow key navigation).
*   **Performance-wise**: **Optimistic UI**. When I click "Complete," it happens instantly on the screen before the server even confirms. Zero perceived latency.

---

## SECTION 3 — Task Page Architecture Proposal

### The Antigravity "Hub" Layout
1.  **Navigation Sidebar (Left)**: Minimalist. "My Tasks," "Inbox," and "Projects."
2.  **View Header**: A thin bar for switching between **List**, **Board**, and **Timeline**.
3.  **Main Stage**:
    *   **Grouped List View**: The default. Grouped by "Status" or "Priority."
    *   **The Ghost Row**: A persistent, empty line at the bottom of every group for instant creation. Type + Enter.
4.  **Context Panel (Right)**: A sliding overlay (not a modal) that appears when a task is selected. This allows the user to see the list *and* the details simultaneously.

### The Assignment & Commenting UX
*   **Assignment**: Hover on a task to see a small "+" (plus). Click opens a circle-avatar search.
*   **Comments**: Threaded, emoji-rich, and markdown-supported. Integrated directly with the Document view so a task comment can "reference" a section of a doc.

---

## SECTION 4 — Advanced Interaction Ideas

### 1. Smart Grouping (AI-Assisted)
Instead of manual grouping, provide a "Magic Sort" that clusters tasks based on project velocity or upcoming deadlines.

### 2. Focus Mode
A keyboard shortcut (e.g., `Z`) that hides all sidebars and headers, leaving only the selected task and its immediate context.

### 3. The "Assigned to Me" Intelligence
A dashboard that doesn't just list tasks, but *recommends* the next 3 things to work on based on past completion times and priority.

---

## SECTION 5 — Frontend Design Guidelines

### Spacing & Grid
*   **Unit**: 4px base.
*   **Density**: 12px vertical padding on list items is the "sweet spot" for scanability without losing density.

### Card Design Principles
*   **No Borders**: Use subtle background shifts (`bg-accent/5`) instead of borders for containers.
*   **Status Colors**: Use **subtle indicators** (dot or thin line) rather than full-background colors.
    *   *Todo*: Muted Gray
    *   *Doing*: Primary Blue/Indigo
    *   *Done*: Success Green (Muted)
    *   *Blocked*: Muted Red

### Avatar Rules
*   Never use square avatars.
*   Active state: A subtle border ring.

---

## SECTION 6 — Critical Questions

1.  **User Archetype**: Is the primary user an Executor (dev/writer) or a Manager (director/admin)?
2.  **Execution vs. Communication**: Is the task the "destination" (Notion-style) or the "pointer" (Linear-style)?
3.  **B2B vs B2C**: Do we need enterprise-grade security/audit logs or simple collaborative speed?
4.  **Mobile Usage**: Is the mobile app for "consumption/checking" or "creation"?
5.  **Offline Support**: How critical is local-first data?
6.  **Dependency**: Do tasks *depend* on each other (Gantt) or are they independent?
7.  **Hierarchy**: Is there a limit to sub-tasks? (Infinitely recursive is a UX nightmare).
8.  **The "Docs" Relationship**: Should a Task *be* a Document, or *have* a Document?
9.  **Privacy**: Can tasks be private to a user within a shared space?
10. **Automation**: How much of the workflow should be automated vs. manual?
11. **External Access**: Will clients see these tasks?
12. **Notification Strategy**: Push vs In-app vs Email?
13. **Data Portability**: How easy is it to export this to CSV/JSON?
14. **Custom Fields**: Do users need to define their own metadata?
15. **The "Antigravity" Name**: Does the UI physically reflect "Antigravity" (floating elements, smooth vertical transitions)?

---

## SECTION 7 — Brutal Honesty

*   **The Problem**: Your current workspace is trying to do too much at once. The "Workspace" on `/tasks` is confusing. Is it a doc editor or a task manager? If it's both, they shouldn't fight for the same 800px of screen real estate.
*   **The Vision**: Notion is successful because of flexibility, but it's *slow*. Linear is successful because of speed, but it's *rigid*. Antigravity should be **Flexible Speed**.
*   **Cut the Crap**: Drop the full-screen modals. Drop the manual "Save" buttons. If a user has to click "Save" in 2026, the architecture is already legacy.
