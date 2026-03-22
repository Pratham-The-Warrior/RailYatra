# 🎨 RailYatra — Frontend Documentation

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | ~5.8 | Type safety |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Framer Motion | 12 | Animations & transitions |
| Lucide React | 0.564 | Icon library |
| Inter (Google Font) | — | Primary typeface |

---

## Navigation Model

**No React Router.** `App.tsx` manages a single `currentPage` state:

```typescript
type Page = 'home' | 'schedules' | 'live-status' | 'category-routes'
```

All navigation is handled by `handleNavigate()` passed as an `onNavigate` prop to every page. Cross-page data (selected train number, category id/name) is also lifted to `App.tsx` state.

**Limitation**: Browser back-button and deep-linking are not supported.

---

## File Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.app.json
└── src/
    ├── index.tsx               — React root mount (ReactDOM.createRoot)
    ├── index.css               — Global styles, Tailwind directives, custom utilities
    ├── types.ts                — Shared TypeScript interfaces
    ├── App.tsx                 — SPA state machine / top-level router
    ├── components/
    │   ├── Navbar.tsx          — Fixed top navigation bar
    │   ├── Footer.tsx          — Page footer
    │   ├── SearchForm.tsx      — From / To / Date search form
    │   ├── StationSearchInput.tsx  — Debounced autocomplete input
    │   ├── RouteCard.tsx       — Route result card with leg timeline
    │   ├── Schedules/          — Decomposed lookup views
    │   │   ├── SchedulesLanding.tsx
    │   │   ├── SchedulesResult.tsx
    │   │   └── SchedulesError.tsx
    │   └── LiveStatus/         — Decomposed tracking views
    │       ├── LandingView.tsx
    │       ├── LandingDashboard.tsx (Recent Searches)
    │       ├── SearchHero.tsx
    │       ├── TrackingResults.tsx
    │       └── TrackingSidebar.tsx
    └── pages/
        ├── Home.tsx            — Hero, search, results, special trains
        ├── Schedules.tsx       — Orchestrator for lookup views
        ├── LiveStatus.tsx      — Orchestrator for tracking views
        └── CategoryRoutes.tsx  — Premium category train chart
```

---

## Shared Types (`types.ts`)

```typescript
interface RouteStep    // One leg of a multi-train journey
interface Route        // Complete journey (legs[], total_time, total_distance, switches)
interface SearchParams // Route search form payload
interface Station      // { code, name } — used in autocomplete
```

> **Note**: `TrainSchedule`, `LiveStatusResponse`, and `TrainRoute` are defined as **local interfaces** inside their respective page files — not shared via `types.ts`.

---

## Global Styles (`index.css`)

- Imports **Inter** from Google Fonts (weights 300–900).
- Sets `font-family: 'Inter'` on `body`.
- Headings reference `'Plus Jakarta Sans'` but **this font is never imported** — they silently fall back to Inter.
- CSS custom properties defined under `:root` (`--brand-blue`, `--bg-main`, etc.) but are largely unused — Tailwind classes are used directly everywhere instead.
- Custom utility classes:
  - `.premium-gradient` — radial gradient background (blue tint blobs).
  - `.glass-card` — `bg-white/80 backdrop-blur-md border border-white/20 shadow-xl`.
  - `.shadow-premium` — soft layered box shadow.
- Smooth scroll, thin scrollbars on `.overflow-x-auto`, and global `transition` on all interactive elements.

---

## Components

### `Navbar.tsx`

**Props**: `onNavigate`, `currentPage`

- Fixed, glassmorphic (`bg-white/70 backdrop-blur-md`), `z-50`.
- Logo click → navigates home.
- Desktop nav: **3 real links** (Home, Schedules, Live Status) + "My Bookings" & "Alerts" (`href="#"`, non-functional) + "Login" button (non-functional).
- Mobile: Framer Motion `AnimatePresence` collapse/expand hamburger menu.
- Active page highlighted in `text-orange-500`.
- **`category-routes` has no navbar entry** — only reachable via Home page cards.

---

### `SearchForm.tsx`

**Props**: `onSearch(params, fromDisplay, toDisplay)`, `isLoading`

- Manages `SearchParams` state internally + two separate display strings (`fromDisplay`, `toDisplay`).
- Defaults: today's date, `max_switches: 5`, `max_wait: 600`, `sort_by: 'switches'`, `top_k: 10`.
- **Swap button** correctly inverts both the station codes and the display strings.
- Date input has `min` set to today (past dates blocked in UI).
- Submit button shows a spinner when `isLoading`.

---

### `StationSearchInput.tsx`

**Props**: `value`, `onChange(code, display)`, `placeholder`

- **200ms debounced** `fetch` to `/api/stations?q=...` on every keystroke (min 2 chars).
- Animated dropdown (Framer Motion: `opacity + y + scale`).
- Click-outside closes dropdown via `mousedown` listener on `document`.
- Selection format: `"Station Name (CODE)"` — passes `code` to parent, display string to input.
- **No keyboard navigation** (arrow keys / Enter to pick suggestion not implemented).
- **No loading indicator** while fetching suggestions.
- Silently swallows fetch errors.

---

### `RouteCard.tsx`

**Props**: `route: Route`, `index: number`

- Entrance animation: `opacity 0→1, scale 0.98→1`, staggered by `index * 0.1s`.
- **Header**: Total time, total distance, Direct/N-Changes badge (green for direct, slate for transfers).
- **Leg timeline**: vertical dashed line (`border-dashed border-blue-100`), one leg per train.
  - Train name, number, type badge, available classes.
  - Departure and arrival grid (time + station name/code).
- **Transfer cards** rendered between legs:
  - Calculates wait time by parsing `HH:MM` — correctly handles midnight rollover with `+1440`.
  - Shows transfer station name and wait duration (`Xh Ym`).

---

### `Footer.tsx`

Static footer component. No interactive logic.

---

## Pages

### `Home.tsx` (350 lines)

**State**: `routes[]`, `loading`, `error`, `searched`, `recentSearches[]`

**Sections**:
1. **Hero** — large heading, tagline, `SearchForm`, blur blob decoration.
2. **Quick Services** — 2-card grid (Schedules, Live Status). Grid is 4 columns but only 2 are filled → blank space.
3. **Recent Searches** — persisted in `localStorage` (`railyatra_recent_searches`), max 5, clickable to re-run.
4. **Special Trains** — 3 `SpecialTrainCard`s (Vande Bharat, Tejas, Gatiman). "View Routes" → navigates to `category-routes`. "View all collections" link is `href="#"` (dead). Heart button is decorative (no handler).
5. **Results** — list of `RouteCard`s; scrolls to `#results` anchor 100ms after fetch completes.

