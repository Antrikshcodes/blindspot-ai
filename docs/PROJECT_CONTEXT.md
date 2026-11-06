# Project Context: Blindspot AI

**Document Version:** 1.0.0  
**Status:** Approved  
**Author:** Technical Leadership & Architecture Team (Null Theory)  
**Hackathon:** CoNSTruct 2.0 (Replit × Newton School of Technology)  

---

## 1. Product Vision

**Blindspot AI** is an AI-powered product validation platform designed to prevent student founders, early-stage entrepreneurs, and hackathon teams from building products nobody wants.

Traditional startup advice encourages founders to "talk to users" and "validate before building," yet founders frequently jump straight into writing code. When they do conduct user research, they often ask biased, leading questions and interpret ambiguous feedback as confirmation of their preconceived beliefs.

Blindspot AI transforms raw, unverified product concepts into a structured, evidence-based validation workflow. Instead of acting as an idea generator or unconditional cheerleader, Blindspot AI systematically challenges assumptions, isolates lethal risks, drafts rigorous non-leading interview scripts, highlights contradictory user feedback, and formulates pragmatic experiments.

> **Core Operating Principle:**  
> Blindspot AI must never present AI-generated hypotheses as verified facts. The system functions as an intellectual adversary and rigorous analytical partner that forces founders to confront reality through customer evidence.

---

## 2. Problem Statement

### 2.1 The Founder's Dilemma
1. **Premature Engineering:** Teams invest 80% to 100% of initial sprint cycles building application features before verifying whether the core problem exists or if anyone will pay to solve it.
2. **Hidden and Conflated Assumptions:** Founders fail to decompose an idea into distinct value, usability, viability, and feasibility hypotheses. Fatal flaws remain buried beneath surface-level excitement.
3. **Leading and Biased Customer Discovery:** Untrained interviewers inadvertently ask validation-seeking questions (e.g., *"Would you use an app that does X?"*) rather than probing past behavior (The Mom Test methodology), yielding false positives.
4. **Confirmation Bias in Feedback Synthesis:** When processing user transcripts or conversational notes, teams selectively extract statements that reinforce their biases while ignoring contradictory signals.
5. **Absence of Actionable Next Steps:** Even when founders suspect their idea has weaknesses, they lack structured guidance on what specific experiment to run next to de-risk the venture.

---

## 3. Target Audience & User Personas

### 3.1 Target Segments
* **Student Founders & Hackathon Teams:** Multi-disciplinary teams operating under tight deadlines (e.g., 24 hours to 30 days) who need rapid validation before and during coding sprints.
* **Early-Stage Entrepreneurs (Pre-Seed / Incubator):** First-time founders seeking initial customer signal to present to accelerators, advisors, or angel investors.
* **Product Builders & Indie Hackers:** Solo developers and engineering-heavy teams requiring structured product-management discipline without hiring a product manager.

### 3.2 User Personas

#### Persona A: "The Builder" (Aarav, 21 — Hackathon Finalist)
* **Background:** Computer Science undergraduate, excellent full-stack developer.
* **Behavior:** Gets an idea on Day 1, immediately starts configuring databases and styling UI components without speaking to target users.
* **Pain Point:** Spends 3 weeks building sophisticated architectures for problems users don't actually experience.
* **Goal:** A tool that takes 5 minutes to stress-test his idea and outputs concrete questions he can ask 5 target users before writing code.

#### Persona B: "The First-Time Founder" (Sneha, 24 — Early-Stage Entrepreneur)
* **Background:** Domain expert entering tech entrepreneurship.
* **Behavior:** Conducts customer calls but leaves feeling uncertain because interviewees were "polite" and said they liked the idea.
* **Pain Point:** Cannot separate polite encouragement from genuine willingness to adopt or pay.
* **Goal:** A systematic way to parse customer interview notes, surface red flags, and highlight where interviewees contradicted each other.

---

## 4. Core Use Cases

