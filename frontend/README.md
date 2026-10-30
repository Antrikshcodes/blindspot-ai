# Frontend — Blindspot AI

> Single Page Application (SPA) client for the Blindspot AI validation platform.

---

## Overview

The frontend interface translates the complex 7-step validation process into a distraction-free, high-utility SaaS dashboard:
* **Idea Intake Wizard:** Clear prompts with real-time context-depth counters.
* **Assumption Risk Matrix:** 2D interactive grid plotting Impact vs. Uncertainty with distinct visual tagging for Lethal Assumptions.
* **Interview Guide Exporter:** Formatted, copyable scripts emphasizing non-leading Mom Test discovery questions.
* **Feedback Ingestion Hub:** Text intake for customer notes with automatic excerpt highlighting.
* **Contradiction Alert Center:** Clear visual callouts comparing conflicting user evidence side-by-side.
* **Experiment Board:** Actionable cards detailing validation tests, target metrics, and failure thresholds.

---

## Design Principles

* **Minimalist & Professional:** High typography standards, clear visual hierarchy, consistent component spacing.
* **No AI Gimmicks:** Avoid gratuitous gradient animations, decorative clutter, or vague conversational bots. Focus on structured analytical views.
* **Responsive Layout:** Designed for desktop discovery workflows while retaining complete functionality on tablets and mobile devices.

---

## Planned Directory Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── common/       # Buttons, cards, modals, form inputs, badges
│   │   ├── layout/       # App shell, navigation header, sidebars
│   │   ├── submission/   # Idea intake forms
│   │   ├── assumptions/  # Assumption cards, 2D risk matrix
│   │   ├── interviews/   # Question list, copy script modal
│   │   ├── feedback/     # Ingestion forms, transcript quote mapper
│   │   ├── contradictions/# Side-by-side evidence diff cards
│   │   └── experiments/  # Validation experiment cards
│   ├── hooks/            # Data-fetching and state management hooks
│   ├── services/         # API client service
│   ├── types/            # Shared TypeScript data models
│   ├── App.tsx           # Application route definitions
│   └── main.tsx          # Client entrypoint
├── package.json          # Scheduled for Day 2 initialization
├── vite.config.ts
└── tailwind.config.js
```

---

## Status

* **Day 1 Audit:** Baseline directory structure and architectural specifications complete.
* **Phase 2 (Days 3–4):** UI mockups, component hierarchy, and design token definitions.
* **Phase 3 (Days 5–9):** Core MVP views (Submission form and 2D Assumption Matrix).