**API call**: `POST /api/route` with `SearchParams` body.

**Error handling**: two separate try/catch blocks — one for network failure, one for JSON parse failure. Both produce a user-friendly message.

---

### `Schedules.tsx`

**State**: `trainNumber`, `loading`, `schedule`, `error`, `recents[]`

**Architectural Note**: This page is an orchestrator that switches between views stored in `src/components/Schedules/`.

**4 render states**:
| State | Condition |
|---|---|
| Landing / Search | `!schedule && !loading` |
| Loading | `loading === true` |
| Error | `error && !schedule && !loading` |
| Results | `schedule !== null` |

**Landing view**:
- Search bar with inline submit button.
- Recent train hint (first item in recents) + Popular: "Vande Bharat" quick-search.
- 2-column grid: **Popular Trains** (4 hardcoded cards) + **Recent Searches** from `localStorage` (`railyatra_recent_schedules`).
- Right sidebar: **Pro Tips** + **"Planning a Trip?"** CTA (non-functional "Check PNR Now" button).

**Results view**:
- **Train Header Card**: train number + name, source → destination, Daily/Limited badge.
  - "Check Availability" button — non-functional.
  - "Live Status" button — non-functional (no `onNavigate` call wired).
  - "Download PDF" link — uses `href="#"` instead of `pdfUrl`.
- **Amenity strip**: Onboard Catering, WiFi, Charging, First Aid (static, not from data).
- **Timetable** (responsive grid):
  - Desktop: 5 columns — Station, Arrive/Depart, Halt, Distance, Day.
  - Mobile: 2 columns — Station (with inline day), Arrive/Depart (with inline halt).
  - Green dots for first/last stop, grey for intermediates.
- **Journey Stats sidebar**: Total Distance, Total Duration (accounts for `day_of_journey`), Avg. Speed.
- **Route Visualizer**: SVG with **hardcoded cubic bezier curve**. Stations plotted at evenly-spaced `t` values. Purely decorative — not geographically accurate.

**`computeHalt()`** helper: calculates halt duration from arrival and departure times; handles midnight crossing.

**`titleCase()`** helper: capitalizes each word, keeps 1–2 char words uppercase (station codes), normalizes "Jn".

---

### `LiveStatus.tsx`

**State**: `trainNumber`, `loading`, `statusData`, `error`, `recents[]`, `refreshing`

**Architectural Note**: Decomposed into logical components under `src/components/LiveStatus/`.

**4 render states** (same pattern as Schedules).

**Landing view**:
- Emerald color scheme.
- Animated "LIVE TRACKING" pill badge with pulsing `Radio` icon.
- **Recent Searches**: Persisted in `localStorage` under `recent_live_status`.
- **Back Button**: Absolutely positioned (independent of content) to sit cleanly under the fixed navbar.
- Same layout as Schedules landing: Popular Trains + Recent Searches grid + right column tips.

**Loading state**:
- **1.5s minimum spinner** enforced via `Promise.all([fetch, new Promise(r => setTimeout(r, 1500))])`. Prevents flash on cached responses.
- Spinner has a centered pulsing `Radio` icon inside.

