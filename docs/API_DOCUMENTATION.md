# 📡 API Documentation — Blindspot AI

> REST API reference for the Blindspot AI backend.

> [!NOTE]
> This documentation will be updated as endpoints are designed and implemented. All endpoints below are **planned** and subject to change.

---

## Base URL

```
# Local Development
http://localhost:3000/api

# Production (Replit)
https://<repl-name>.<username>.repl.co/api
```

---

## Authentication

> Authentication method TBD — likely JWT-based Bearer tokens.

```
Authorization: Bearer <token>
```

All endpoints except `/api/auth/login` and `/api/auth/register` require authentication.

---

## Endpoint Categories

### 🔐 Auth

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | 🔲 Planned |
| `POST` | `/api/auth/login` | Authenticate and receive token | 🔲 Planned |
| `POST` | `/api/auth/logout` | Invalidate current session | 🔲 Planned |
| `POST` | `/api/auth/refresh` | Refresh authentication token | 🔲 Planned |

### 🧠 Analysis

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `POST` | `/api/analysis/create` | Submit a decision for blind spot analysis | 🔲 Planned |
| `GET` | `/api/analysis/:id` | Retrieve analysis results | 🔲 Planned |
| `GET` | `/api/analysis/history` | List past analyses | 🔲 Planned |
| `DELETE` | `/api/analysis/:id` | Delete an analysis | 🔲 Planned |

### 👤 User

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/api/user/profile` | Get current user profile | 🔲 Planned |
| `PUT` | `/api/user/profile` | Update user profile | 🔲 Planned |
| `GET` | `/api/user/settings` | Get user preferences | 🔲 Planned |
| `PUT` | `/api/user/settings` | Update user preferences | 🔲 Planned |

### 📊 Data

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/api/data/stats` | Get usage statistics | 🔲 Planned |
| `GET` | `/api/data/export` | Export analysis data | 🔲 Planned |

---

## Response Format

All API responses follow a consistent JSON structure.

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "result": "..."
  },
  "message": "Analysis completed successfully",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [
      {
        "field": "decision_text",
        "message": "Decision text is required"
      }
    ]
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid request parameters |
| `401` | `UNAUTHORIZED` | Missing or invalid authentication |
| `403` | `FORBIDDEN` | Insufficient permissions |
| `404` | `NOT_FOUND` | Resource not found |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

> [!NOTE]
> Rate limiting details will be defined during implementation.

| Tier | Limit | Window |
|---|---|---|
| **Unauthenticated** | TBD | TBD |
| **Authenticated** | TBD | TBD |
| **Analysis Endpoint** | TBD | TBD |

Rate limit headers will be included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672531200
```

---

*This API documentation will be expanded as development progresses.*
