# Build Plan — Group Trip Planner

Build in order. Each milestone is independently shippable and has explicit acceptance criteria. Do not skip ahead.

---

## Milestone 0: Project setup

**Goal:** an empty deployed app.

- Initialize a Next.js project with TypeScript, Tailwind, and the App Router
- Initialize a Git repo and push to GitHub
- Create a new Vercel project linked to the GitHub repo
- Create a new Supabase project; copy URL and keys into Vercel env vars
- Install and initialize shadcn/ui with a base theme
- Add `nanoid` and `zod` (for input validation) as dependencies

**Acceptance:** an empty homepage is live at a Vercel URL. `git push` triggers a successful deploy.

---

## Milestone 1: Database schema

**Goal:** schema and types in place.

- Create the three tables (`trips`, `members`, `availability`) in Supabase with all columns, constraints, defaults, and indexes specified in `TECH_SPEC.md`
- Save the SQL migration in `/supabase/migrations/` so it's version-controlled
- Generate TypeScript types from the Supabase schema and check them in
- Create `lib/supabase.ts` exporting a server-side client (uses service role key) and a browser client (uses anon key)

**Acceptance:** schema is migrated. `lib/types.ts` exports typed `Trip`, `Member`, `Availability` interfaces. A test query from a server file works.

---

## Milestone 2: Admin create-trip flow

**Goal:** admin can create a trip and receive links.

- Build `/trips/new` page with a form for all `trips` fields per `PRD.md`
- Use shadcn `Form`, `Input`, `Calendar` (for date range), and `Select` components
- Implement `POST /api/trips`:
  - Validate input with zod per `TECH_SPEC.md` validation rules
  - Generate `id` and `admin_token` via nanoid
  - Insert into `trips`
  - Return `{ tripId, adminToken, shareUrl, adminUrl }`
- On successful submit, display both URLs with copy-to-clipboard buttons

**Acceptance:** filling out the form produces two working URLs. Invalid input (e.g. end date before start date) is rejected with a clear error.

---

## Milestone 3: Member response flow

**Goal:** members can mark conflicts and submit.

- Build `/trips/[tripId]` page:
  - Server-side fetch trip metadata via `GET /api/trips/[tripId]`
  - Show trip name, destination, search window
  - If `?m={memberToken}` is present, pre-fill the member's name and blocked dates
- Build `components/calendar-picker.tsx`:
  - Renders dates within `searchWindowStart..searchWindowEnd`
  - Dates whose weekday is not in `allowedDaysOfWeek` are visually disabled
  - Tap a date to toggle its blocked state
  - Pass an `onChange(blockedDates)` callback up
- Implement `POST /api/trips/[tripId]/availability`:
  - If `memberToken` provided: validate, delete existing availability rows, re-insert
  - Else: create new member with new `member_token`, insert availability rows
  - Filter out blocked dates outside the search window
  - Return `{ memberId, memberToken, editUrl }`
- After submit, show a confirmation screen with the edit link

**Acceptance:** a member opens the share link, marks dates, submits, sees a confirmation with an edit link. Opening that edit link pre-fills their previous response and lets them update it.

---

## Milestone 4: Admin results view

**Goal:** admin sees ranked windows.

- Implement `rankWindows()` in `lib/ranking.ts` per the algorithm in `TECH_SPEC.md`
- Write unit tests for `rankWindows` covering:
  - All members fully available → highest score wins
  - One member always conflicting → that member appears in `blockedMembers` for every window
  - `allowedDaysOfWeek` filter excludes invalid windows
- Implement `GET /api/trips/[tripId]/windows?t={adminToken}`:
  - Validate admin token
  - Fetch trip, members, availability
  - Call `rankWindows()`
  - Return per `TECH_SPEC.md`
- Build `/trips/[tripId]/admin` page:
  - Token-gated (read `?t={token}` from URL, send to API)
  - Show member roster with response status and count ("3 of 5 responded")
  - Render `components/windows-list.tsx` showing top 5 windows
  - Each window card shows: date range, fully-available count, partially-available count, and a collapsed list of who has conflicts on which days

**Acceptance:** admin opens admin link, sees response progress and ranked windows. Adding a new member response updates the rankings on page refresh.

---

## Milestone 5: Link previews and mobile polish

**Goal:** the shareable link feels native in iMessage.

- Add Open Graph and Twitter Card metadata to `/trips/[tripId]`
- Implement `app/trips/[tripId]/opengraph-image.tsx` to generate a dynamic OG image with the trip name and response count
- Verify mobile layout (375px width) for all three pages: create, respond, admin
- Test full flow on a real phone by sending the share link in an iMessage thread

**Acceptance:** pasting the share link in iMessage shows a rich preview card with trip name and response count. The full flow works smoothly on a phone with no horizontal scroll, tappable targets, or layout breaks.

---

## Milestone 6: Real users

**Goal:** prove the hypothesis.

- Use the app to plan a real trip with a real group of friends
- Capture friction points in a notes file
- Do NOT build new features until this is done

**Acceptance:** a real group has used the tool end-to-end and reached a decision on a date window without falling back to ad-hoc group-chat coordination.

---

## After Milestone 6

Only after a real trip is planned, consider in this order:

1. The `context` field + LLM tiebreaker layer
2. Notifications (email when responses come in)
3. "Maybe" tri-state availability if friction observed
4. Native iMessage extension (large investment; only if usage justifies it)
