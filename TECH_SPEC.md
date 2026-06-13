# Technical Specification — Group Trip Planner

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, latest stable) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Database | Supabase (Postgres) |
| Hosting | Vercel |
| Source control | GitHub |

Rationale: unified TypeScript across UI, API, and DB queries; hosted infra removes ops burden; well-trodden stack maximizes AI tooling support; production-grade so the POC doesn't need a rewrite.

## Project structure

```
app/
  page.tsx                      # home: "Create a trip"
  trips/
    new/page.tsx                # admin: create-trip form
    [tripId]/
      page.tsx                  # member: respond view
      admin/page.tsx            # admin: results view (token-gated)
  api/
    trips/
      route.ts                  # POST: create trip
      [tripId]/
        route.ts                # GET: trip metadata
        availability/route.ts   # POST: create or update member availability
        windows/route.ts        # GET: ranked windows (admin only)
components/
  ui/                           # shadcn components
  calendar-picker.tsx           # date-blocking calendar
  windows-list.tsx              # ranked results display
lib/
  supabase.ts                   # supabase client (server + browser)
  ranking.ts                    # window-ranking algorithm
  tokens.ts                     # token generation
  types.ts                      # shared TypeScript types
  validation.ts                 # input validation helpers
```

## Auth model

No user accounts. Two opaque tokens per trip:

- **`admin_token`** — 32-char random string. Required to view the admin page and modify trip settings. Passed in URL: `/trips/{tripId}/admin?t={admin_token}`.
- **`member_token`** — 32-char random string, one per member. Lets a member edit their own response. Passed in URL: `/trips/{tripId}?m={member_token}`.

**Every mutating endpoint must validate the relevant token server-side before writing.** Never trust the client.

## Data model

All tables live in Supabase Postgres.

### `trips`

| Column | Type | Notes |
|---|---|---|
| `id` | text | PK; nanoid; serves as URL slug |
| `admin_token` | text | secret; required for admin operations |
| `name` | text | required |
| `destination` | text | optional |
| `trip_length_days` | int | required; ≥ 1 |
| `search_window_start` | date | required |
| `search_window_end` | date | required; ≥ start |
| `allowed_days_of_week` | int[] | 0=Sun..6=Sat; default `[0,1,2,3,4,5,6]` |
| `expected_group_size` | int | required; ≥ 1 |
| `context` | text | optional; reserved for v2 LLM feature |
| `status` | text | enum: `open` \| `locked` \| `cancelled`; default `open` |
| `created_at` | timestamptz | default `now()` |

### `members`

| Column | Type | Notes |
|---|---|---|
| `id` | text | PK; nanoid |
| `trip_id` | text | FK → `trips.id`, on delete cascade |
| `name` | text | required |
| `member_token` | text | secret; required to edit own response |
| `created_at` | timestamptz | default `now()` |

### `availability`

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial | PK |
| `member_id` | text | FK → `members.id`, on delete cascade |
| `date` | date | a single blocked date |
| `status` | text | enum: `unavailable` (room to grow to `maybe` later) |

Unique constraint: `(member_id, date)`.

**Storage convention:** sparse. The absence of a row means the member is available on that date. Only conflicts are stored. This keeps the table small and matches the mental model.

### Indexes

- `members(trip_id)`
- `availability(member_id)`
- `availability(member_id, date)` — covers the uniqueness constraint

## API routes

### `POST /api/trips`
Create a trip.

**Request body:**
```ts
{
  name: string;
  destination?: string;
  tripLengthDays: number;
  searchWindowStart: string;    // ISO date "YYYY-MM-DD"
  searchWindowEnd: string;      // ISO date
  allowedDaysOfWeek?: number[]; // 0..6; defaults to all 7
  expectedGroupSize: number;
  context?: string;
}
```

**Response:**
```ts
{
  tripId: string;
  adminToken: string;
  shareUrl: string;   // absolute URL: /trips/{tripId}
  adminUrl: string;   // absolute URL: /trips/{tripId}/admin?t={adminToken}
}
```

### `GET /api/trips/[tripId]`
Public read of trip metadata. Used by the member response page. **Does not return `admin_token`.**

