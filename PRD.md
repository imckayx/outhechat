# Product Requirements — Group Trip Planner

## Problem

Group trip planning dies in the "when can everyone go?" phase. Coordinating availability across a group chat is high-friction: people compare calendars, message back and forth, momentum dies, and the trip never happens.

## Hypothesis

A lightweight, link-based tool that lets one person create a trip and collects availability from members — then surfaces the best date windows — removes enough friction to make trip planning actually happen.

## Target user

- Friend or family groups planning casual trips (long weekends, vacations)
- Coordinated by one organizer (the **admin**), with 2–10 members
- Bonus context: feels native when shared in group chats (iMessage, WhatsApp)

## Design principles

- **No accounts.** Link-based access only. Zero signup friction.
- **Mobile-first.** Most members will respond from their phone while sitting in a group chat.
- **Honest ranking.** Rarely will everyone be 100% free — surface tradeoffs, don't fake a winner.
- **Default to free.** Members mark conflicts, not availability. Less work, matches how people think about their calendar.

## User types

### Admin
The person creating the trip. They have an `admin_token` that lets them view all responses, edit trip settings, and lock the trip.

### Member
A person responding to a trip. They have a `member_token` tied to their entry, letting them update their availability later.

## Core flows

### Flow 1: Admin creates a trip
1. Land on home page → "Create a trip"
2. Fill out:
   - Trip name (required)
   - Destination (optional)
   - Trip length in days (required)
   - Search window: earliest and latest dates to consider (required)
   - Allowed days of week (default: all 7; e.g. could restrict to Thu–Sun for long-weekend trips)
   - Expected group size (required; powers "3 of 5 responded" UI)
   - Optional context field (reserved for the v2 LLM layer)
3. Submit → receive two URLs:
   - **Share link** to send to the group
   - **Admin link** (private; for viewing results and managing the trip)

### Flow 2: Member responds
1. Open the share link
2. Enter name
3. See a calendar showing the admin's search window. Days outside `allowed_days_of_week` are visually disabled.
4. Tap dates they CAN'T make it (conflicts only)
5. Submit → confirmation screen with an "edit your response" link (uses their `member_token`)

### Flow 3: Admin reviews results
1. Open admin link
2. See:
   - Member roster with response status ("3 of 5 responded")
   - Top 5 ranked candidate windows
   - Per-window breakdown: who's fully available, who has conflicts on which days
3. Optional: lock the trip (freezes responses) or share final window with the group

## Window ranking

For every valid N-day window inside the search range (one whose dates all fall within allowed days of week):

- `fully_available` = members with zero blocked dates in the window
- `partially_available` = members with 1+ blocked dates
- `score` = `fully_available × 2 + partially_available × 1`

Return the top 5 windows, tiebreaking by `fully_available` count, then earliest start date.

## In scope for POC

- Single-page link-based flow described above
- Manual availability entry via a date-blocking calendar
- Binary availability: available (default) or unavailable
- Top-windows view for the admin
- Mobile-responsive web app
- Rich link previews for iMessage / WhatsApp (Open Graph tags, dynamic OG image)

## Out of scope (v2 or later)

Do NOT build any of the following in v1:

- User accounts, login, or password reset
- Calendar integrations (Google, Apple, Outlook)
- Email or SMS notifications, reminders
- Voting on a shortlist of windows
- LLM context layer for qualitative tiebreakers
- Native iMessage app extension
- "Maybe" tri-state availability
- Preference weighting or date ranking
- Cost, weather, or flight-data integration
- Real-time updates (page refresh on load is fine)

## Future: LLM layer

Once the core coordination works, the admin's `context` field becomes input to an LLM that picks among the top windows and explains why. Example admin context: *"4 of us flying to Lisbon, two have kids, want good weather, mid-budget, prefer not the week of July 4."* The LLM weighs:

- Travel logistics (origin cities)
- Group composition (kids, dietary needs, etc.)
- Trip purpose (chill / active / event-based)
- Seasonal or contextual factors

The `context` column already exists in the schema for v1 so this layer can be added without migration.

## Future: iMessage extension

A native iOS app + iMessage extension wrapping the same backend. Link-based approach continues to work for Android and non-iMessage chats; native is a v2 enhancement.

## Success criteria

- Admin can create a trip and get a link in under 60 seconds
- Member can respond in under 90 seconds on mobile
- A real group of friends uses the tool end-to-end to plan an actual trip without falling back to group-chat coordination