| ID | Use Case Name | Primary Actor | Description |
|:---|:---|:---|:---|
| **UC-01** | Submit Concept for Deconstruction | Founder | Input idea summary, target audience, and identified problem to initiate validation pipeline. |
| **UC-02** | Review Extracted Assumptions | Founder | Inspect AI-decomposed assumptions categorized by risk domain (Problem, Customer, Solution, Monetization). |
| **UC-03** | Prioritize Lethal Risks | Founder / Team | Identify high-impact, high-uncertainty assumptions that must be validated first to prevent project failure. |
| **UC-04** | Generate Discovery Script | Founder | Export targeted, non-leading customer interview questions based on The Mom Test framework. |
| **UC-05** | Ingest Customer Feedback | Founder | Paste raw customer interview notes, survey responses, or recorded quotes. |
| **UC-06** | Detect Contradictions & Bias | Founder / Team | Review synthesized findings with automated detection of conflicting user claims and evidence gaps. |
| **UC-07** | Receive Experiment Plan | Founder | Obtain prioritized, low-fidelity experiment blueprints (smoke test, concierge test, prototype) with clear success metrics. |

---

## 5. Functional Requirements (The 7-Step Validation Engine)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BLINDSPOT AI PIPELINE                           │
│                                                                        │
│  [1. Idea Submission]                                                  │
│         │                                                              │
│         ▼                                                              │
│  [2. Assumption Extraction]                                            │
│         │                                                              │
│         ▼                                                              │
│  [3. Risk Prioritisation]                                              │
│         │                                                              │
│         ▼                                                              │
│  [4. Interview Generation] ──────────────┐                             │
│         │                                │ (Out-of-band discovery)     │
│         ▼                                ▼                             │
│  [5. Feedback Analysis]    ◄───── [Customer Interviews]                │
│         │                                                              │
│         ▼                                                              │
│  [6. Contradiction Detection]                                          │
│         │                                                              │
│         ▼                                                              │
│  [7. Experiment Recommendations]                                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Idea Submission
* **FR-1.1:** System shall capture Product Name, Value Proposition, Target Customer Profile, and Problem Description.
* **FR-1.2:** System shall enforce minimum character thresholds to ensure sufficient contextual richness for NLP parsing.
* **FR-1.3:** System shall store and version each submission within the user's project workspace.

### Step 2: Assumption Extraction
* **FR-2.1:** System shall parse submissions and isolate unstated, unverified premises.
* **FR-2.2:** System shall categorize assumptions into standard venture risk domains:
  * *Problem Risk:* Does the problem actually exist and cause measurable pain?
  * *Customer Risk:* Is this audience reachable, identifiable, and motivated to switch?
  * *Solution Risk:* Does our proposed approach solve the root issue effectively?
  * *Viability / Monetization Risk:* Will users pay, or does the unit economics make sense?
* **FR-2.3:** System shall explicitly distinguish between explicit user declarations and implicit AI-inferred premises.

### Step 3: Risk Prioritisation
* **FR-3.1:** System shall evaluate each assumption across two dimensions:
  * *Impact on Survival (1–5):* If this assumption is false, does the product instantly fail?
  * *Current Uncertainty (1–5):* How little concrete evidence currently exists?
* **FR-3.2:** System shall compute a Composite Risk Score ($Impact \times Uncertainty$) and flag assumptions exceeding the critical threshold as "Lethal Assumptions."
* **FR-3.3:** System shall display a rationalized explanation for why each lethal assumption represents an immediate project risk.

### Step 4: Interview Generation
* **FR-4.1:** System shall generate tailored customer discovery question sets aligned directly with prioritized lethal assumptions.
* **FR-4.2:** System shall strictly follow non-leading interrogation principles (The Mom Test):
  * No hypotheticals (*"Would you buy..."* is disallowed).
  * Focus on past behavior (*"When was the last time you..."*).
  * Probe current financial or time expenditures (*"What tools or workarounds do you currently pay for?"*).
* **FR-4.3:** System shall output contextual interviewer instructions detailing what behavioral cues to listen for.

### Step 5: Feedback Analysis
* **FR-5.1:** System shall accept qualitative unstructured text input (interview transcripts, call notes, feedback logs).
* **FR-5.2:** System shall map extracted feedback points directly back to relevant assumptions.
* **FR-5.3:** System shall categorize each data point as *Supporting Evidence*, *Invalidating Evidence*, or *Neutral / Inconclusive*.