**Results view**:
- **Header Card**: train number, Running/Yet-to-Start badge (pulsing Radio icon), current location, start date, last updated timestamp, total stations.
- **Refresh button** re-fetches and disables + shows `animate-spin` while in-flight.
- **"Schedule" button** → `onNavigate('schedules')` (functional, unlike the reverse).
- **"Yet to Start" state**: amber full-width card with clock icon.
- **Live Itinerary timeline**:
  - Vertical line connecting dots, color-coded: green (source) / orange (destination) / red (delayed) / green (on time).
  - Each stop card: station name, Source/Destination badges, platform number (if not N/A), status badge, Arrival and Departure time grids.
  - **Scheduled vs. actual**: if `act_arr !== sch_arr`, scheduled time shown struck-through beside actual.
- **Right Sidebar**:
  - Current Location card (emerald gradient) with inline Refresh button.
  - Journey Summary: total stations, source, destination.
  - Delay count card — "All stations on time!" (green) or "N stations delayed" (red).

**`titleCase()`**: duplicated verbatim from `Schedules.tsx`.

---

### `CategoryRoutes.tsx` (315 lines)

**Props**: `category`, `categoryName`, `onNavigate`, `onViewTrain`

**State**: `trains[]`, `loading`, `error`, `searchQuery`

- Fetches `/api/category/:category` on mount (re-fetches if `category` prop changes).
- **Client-side search filter** across train number, name, source station, destination station.
- **Dual layout**:
  - **Desktop table** (`hidden lg:block`): Sr. No., Train Info, Source & Dep., →, Dest. & Arr., Runs On (day grid), Action button.
  - **Mobile cards** (`lg:hidden`): Departure/Arrival times, train icon separator, classes badges, "View Schedule →".
- **Operating days grid**: M/T/W/T/F/S/S; orange if running, grey if not.
- "View Details" / card tap → `onViewTrain(train.train_number)` → navigates to Schedules with that train pre-loaded.
- Empty search result: friendly "No matching routes" state.
- Sticky sub-header (below Navbar) with back button and desktop search input.

---

## API Calls Summary

| Page / Component | Method | Endpoint | Notes |
|---|---|---|---|
| `StationSearchInput` | GET | `/api/stations?q=...` | 200ms debounced, silent fail |
| `Home` | POST | `/api/route` | Body: `SearchParams` |
| `Schedules` | GET | `/api/schedule/:trainNumber` | Padded to 5 digits by backend |
| `LiveStatus` | GET | `/api/livestatus/:trainNumber` | 1.5s min spinner; 30s server-side cap |
| `CategoryRoutes` | GET | `/api/category/:category` | Fetches on mount & category change |

---

## localStorage Keys

| Key | Used In | Contents | Max Items |
|---|---|---|---|
| `railyatra_recent_searches` | `Home.tsx` | `{ from, fromDisplay, to, toDisplay, date }[]` | 5 |
| `railyatra_recent_schedules` | `Schedules.tsx` | `{ trainNumber, trainName, timestamp }[]` | 5 |
| `recent_live_status` | `LiveStatus.tsx` | `{ trainNumber, timestamp }[]` | 5 |

---

## Known Issues & Gaps

| # | Severity | Description |
|---|----------|-------------|
| 1 | Medium | `Plus Jakarta Sans` referenced in heading CSS but never `@import`-ed — falls back to Inter silently |
| 2 | Medium | `titleCase()` helper duplicated in `Schedules.tsx`, `LiveStatus.tsx`, and `CategoryRoutes.tsx` — should be a shared utility (`src/utils/text.ts`) |
| 3 | Medium | `StationSearchInput` has no keyboard navigation (no arrow key / Enter to select) |
| 4 | Medium | No React Router — browser back button and deep-linking don't work |
| 5 | Low | Dead UI elements: "My Bookings", "Alerts", "Login", "Check Availability", heart button, "Check PNR Now", "View all collections", Download PDF `href="#"` |
| 6 | Low | Home Quick Services grid has 4 columns but only 2 cards — leaves blank visual space |
| 7 | Low | Schedules "Live Status" button has no `onClick` — it renders but does nothing |
| 8 | Low | `category-routes` page has no navbar link — only reachable via Home special train cards |
| 9 | Low | `StationSearchInput` shows no loading indicator while fetching suggestions |
| 10 | Info | Route Visualizer SVG is hardcoded / decorative — not a real geographic map |

---

## Strengths

- Consistent **orange / slate** design language across all pages.
- **Framer Motion** entrance animations on every section and list item.
- Fully **responsive** — every page has dedicated mobile and desktop breakpoints.
- **localStorage-backed recent history** on all 3 main pages (max 5 entries each).
- **1.5s minimum spinner** on LiveStatus prevents flash for cached responses.
- `RouteCard` wait-time calculation correctly handles **midnight crossing** (`+1440 min`).
- Clean **Controller-prop pattern** — no global state library needed for current scope.
- `initialTrainNumber` prop on Schedules and LiveStatus enables **cross-page deep navigation** (e.g., Home result → view schedule).
