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

### Measured Results (Post-Optimization)
- **Root Landing Bundle**: `dist/assets/index-*.js` is now **97.02 kB (gzip: 25.85 kB)** — an **88.9% reduction** in initial downloaded JavaScript.
- **Route-Split Chunks**:
  - `DashboardOverview`: 8.45 kB (gzip: 2.45 kB)
  - `ProjectList`: 8.95 kB (gzip: 2.88 kB)
  - `CreateProject`: 11.44 kB (gzip: 3.03 kB)
  - `Settings`: 29.99 kB (gzip: 6.17 kB)
  - `ProjectDetails`: 147.85 kB (gzip: 29.84 kB)
- **Shared Vendor Chunks**:
  - `vendor-core`: 384.58 kB (gzip: 112.75 kB)
  - `vendor-framer`: 131.10 kB (gzip: 43.17 kB)
  - `vendor-query`: 38.67 kB (gzip: 11.29 kB)
- **Zero Warnings**: Every bundle is strictly below the Vite warning threshold.

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
