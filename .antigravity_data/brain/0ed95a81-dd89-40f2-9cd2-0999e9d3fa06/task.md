# UX Overhaul & Bug/Performance Fixes

## Phase 1: Sidebar & Navigation
- [ ] Remove "Notlar" from sidebar nav
- [ ] Merge "Finans" + "İstatistikler" → "Raporlar" (tabbed page)
- [ ] Move "Ayarlar" to profile dropdown (with clinic name)
- [ ] Collapsible sidebar (icon-only toggle)
- [ ] Remove logo border/divider from top-left

## Phase 2: Header & Dashboard
- [ ] Simplify breadcrumb → just page title
- [ ] Remove "Hızlı İşlemler" section from dashboard
- [ ] Editable KPI cards (user picks which to show)

## Phase 3: Appointment Simplification
- [ ] Simplify status colors (CONFIRMED+ARRIVED → Bekliyor)

## Phase 4: Bug Fixes
- [x] Fix Dashboard hardcoded unread messages (connected to `api.getUnreadCount()`).
- [x] Remove unused `date-fns` imports from `statistics.service.ts`.
- [x] Fix `as any` type bypass in `finance.service.ts` for expense fetching.
- [x] Add proper date validation using `date-fns` `isValid` in `statistics.service.ts` (`parseDateRange`).

## Phase 5: Codebase Optimizations
- [x] Optimize `getPatientBalance` in `finance.service.ts` using Prisma `aggregate`.
- [x] Optimize `getSummary` in `finance.service.ts` using database-level aggregations.
- [x] Refactor `getOverview` in `statistics.service.ts` to use a single `groupBy` instead of multiple count queries.
- [x] Implement lazy loading strategy for patient detail page tabs and main patient list page.
  - [x] Reduced eager-loading depth on backend `findOne`.
  - [x] Require >=3 char search string to list patients on the `patients/page.tsx` view for performance.

## Phase 6: Mid-task User Requests
- [x] Move QuickSearch component to the right corner in the header.
- [x] Fix Dashboard severe hydration mismatch error due to date/time format SSR vs CSR.
- [x] Fix Layout hydration / Hooks hook order error (`Rendered more hooks than during the previous render`).
- [x] Revert actions / buttons inside headers to be placed properly in the page layout to restore UX.
