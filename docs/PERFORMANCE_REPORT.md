# BLINDSPOT AI — PERFORMANCE BENCHMARK & OPTIMIZATION REPORT
**Phase 15 Performance Engineering**  
**Repository:** [https://github.com/Antrikshcodes/blindspot-ai](https://github.com/Antrikshcodes/blindspot-ai)  
**Date:** November 12, 2026

---

## 1. Frontend Bundle Size & Chunk Distribution

### Baseline Measurements (Pre-Optimization)
- Single monolithic bundle: `dist/assets/index-*.js` ~ 871.44 kB (gzip: 232.58 kB)
- Warning emitted: `(!) Some chunks are larger than 500 kB after minification.`
- Cause: React, React Router, Clerk SDK, TanStack Query, Framer Motion, and Lucide icons combined in one un-split root chunk.

### Target Optimization Architecture
1. **Route-Level Code Splitting**:
   - `DashboardOverview` via `React.lazy()`
   - `ProjectList` via `React.lazy()`
   - `CreateProject` via `React.lazy()`
   - `ProjectDetails` via `React.lazy()`
   - `Settings` via `React.lazy()`
   - Landing page and critical navigation load instantly in root bundle.
2. **Vendor Chunking (`manualChunks`)**:
   - `vendor-react`: React, React-DOM, React Router
   - `vendor-clerk`: Clerk React SDK
   - `vendor-framer`: Framer Motion animation engine
   - `vendor-query`: TanStack React Query
   - `vendor-icons`: Lucide React icon set
3. **Chunk Target**: Every chunk below 400 kB uncompressed; sub-100 kB gzip.

---

## 2. Network & Query Optimization

| Area | Current Policy | Optimization | Impact |
| :--- | :--- | :--- | :--- |
| **Project Details Query** | Stale time: 2 min | Pre-fetch on hover | Instant tab transition |
| **Notifications Polling** | 30s interval | Window focus disabled, smart idle backoff | Minimal background battery & bandwidth |
| **Resource Search Cache** | Server-side hash in `resource_searches` | Reuses existing provider records | Zero duplicate provider network requests |
| **Settings & Preferences** | Stale time: 5 min | Optimistic updates on toggle | Zero-latency toggle experience |

---

## 3. Database Indexes

- `project_owner_created_idx`: `(owner_id, created_at)` → Index-only scan for dashboard projects list.
- `analysis_project_idx`: `(project_id, created_at)` → O(1) lookup for latest project analysis version.
- `notification_owner_read_idx`: `(owner_id, read)` → Fast index lookup for unread count indicator.
- `user_preferences_owner_idx`: `(owner_id)` UNIQUE → Fast O(1) user preferences retrieval.
