# API Contract Specification: Blindspot AI

**Version:** 1.0.0 (Phase 1 Baseline)  
**Base URL:** `/api/v1`  
**Protocol:** REST / JSON  
**Specification Owner:** Backend Team (Pavitr Makhija, Antriksh)  

---

## 1. Unified Response Envelopes

Every API response follows a deterministic contract.

### 1.1 Success Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable confirmation message",
  "timestamp": "2026-11-04T00:00:00.000Z"
}
```

### 1.2 Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable description of error",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific validation failure"
      }
    ]
  },
  "timestamp": "2026-11-04T00:00:00.000Z"
}
```

---

## 2. Implemented & Verified Endpoints (Phase 1)

### 2.1 System Health
* **Method:** `GET`
* **Path:** `/api/v1/health`
* **Access:** Public
* **Description:** Returns the live operational status, uptime, node environment, and memory consumption.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2026-11-04T00:04:04.046Z",
      "uptime": "12s",
      "environment": "development",
      "version": "1.0.0",
      "memory": {
        "rss": "45MB",
        "heapUsed": "18MB"
      }
    },
    "message": "Blindspot AI Backend is healthy",
    "timestamp": "2026-11-04T00:04:04.046Z"
  }
  ```

### 2.2 System Readiness (Database Probe)
* **Method:** `GET`
* **Path:** `/api/v1/health/ready`
* **Access:** Public
* **Description:** Probes the underlying database connection via `SELECT 1` through Prisma.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "status": "ready",
      "database": "connected",
      "timestamp": "2026-11-04T00:04:04.051Z"
    },
    "message": "Backend is ready to accept traffic",
    "timestamp": "2026-11-04T00:04:04.051Z"
  }
  ```
* **Failure Response (503 Service Unavailable):**
  ```json
  {
    "success": false,
    "error": {
      "code": "SERVICE_UNAVAILABLE",
      "message": "Database connection is not ready",
      "details": [
        {
          "component": "database",
          "message": "Connection refused"
        }
      ]
    },
    "timestamp": "2026-11-04T00:00:00.000Z"
  }
  ```

---

## 3. Standard HTTP Status & Error Codes

| Status Code | Error Code | Scenario |
|:---|:---|:---|
| `400` | `VALIDATION_ERROR` | Request body, params, or query failed Zod schema checks |
| `401` | `UNAUTHORIZED` | Missing or invalid authentication token |
| `403` | `FORBIDDEN_ACTION` | User lacks permission to access the specified resource |
| `404` | `ROUTE_NOT_FOUND` | Requested URL path does not exist on the server |
| `404` | `NOT_FOUND` | Specified database entity ID was not found |
| `409` | `DUPLICATE_RECORD` | Unique constraint violation (e.g., project name / email) |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled server exception (stack trace omitted in prod) |
| `503` | `SERVICE_UNAVAILABLE` | Database or downstream AI provider is unreachable |

---

## 4. Upcoming Planned Endpoints (Phase 2 & Phase 3)

| Module | Method | Path | Status |
|:---|:---|:---|:---:|
| **Projects** | `POST` | `/api/v1/projects` | Phase 2 |
| **Projects** | `GET` | `/api/v1/projects` | Phase 2 |
| **Projects** | `GET` | `/api/v1/projects/:id` | Phase 2 |
| **Projects** | `PUT` | `/api/v1/projects/:id` | Phase 2 |
| **Projects** | `DELETE` | `/api/v1/projects/:id` | Phase 2 |
| **Assumptions** | `POST` | `/api/v1/projects/:id/assumptions/extract` | Phase 3 |
| **Assumptions** | `GET` | `/api/v1/projects/:id/assumptions` | Phase 3 |
| **Assumptions** | `PATCH` | `/api/v1/assumptions/:id` | Phase 3 |
| **Interviews** | `POST` | `/api/v1/assumptions/:id/interview-questions` | Phase 5 |
| **Feedback** | `POST` | `/api/v1/projects/:id/feedback` | Phase 6 |
| **Contradictions** | `GET` | `/api/v1/projects/:id/contradictions` | Phase 7 |
| **Experiments** | `POST` | `/api/v1/assumptions/:id/experiments` | Phase 8 |

---

## 5. Library Prototype Endpoints

The resource model and development-only endpoints are implemented on the Library
feature branch. These are not a complete recommendation engine or production API.
All routes are disabled in production pending authenticated project authorization.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/projects/:projectId/library` | Filter and paginate resources |
| `POST` | `/api/v1/projects/:projectId/library/resources` | Add a curated resource |
| `PUT` | `/api/v1/projects/:projectId/library/resources/:resourceId/save` | Save a resource |
| `PATCH` | `/api/v1/projects/:projectId/library/resources/:resourceId/save` | Change saved status |
| `DELETE` | `/api/v1/projects/:projectId/library/resources/:resourceId/save` | Remove from saved collection |

See [Library API](docs/LIBRARY_API.md) for full request/response contracts, security
boundaries, setup, unknown-metadata handling, and explicit out-of-scope items.
