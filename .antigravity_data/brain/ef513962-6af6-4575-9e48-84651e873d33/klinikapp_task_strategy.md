# Klinikapp Task Redesign: Strategic Architecture & UX Blueprint

This document outlines the pivot from a generic Task Manager to a specialized, lightweight **Clinic Coordination Layer** for Klinikapp.

---

## PHASE 1 — CODE & ARCHITECTURE AUDIT

### Structural Problems Identified:
1.  **Monolithic Component**: `tasks/page.tsx` is an all-in-one file (400+ lines) handling document state, task creation, viewing, and editing. This violates SRP and makes UI evolution brittle.
2.  **Prop Drilling & Shallow State**: Backend integration for tasks is nested inside the document fetch, creating tight coupling. If we want a global task list, we have to refetch or duplicate logic.
3.  **Manual "Save" Ritual**: The requirement for a Save button on a doc-style page is a performance and UX anti-pattern.
4.  **Over-Rendering**: Any change in `newTaskTitle` triggers a full re-render of the Workspace container including the document content textarea.
5.  **Coupling**: The Task model is physically tied to `WorkspaceDocument`. In a clinic, a task might be "Call Patient X," which shouldn't require a document.

---

## PHASE 2 — PRODUCT REPOSITIONING

### The "Clinic Coordinator" Philosophy
This is not for "sprints." It's for **"Daily Operations."**

*   **What are Tasks?**: They are "Actionable Reminders." 
*   **Who creates them?**: 
    *   **Doctors**: To assign follow-ups to assistants.
    *   **Assistants**: For administrative prep.
    *   **System (Auth-gen)**: For routine maintenance or patient check-ins.
*   **Context**: 70% Patient-linked, 30% Internal (e.g., "Order more gloves").
*   **Nature**: Communication-first. A task is a promise to your teammate.

---

## PHASE 3 — NOTION-INSPIRED INTERFACE

### The Layout Structure
`TaskPage` (Lightweight Wrapper)
├── **Subtle Header**: Breadcrumbs + Search.
├── **View Switcher**: Two views ONLY (Inbox/List & Kanban). *Remove Timeline/Calendar/Gantt.*
├── **TaskList**: Grouped by Status.
│   └── **The "Ghost Input"**: An empty row that says "+ New Task" for instant typing.
└── **Detail Drawer**: A non-intrusive side panel that slides in from the right.

### Simplification Logic
*   **Necessary**: Status, Assignee, Patient Link, Comments.
*   **DELETE**: Priority (Muted/High is enough), Points/Hours, Epic/Project tagging, Complex nested sub-tasks.
*   **Density**: High density. List items 36px in height. Clear typography hierarchy.

---

## PHASE 4 — UX BEHAVIOR MODEL

1.  **Creation**: Inline-first. Press `Enter` in the ghost row to create. 1s later, focus stays in the row for the *next* task.
2.  **Assignment**: Clicking the avatar opens a dropdown index of clinic staff. Simple.
3.  **Comments**: Integrated at the bottom of the Detail Drawer. Mentions (@doctor) trigger in-app notifications.
4.  **Done State**: Checking a box triggers a subtle "strike-through" and color dim. Completed tasks stay visible for 3 seconds, then collapse into a "Recently Completed" hidden group.
5.  **Permissions**: Admin sees all. Others see "Assigned to Me" + "Created by Me" + "Public Board."

---

## PHASE 5 — VISUAL DESIGN RULES

*   **Spacing**: 8px increments.
*   **Cards**: NO. Use **Border-less Rows** with a background hover (`bg-accent/30`). Cards feel like containers; rows feel like a list of things to do.
*   **Border Radius**: `12px` (Medium-round) to keep it friendly but professional.
*   **Avatar**: `24px` for lists, `32px` for detail panel.
*   **Dark Mode**: Deep `#0A0A0A` backgrounds with `#171717` panels. Text in `zinc-400`.

---

## PHASE 6 — SIMPLIFICATION PASS (THE "NO" LIST)

*   **NO** Sprint/Scrum terminology.
*   **NO** Gantt charts or complex dependencies.
*   **NO** "Story Points."
*   **NO** heavy modals that obscure the patient data you might be referencing.

---

## PHASE 7 — REFACTORING PLAN (MVP)

### 1. Component Refactor
*   `TaskInbox.tsx`: The main list component.
*   `TaskRow.tsx`: Handle inline editing and checkbox logic.
*   `TaskDetailPanel.tsx`: The side-drawer for comments and metadata.

### 2. State Model
*   Move to **SWR/TanStack Query** for task fetching. Standardize the `Task` type to include an optional `patientId`.

### 3. Data Schema Improvement
*   Detach `Task` from `WorkspaceDocument` as a mandatory relation. Make `documentId` optional.

### 4. V1 vs V2
*   **V1**: List View, Inline Create, Quick Assign, Status Toggle.
*   **V2**: Kanban, AI auto-linking tasks to clinical notes.
