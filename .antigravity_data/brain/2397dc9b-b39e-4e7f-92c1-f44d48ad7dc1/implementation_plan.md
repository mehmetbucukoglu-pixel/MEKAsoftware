# Replicating Notion Sidebar & Implementing Teamspaces

The user has requested to revert the recent "MacOS/Adobe" styling changes to the Workspace Sidebar and instead implement an exact replica of the provided Notion screenshot. Additionally, they have requested new architectural features: **Teamspaces** and **Private** document sections.

## User Requirements Analysis (from Screenshot & Prompt)
1. **Visual Style**: Exact Notion replica. Clean, flat, light gray background (`#F7F7F5` or similar), very subtle hover states, compact text (approx 14px), and specific iconography.
2. **Top Section**: Workspace Name (e.g., "Meka's Space") with a dropdown arrow and an edit/create icon.
3. **Core Links**: Search, Home, Inbox, etc. (We will adapt these to our context or keep them as UI placeholders if not fully functional).
4. **Sections**:
   - `Recents` (Currently active/edited docs)
   - `Private` (Documents only visible to the creator)
   - `Teamspaces` (Shared areas with specific users)

## Architectural Changes Needed (Database)
Currently, `WorkspaceDocument` has a many-to-many relationship with `User` via the `collaborators` field. To properly support "Teamspaces", we have two options:
**Option A (Simpler)**: Rely on the existing `collaborators` array. If `collaborators` is empty, it's `Private`. If it has users, it's under a "Shared" or "Teamspace" heading.
**Option B (Robust)**: Introduce a `Teamspace` model. A `Teamspace` has Members (`User`s) and Documents (`WorkspaceDocument`s). A document without a Teamspace is `Private`.

*Decision*: The prompt specifically mentions "Teamspacesler kısmı olsun ve teamspace oluşturulup kullanıcı hesapları eklenebilsin." This strongly implies **Option B** is required.

### 1. Database Schema Updates (`schema.prisma`)
*   **Create `Teamspace` Model**:
    *   `id` (String, uuid)
    *   `name` (String)
    *   `description` (String, optional)
    *   `icon` (String, optional)
    *   `clinicId` (String, references `Clinic`)
    *   `creatorId` (String, references `User`)
    *   `members` (Implicit m:n with `User`)
    *   `documents` (1:m with `WorkspaceDocument`)
*   **Modify `WorkspaceDocument` Model**:
    *   Add `teamspaceId` (String, optional, references `Teamspace`).
    *   *If `teamspaceId` is null, the document is considered Private to the `creatorId`.*
    *   (Optional: Keep `collaborators` for specific document-level overrides, but for simplicity, we might just rely on Teamspace membership for now).

### 2. Backend API Updates
*   **Teamspace CRUD**: Create endpoints in the `workspace` module to handle Teamspaces (Create, List, Add Member).
*   **Document Fetching**: Update `findAllDocuments` to group documents into `Private` (owned by user, no teamspace) and `Teamspace` (documents belonging to teamspaces the user is a member of).

### 3. Frontend Layout Updates
*   **Color Palette**: Revert to Notion's `#F7F7F5` base sidebar color.
*   **Typography**: Use standard Sans-serif, 14px for main items, 11px uppercase bold for section headers.
*   **Components**:
    *   Rewrite `WorkspaceSidebar.tsx` to match the exact DOM structure and styling of Notion.
    *   Implement collapsible sections (accordions) for `Recents`, `Private`, and `Teamspaces`.
    *   Rewrite `SortableNavItem` to be perfectly flat and square, matching the screenshot.

## Proposed Implementation Steps

1. **[EXECUTION] UI Revert & Reskin**: Immediately revert the Sidebar colors and layout to match the provided screenshot, using hardcoded data sections for `Private` and `Teamspaces` to quickly show visual progress.
2. **[EXECUTION] Database Migration**: Add the `Teamspace` model to Prisma and run the migration.
3. **[EXECUTION] Backend Logic**: Implement Teamspace DTOs, Service, and Controller endpoints. Update Document fetching logic.
4. **[EXECUTION] Frontend Integration**: Connect the new sidebar UI to the real Backend Teamspace data. Build a simple "Create Teamspace" dialog.

---
**Note**: This is a significant structural change. I will begin with Step 1 to immediately address the visual feedback while preparing the backend for the new Teamspace architecture.