### Step 6: Contradiction Detection
* **FR-6.1:** System shall identify direct contradictions between different interview participants (e.g., User A: *"Price is the primary barrier"*; User B: *"Price is irrelevant, integration speed is the barrier"*).
* **FR-6.2:** System shall flag unsupported founder conclusions where notes do not justify the positive status assigned to an assumption.
* **FR-6.3:** System shall visualize confidence ratings backed by citation of specific excerpts from ingested notes.

### Step 7: Experiment Recommendations
* **FR-7.1:** For unverified or high-risk assumptions, the system shall suggest concrete, fast experiments (e.g., Landing Page Pre-registration, Concierge Service Test, Prototype Usability Test, Sales Letter Smoke Test).
* **FR-7.2:** Each recommendation shall define:
  * Metric to measure (e.g., Conversion Rate, Time on Task, Deposit Rate).
  * Falsification threshold (e.g., *"If fewer than 15% provide contact info, assumption is invalidated"*).
  * Estimated time to execute (e.g., 24–48 hours).

---

## 6. Non-Functional Requirements

### 6.1 Reliability & Determinism
* The platform must enforce structured JSON output schemas from LLM invocations using strict schema validation (e.g., Zod or Pydantic) to avoid runtime deserialization errors.
* Fallbacks and graceful degradation must handle transient AI provider outages.

### 6.2 Security & Data Privacy
* Zero leakage of user ideas: User submissions and proprietary product concepts must remain private to the project owner and designated collaborators.
* Environment variables, API keys, and database credentials must never be committed to source control or exposed to the client bundle.
* Input sanitization on all user-submitted text to mitigate prompt injection risks and cross-site scripting (XSS).

### 6.3 Performance
* UI responsiveness: Static assets and application shell should load in $< 1.5\text{s}$ on standard broadband.
* AI processing streaming or clear loading states: For asynchronous AI jobs taking $> 3\text{s}$, the UI must render progressive loading indicators or live status streaming.

### 6.4 Usability & SaaS Standards
* Adherence to modern, accessible UI standards (WCAG 2.1 AA contrast levels).
* Mobile-responsive layout ensuring full functionality across desktop, tablet, and mobile browsers.

---

## 7. Product Differentiators

| Capability | Generic AI Idea Generators | Blindspot AI |
|:---|:---|:---|
| **Primary Goal** | Brainstorming and validating ideas enthusiastically | Stress-testing assumptions and uncovering hidden fatal flaws |
| **Output Stance** | Affirmative, optimistic, generic marketing copy | Skeptical, analytical, evidence-seeking |
| **Interrogation Style** | Leading questions (*"Would you like this feature?"*) | Behavioral, past-focused discovery (*"How did you solve this last week?"*) |
| **Handling User Data** | Basic summarization | Contradiction detection, assumption mapping, evidence-confidence scoring |
| **Actionability** | Vague advice (*"Focus on user engagement"*) | Explicit falsification experiments with concrete metrics and thresholds |

---

## 8. MVP Boundaries (20-Day Hackathon Sprint)

### In-Scope (MVP)
* Web-based input for product concepts and target audience definitions.
* Automated decomposition into categorized assumptions (Problem, Customer, Solution, Viability).
* Impact vs. Uncertainty 2D risk matrix scoring with lethal risk identification.
* Non-leading interview guide generator with exportable question checklists.
* Qualitative feedback ingestion with manual/semi-automated mapping to assumptions.
* Basic contradiction detection between conflicting customer feedback notes.
* Prioritized actionable experiment recommendations for top lethal assumptions.
* Full Replit deployment readiness.

### Out-of-Scope (Post-Hackathon / Future Releases)
* Live audio call transcription and real-time speech analysis during interviews.
* Automated web scraping of competitor reviews and public market data.
* Direct integration with external survey tools (Typeform, Google Forms API).
* Multi-tenant enterprise role-based access control (RBAC).
* Native iOS / Android mobile applications.

