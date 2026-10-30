# API Documentation: Blindspot AI

**Document Version:** 1.1.0  
**Status:** Planned Contract Specification  
**Architecture Alignment:** [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)  
**Maintained by:** Null Theory Engineering Team  

> **Implementation Note:**  
> All endpoints documented below represent the target API contracts to be implemented across Phase 2 (Days 3–4), Phase 3 (Days 5–9), and Phase 4 (Days 10–13). No endpoints are currently live.

---

## 1. Base URL

```text
# Local Development
http://localhost:3000/api/v1

# Production (Replit Cloud)
https://<repl-slug>.<username>.repl.co/api/v1
```

---

## 2. Authentication Specification (Target)

Authenticated routes require a standard Bearer token in the HTTP Authorization header:

```text
Authorization: Bearer <jwt-token>
```

---

## 3. Core Validation Engine Endpoints

### 3.1 Project & Submission Management

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/projects` | Initialize a new founder workspace | 🔲 Planned |
| `GET` | `/api/v1/projects/:id` | Fetch project details and metadata | 🔲 Planned |
| `POST` | `/api/v1/projects/:id/submissions` | Submit product idea, audience, and problem statement (Step 1) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/submissions` | Retrieve submission history and iterations | 🔲 Planned |

#### Request Payload: `POST /api/v1/projects/:id/submissions`
```json
{
  "productName": "SaaSMetrics",
  "targetAudience": "Bootstrapped B2B SaaS founders with $1k-$10k MRR",
  "problemStatement": "Founders spend hours manually stitching Stripe data into spreadsheets to calculate churn and LTV.",
  "proposedSolution": "An automated background sync that alerts founders in Slack when churn spikes."
}
```

---

### 3.2 Assumption Extraction & Risk Prioritization

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/submissions/:id/assumptions/extract` | Trigger AI extraction of unstated assumptions (Step 2) | 🔲 Planned |
| `GET` | `/api/v1/submissions/:id/assumptions` | Fetch categorized assumptions with risk scores (Step 3) | 🔲 Planned |
| `PATCH` | `/api/v1/assumptions/:id` | Manually adjust assumption category or score | 🔲 Planned |

#### Response Payload: `GET /api/v1/submissions/:id/assumptions`
```json
{
  "success": true,
  "data": [
    {
      "id": "asm_01j8k9",
      "category": "PROBLEM",
      "statement": "Founders calculate churn weekly rather than waiting for monthly accountant reports.",
      "impactScore": 4,
      "uncertaintyScore": 5,
      "compositeRisk": 20,
      "isLethal": true,
      "rationale": "If founders only look at churn once a month, real-time Slack alerts solve a non-urgent pain.",
      "status": "UNVERIFIED"
    }
  ]
}
```

---

### 3.3 Customer Discovery & Interview Generation

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/assumptions/:id/interview-questions` | Generate Mom-Test-compliant discovery questions (Step 4) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/interview-script` | Export full project interview guide | 🔲 Planned |

#### Response Payload: `POST /api/v1/assumptions/:id/interview-questions`
```json
{
  "success": true,
  "data": {
    "assumptionId": "asm_01j8k9",
    "questions": [
      {
        "question": "How did you check your revenue and churn numbers last week?",
        "probeType": "PAST_BEHAVIOR",
        "listenFor": "Do they mention dedicated software, manual exports, or total avoidance?"
      },
      {
        "question": "What tools or subscriptions do you currently pay for to monitor your business metrics?",
        "probeType": "CURRENT_EXPENDITURE",
        "listenFor": "Reveals whether budget is already allocated for metrics."
      }
    ]
  }
}
```

---

### 3.4 Feedback Ingestion & Contradiction Detection

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/projects/:id/feedback` | Ingest qualitative customer interview notes (Step 5) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/contradictions` | Analyze ingested notes for conflicting evidence (Step 6) | 🔲 Planned |

#### Response Payload: `GET /api/v1/projects/:id/contradictions`
```json
{
  "success": true,
  "data": [
    {
      "id": "cnt_99x",
      "assumptionId": "asm_01j8k9",
      "contradictionSummary": "Conflicting feedback regarding urgency of real-time churn metrics.",
      "evidenceA": {
        "interviewee": "Founder #2 (5-person agency)",
        "quote": "I check Stripe every morning, it's my first ritual."
      },
      "evidenceB": {
        "interviewee": "Founder #4 (Solo dev)",
        "quote": "I honestly only look at churn when my quarterly taxes are due."
      },
      "recommendation": "Segment your target audience: agencies require daily monitoring; solo builders do not."
    }
  ]
}
```

---

### 3.5 Experiment Recommendations

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/assumptions/:id/experiments` | Generate falsification experiments (Step 7) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/experiments` | List all recommended validation experiments | 🔲 Planned |

#### Response Payload: `POST /api/v1/assumptions/:id/experiments`
```json
{
  "success": true,
  "data": {
    "assumptionId": "asm_01j8k9",
    "experimentType": "CONCIERGE_TEST",
    "title": "Manual Daily Slack Churn Digest",
    "description": "Offer 5 target founders a free manual 7-day test where you send their daily metric summary by 9 AM.",
    "metric": "Daily Open / Engagement Rate",
    "falsificationThreshold": "If fewer than 3 of 5 founders respond or check the alert for 4+ days, the pain is not urgent.",
    "estimatedDurationDays": 7
  }
}
```

---

## 4. Standard Response Envelope

All API endpoints return JSON conforming to the following envelopes:

### Success Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-10-31T01:00:00.000Z"
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Problem statement must contain at least 50 characters of context.",
    "details": []
  },
  "timestamp": "2026-10-31T01:00:00.000Z"
}
```
