# Today's Class Update — Plan

This turns the current Homework module into a richer "Today's Class Update" system without touching unrelated pages. Desktop keeps its layout; mobile gets a fully card-based responsive experience with a floating create button.

## 1. Rename & Navigation
- Rename sidebar entry, page header, and route metadata from "Homework" to "Today's Class Update".
- Keep the URL `/homework` to avoid breaking bookmarks and existing links (internal path only; UI label changes).
- Update mobile bottom nav label + icon tooltip.

## 2. Database (single migration)
Extend `homework` and add supporting tables:
- `homework`: add `subject`, `class_name`, `batch`, `topic`, `notice`, `due_date`, `priority` (enum normal/important/urgent), `attachments` (jsonb array of {name,url,type,size}), `audience_type` (class/batch/students), `audience_ids` (uuid[]), `completion_status` per row via new table below, `published_at`.
- New `homework_completion(homework_id, student_id, status: completed|partial|not_completed, marked_at)`.
- New `homework_templates(id, owner_id, name, subject, topic, homework, notice, priority, attachments)`.
- New `homework_reads(homework_id, student_id, read_at)` for "new until opened" badges.
- Storage bucket `homework-attachments` (private) with RLS: owners upload; students in audience can read.
- All tables get GRANTs + RLS scoped to `owner_id` (teacher) and audience membership (student).

## 3. Create/Edit Update Dialog
- Redesigned dialog with sections: **Basics** (Subject, Class, Batch), **Content** (Topic*, Homework*, Notice, Due Date), **Priority** (segmented control with colored badge preview), **Attachments** (drag/drop upload PDF/images/docs, list with remove), **Audience** (Entire Class / Specific Batch / Selected Students tabs).
- Actions: `Save as Template`, `Copy Previous Update` (opens picker of past updates → prefills), `Publish`.
- Priority badge colors reuse existing tokens: normal=secondary, important=warning-ish (amber), urgent=destructive.

## 4. Templates
- New tab "Templates" in the page. List cards with Use / Edit / Delete.
- "Save as template" from create dialog captures current fields.

## 5. History & Search (Teacher view)
- Tabs: **Updates** (default), **Templates**, **Reports**.
- Search bar + filters (Subject, Batch, Class, Date range). Sorted newest first.
- Each update card shows priority badge, subject, topic snippet, due date, audience summary, attachment count, completion stats.
- Expanding shows full content + per-student completion marking (Completed / Partial / Not completed).

## 6. Completion Tracking & Reports
- After due date, teacher marks each student's status inline. Header shows counts + completion rate.
- Reports tab: overall %, top missers list, class-wise / batch-wise / monthly bar summaries (simple aggregated cards using existing shadcn primitives — no new chart lib needed beyond existing recharts).

## 7. Student Dashboard
- Student role view: card feed of published updates targeted to them, newest first.
- Filters: Subject, Class, Batch, Date. Search box.
- Card shows subject, topic, homework, notice, due date, priority badge, published date, attachment list (view/download/preview images inline via dialog).
- Unread badge dot until student opens the card → writes `homework_reads` row. Nav shows count of unread.

## 8. Mobile UX
- Full-width rounded-2xl cards; no tables anywhere on mobile.
- Sticky FAB "＋ Create Update" (teacher) above bottom nav.
- Filter drawer instead of inline filter bar.
- 44px min touch targets, generous spacing.

## 9. Desktop UX
- Keep existing two-column feel; add filter row above the table/card grid.
- Table stays for update list on desktop with expandable rows for completion; other tabs use card grids.

## Technical notes
- Files to add: `src/lib/class-updates.functions.ts`, `src/components/create-update-dialog.tsx`, `src/components/update-card.tsx`, `src/components/attachment-uploader.tsx`, `src/components/completion-tracker.tsx`, `src/components/homework-reports.tsx`.
- File to overhaul: `src/routes/_authenticated/homework.tsx` (split teacher vs student view via role).
- One Supabase migration for schema + storage bucket + policies.
- Uploads via signed URLs from `homework-attachments` bucket; server function issues upload URLs; download via signed URL for private files.
- Reuse existing design tokens; no new colors beyond mapping priority → existing semantic tokens.

## Out of scope
- Push/email notifications (only in-app unread badge).
- Rich text editor (plain textarea kept for speed; can add later).
- Bulk CSV export of reports.

Proceeding after approval — this is a multi-file change (~8 files + 1 migration).