**Response:**
```ts
{
  id: string;
  name: string;
  destination: string | null;
  tripLengthDays: number;
  searchWindowStart: string;
  searchWindowEnd: string;
  allowedDaysOfWeek: number[];
  expectedGroupSize: number;
  status: "open" | "locked" | "cancelled";
  responseCount: number;
}
```

### `POST /api/trips/[tripId]/availability`
Create a new member response or update an existing one. If `memberToken` is provided, validate and update the existing member; otherwise create a new one.

**Request body:**
```ts
{
  name: string;
  blockedDates: string[];   // ISO dates
  memberToken?: string;     // present only on updates
}
```

**Response:**
```ts
{
  memberId: string;
  memberToken: string;
  editUrl: string;
}
```

Implementation note: on update, delete all existing `availability` rows for the member and re-insert. Simpler than diffing.

### `GET /api/trips/[tripId]/windows?t={adminToken}`
Admin-only. Validates the admin token, then returns ranked windows + full member roster.

**Response:**
```ts
{
  trip: { /* same shape as GET /api/trips/[tripId] */ };
  members: {
    id: string;
    name: string;
    blockedDates: string[];
  }[];
  windows: Window[];
}
```

## Key algorithms

### Window ranking — `lib/ranking.ts`

```ts
type Window = {
  start: string;                  // ISO date
  end: string;                    // ISO date
  fullyAvailable: number;
  partiallyAvailable: number;
  blockedMembers: { name: string; conflicts: string[] }[];
  score: number;
};

function rankWindows(trip, members, availability): Window[] {
  // 1. Generate every N-day window inside [search_window_start, search_window_end].
  // 2. Filter: keep only windows whose every date's weekday ∈ trip.allowed_days_of_week.
  //    (For a "Thu–Sun" 4-day trip, this means start must be a Thursday.)
  // 3. For each candidate window, partition members:
  //      fullyAvailable     = members with zero blocked dates in window
  //      partiallyAvailable = members with 1+ blocked dates
  //      blockedMembers     = the partial group plus their per-window conflict dates
  // 4. score = fullyAvailable * 2 + partiallyAvailable * 1
  // 5. Sort by: score desc, then fullyAvailable desc, then start asc
  // 6. Return top 5
}
```

Performance is trivial: a 90-day search window with 5-day trips is ~85 candidate windows; even a 10-person group is < 1000 comparisons.

### Token generation — `lib/tokens.ts`

Use `nanoid` (32 chars, URL-safe). Generate one `admin_token` per trip, one `member_token` per member.

## Validation rules

Enforce on the server in `POST /api/trips`:

- `searchWindowEnd >= searchWindowStart`
- `tripLengthDays >= 1` and `tripLengthDays <= (searchWindowEnd − searchWindowStart + 1)`
- `expectedGroupSize >= 1`
- `allowedDaysOfWeek` non-empty; all elements in 0..6
- `name` non-empty, max length 100 chars

Enforce on `POST /api/trips/[tripId]/availability`:

- `name` non-empty, max length 50
- Silently filter out blocked dates that fall outside the trip's search window
- If `memberToken` provided, it must match an existing member of this trip

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; never exposed to client
NEXT_PUBLIC_APP_URL=              # e.g. https://triptool.vercel.app — used to build shareable links
```

The service role key is used in API routes for writes. The anon key is used for any client-side reads (if any). Prefer server-side data fetching where possible.

## Mobile and link previews

- Add Open Graph + Twitter Card meta tags to `/trips/[tripId]` route
- Use Next.js dynamic `opengraph-image.tsx` to render a per-trip OG image showing trip name and response count (e.g. "Lisbon 2026 — 3 of 5 responded")
- Viewport meta tag for mobile
- All pages must work well at 375px width

## Explicit non-goals

Do NOT implement any of the following in v1:

- Authentication / user accounts / sessions
- Calendar integrations (Google, Apple, Outlook, ICS)
- Email or SMS notifications, reminders, digest emails
- Real-time updates, websockets, presence indicators
- A `maybe` status on availability — the schema reserves room but the UI must not expose it
- Preference weighting or ranked-choice voting
- LLM endpoints — the `context` column exists for v2 but no v1 code path reads it
- iMessage native extension
- Trip search, browse, or directory pages — every trip is accessed only via link
