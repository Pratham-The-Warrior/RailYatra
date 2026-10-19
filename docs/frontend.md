# Frontend Documentation

## Tech stack

React 19, TypeScript ~5.8, Vite 6, Tailwind CSS 4, Framer Motion 12, Lucide React 0.564, Inter font.

## Navigation

No React Router. `App.tsx` manages a `currentPage` state (`'home' | 'schedules' | 'live-status' | 'category-routes'`). Navigation happens through `handleNavigate()` passed as `onNavigate` prop to every page. Cross-page data like selected train number or category is also lifted to App state.

Browser back button and deep-linking don't work because of this.

## File structure

```
frontend/src/
├── index.tsx                  — React root mount
├── index.css                  — Global styles, Tailwind 4 theme (v3-compatible palette, line-heights, stack-y-* utility)
├── routing.ts                 — URL <-> page mapping (History API; no router library)
├── config/links.ts            — External links (GitHub, IRCTC, PNR enquiry)
├── types.ts                   — Shared interfaces (RouteStep, Route, SearchParams, Station)
├── App.tsx                    — Top-level router / state machine
├── components/
│   ├── Navbar.tsx             — Fixed glassmorphic nav bar
│   ├── Footer.tsx             — Static footer
│   ├── SearchForm.tsx         — From / To / Date search form
│   ├── StationSearchInput.tsx — Autocomplete input with fuzzy search
│   ├── RouteCard.tsx          — Full route result card
│   ├── RouteCardCompact.tsx   — Dense card for desktop grid view
│   ├── LayoutToggle.tsx       — List/card view switcher
│   ├── Schedules/             — SchedulesLanding, SchedulesResult, SchedulesError
│   └── LiveStatus/            — LandingView, LandingDashboard, SearchHero, TrackingResults, TrackingSidebar
└── pages/
    ├── Home.tsx               — Hero, search, results, special trains
    ├── Schedules.tsx          — Train schedule lookup
    ├── LiveStatus.tsx         — Where's my train (position estimated from the timetable)
    └── CategoryRoutes.tsx     — Train category chart (Vande Bharat, etc.)
```

## Types (types.ts)

`RouteStep`, `Route`, `SearchParams`, `Station` are shared. Other types like `TrainSchedule`, `LiveStatusResponse`, `TrainRoute` are defined locally in their page files.

## Styles (index.css)

Imports Plus Jakarta Sans (body) and Outfit (headings) from Google Fonts. Has some CSS custom properties under `:root` but Tailwind classes are used everywhere instead. Custom classes: `.premium-gradient`, `.glass-card`, `.shadow-premium`. Smooth scroll and thin scrollbars enabled globally.

## Components

### Navbar.tsx
Props: `onNavigate`, `currentPage`. Fixed position, glassmorphic background. Nav links: Home, Schedules, Live Status. Mobile hamburger menu with Framer Motion animation. `category-routes` page has no navbar entry — only reachable from Home page.

### SearchForm.tsx
Props: `onSearch(params, fromDisplay, toDisplay)`, `isLoading`. Manages SearchParams internally. Defaults: today's date, max_switches 5, max_wait 600, sort_by 'switches', top_k 50. Swap button inverts both codes and display strings. Date input blocks past dates. Spinner on submit button when loading.

### StationSearchInput.tsx
Props: `value`, `onChange(code, display)`, `placeholder`. 250ms debounced fetch to `/api/stations?q=...` (min 2 chars). Animated dropdown. Click-outside to close. Selection format: "Station Name (CODE)". Full keyboard navigation (arrows, enter, escape). Shows loading spinner during fetch. Supports city-level "All Stations" entries with a special card style.

### RouteCard.tsx
Props: `route`, `index`. Staggered entrance animation. Shows total time, distance, direct/N-changes badge. Vertical timeline for each leg with train info. Transfer cards between legs calculate wait time (handles midnight rollover).

### RouteCardCompact.tsx
Dense card variant for the desktop 3-column grid layout. Same data as RouteCard but in a compact format.

### LayoutToggle.tsx
Toggle switch between list and card view layouts. Only shown on desktop.

### Footer.tsx
Static, no logic.

## Pages

### Home.tsx
State: `routes[]`, `loading`, `error`, `searched`, `recentSearches[]`, `viewLayout`, `visibleCount`

Sections:
1. Hero — heading, tagline, SearchForm, decorative blur blobs
2. Quick Services — 2 cards (Schedules, Live Status) in a 4-col grid (2 slots empty)
3. Recent Searches — from localStorage (`railyatra_recent_searches`), max 5, clickable to re-run
4. Special Trains — 3 cards (Vande Bharat, Tejas, Gatiman). "View Routes" navigates to category-routes. "View all collections" is a dead link. Heart button does nothing.
5. Results — list or grid of RouteCard/RouteCardCompact, toggled by LayoutToggle. Scrolls to #results after fetch.
6. Load More — engine fetches up to 50 routes but only `visibleCount` (starts at 10) are rendered. "Load More" button adds 10 more. Shows "All N routes displayed" when done.

API: POST /api/route with SearchParams body. Two try/catch blocks for network and JSON parse errors.

### Schedules.tsx
State: `trainNumber`, `loading`, `schedule`, `error`, `recents[]`. Orchestrator that delegates to components in `src/components/Schedules/`.

4 render states: Landing (!schedule && !loading), Loading, Error, Results (schedule !== null).

Landing has search bar, popular trains (hardcoded), recent searches from localStorage. Results show train header, amenity strip (static/hardcoded), responsive timetable (5-col desktop, 2-col mobile), journey stats sidebar, and a decorative SVG route visualizer.

Helper functions: `computeHalt()` (handles midnight crossing), `titleCase()` (duplicated across multiple files).

### LiveStatus.tsx
State: `trainNumber`, `loading`, `statusData`, `error`, `refreshing`. Same 4-state pattern as Schedules. Components in `src/components/LiveStatus/`.

Data comes from `/api/livestatus/:trainNumber`, which estimates the position from the timetable (`source: "timetable"`). The UI then shows "As per timetable" instead of on-time/delay badges, a notice banner, scheduled times only, and no platform (unknown). Fields for real delays and platforms (`is_delayed`, `delay_mins`, `platform`) are still rendered when a live source provides them.

Has a 1.5s minimum spinner to prevent flash on fast responses. Results view shows train header, itinerary timeline (passed / current / in transit / upcoming), and a sidebar with stations covered, scheduled average speed and time left.

### CategoryRoutes.tsx
Props: `category`, `categoryName`, `onNavigate`, `onViewTrain`. Fetches `/api/category/:category` on mount.

Client-side search filter. Desktop shows a table, mobile shows cards. Operating days grid (M/T/W/T/F/S/S). "View Details" navigates to Schedules with that train pre-loaded.

## API calls

- `StationSearchInput` — GET `/api/stations?q=...` (250ms debounced)
- `Home` — GET `/api/route` and `/api/route/pareto`
- `Schedules` — GET `/api/schedule/:trainNumber`
- `LiveStatus` — GET `/api/livestatus/:trainNumber`
- `CategoryRoutes` — GET `/api/category/:category`

## localStorage keys

- `railyatra_recent_searches` (Home) — `{ from, fromDisplay, to, toDisplay, date }[]`, max 5
- `railyatra_recent_schedules` (Schedules) — `{ trainNumber, trainName, timestamp }[]`, max 5
- `recent_live_status` (LiveStatus) — `{ trainNumber, timestamp }[]`, max 5

## Known issues

- `titleCase()` is duplicated across Schedules, LiveStatus and CategoryRoutes; it could be shared.
- Searching another train from inside Schedules or Live Status does not change the URL (navigation between pages does).
- Live Status is a timetable estimate; actual running positions need a licensed data feed.
- Route Visualizer SVG is decorative.

## URLs

`/`, `/schedules[/:train]`, `/live-status[/:train]`, `/category/:id` (see `src/routing.ts`). Back/Forward and reload work; the backend serves `index.html` for these paths.

## What works well

- Consistent orange/slate design language
- Framer Motion animations everywhere
- Fully responsive with mobile and desktop breakpoints
- localStorage recent history on all 3 main pages
- 1.5s minimum spinner on LiveStatus prevents flash
- RouteCard handles midnight crossing correctly
- Controller-prop pattern keeps things simple (no global state library)
- `initialTrainNumber` prop enables cross-page navigation
