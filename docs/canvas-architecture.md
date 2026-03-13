# Canvas Architecture — Resolution Intelligence Engine

> **Last updated**: 2026-03-09
> **Key files**: `canvas-bridge.ts`, `canvas-store.ts`, `CanvasPanel.tsx`, `types/canvas.ts`

---

## Overview

The Canvas is the right-side panel of the Nexus HUD. It renders a dynamic intelligence dashboard that populates in real-time as a ticket is loaded and processed through a **4-stage adaptive resolution workflow**.

Only **one section is displayed at a time** (the `focusedSection`). Users switch between sections via a horizontal chip bar.

```
+-------------------------------------------+
|  "Resolution Canvas" header               |
+-------------------------------------------+
|  WorkflowProgressBar  (4 stages)          |
+-------------------------------------------+
|  SectionNavBar  (horizontal chip bar)     |
+-------------------------------------------+
|                                           |
|  FocusedSectionRenderer                   |
|  (ONE section at full height)             |
|                                           |
+-------------------------------------------+
|  CommunicationDock (persistent footer)    |
+-------------------------------------------+
```

---

## 4-Stage Workflow

```
Intake --> Classification --> Resolution --> Capture
```

Stage progression is **API-driven**, not manual:

1. **Intake**: Ticket loads -> `fetchTicketReadiness()` called -> once readiness data returns, **auto-advance to Classification**
2. **Classification**: `fetchCaseClassification()` called -> once classification returns, **auto-advance to Resolution** + activate the appropriate resolution module
3. **Resolution**: Module-specific UI renders (troubleshooting, known-issue, self-service, etc.)
4. **Capture**: For already-resolved tickets, skips directly here

The `WorkflowProgressBar` component visualizes this with 4 numbered circles connected by lines (completed = green check, current = pulsing accent, future = dim).

---

## Stage-Aware Section Visibility

Each stage has rules (`STAGE_SECTION_VISIBILITY` in `canvas-store.ts`) for which sections are shown:

| Section               | Intake      | Classification | Resolution | Capture     |
| --------------------- | ----------- | -------------- | ---------- | ----------- |
| ticket-readiness      | **primary** | collapsed      | hidden     | hidden      |
| ticket-intelligence   | **primary** | visible        | collapsed  | collapsed   |
| customer-intelligence | **primary** | collapsed      | hidden     | hidden      |
| case-classification   | hidden      | **primary**    | collapsed  | collapsed   |
| resolution-insights   | hidden      | **primary**    | visible    | hidden      |
| next-best-action      | hidden      | **primary**    | visible    | hidden      |
| ticket-timeline       | visible     | visible        | visible    | visible     |
| knowledge-capture     | hidden      | hidden         | hidden     | **primary** |
| resolution-summary    | hidden      | hidden         | hidden     | **primary** |

- **primary** = visible + expanded + loading skeleton if no data
- **visible** = visible + expanded (no skeleton)
- **collapsed** = header only (click to expand)
- **hidden** = not rendered

`computeStageLayout()` applies these rules when `advanceStage()` is called. During the resolution stage, module-managed sections are skipped (controlled by `setResolutionModule()` instead).

---

## Two Data Entry Points

### Entry Point A: Chat-based (`canvas-bridge.ts` -> `handleTicketResult`)

When the LLM agent calls `zendesk__get_ticket`, the SSE stream emits a `tool_result` event intercepted by `handleToolResultForCanvas()`:

1. Builds raw `TicketIntelligence` from the ticket JSON
2. Calls `store.loadTicket(ticketId)` (resets everything)
3. Calls `store.setTicketIntelligence(intel)` (populates first section)
4. Fires **6 parallel background fetches** (see Data Flow below)
5. Sets stage to "intake"

### Entry Point B: Dive In (`TriageCard.tsx` -> `handleDiveIn`)

When the user clicks "Dive In" on a Morning Brief card:

1. Builds minimal `TicketIntelligence` from triage card data
2. Calls `store.loadTicket(ticketId)`
3. Calls `store.setTicketIntelligence(intel)`
4. Calls `onDiveIn()` (dismisses overlay)
5. Calls `fetchCanvasEnrichments(ticketId)` — fires customer, similar, timeline, readiness, insights
6. Fires background `fetch(/api/tickets/{id}/brief)` that enriches Intel, Next Action, Suggested Actions, JIRA links

---

## Chip-by-Chip Population Logic

### 1. Intel (Ticket Intelligence)

|                 |                                 |
| --------------- | ------------------------------- |
| **Store field** | `ticketIntelligence`            |
| **Component**   | `TicketIntelligenceSection.tsx` |
| **API**         | `GET /api/tickets/{id}/brief`   |

**Population — Two-phase:**

- **Phase 1 (instant)**: Raw Zendesk data set immediately — ticket ID, subject, priority, status, requester name, description (truncated 300 chars), tags. Sentiment defaults to "neutral", confidence to 0. `linkedJiraIssues` defaults to `[]`.
- **Phase 2 (async)**: `fetchAIEnrichment()` calls `/brief`. That route fetches ticket + comments via Zendesk MCP **+ JIRA search** in parallel, sends to LLM for summary, sentiment, evidence, suggested actions, root cause, next best action. Enriches the store with improved summary, real sentiment, confidence, evidence bullets, related articles, SLA risk, **and linked JIRA issues from engineering teams**.

Additional JIRA sources: SSE tool results (`handleJiraIssueResult`, `handleJiraSearchResult`) also merge issues into `ticketIntelligence.linkedJiraIssues` via `mergeJiraIssueIntoIntelligence()`.

**Renders**: Ticket ID + priority/status/confidence badges, subject, requester, sentiment meter, AI-generated summary, evidence bullet list, **linked engineering issues** (JIRA key, summary, color-coded status, clickable URL), tags, related KB articles with relevance %.

---

### 2. Customer (Customer Intelligence)

|                 |                                  |
| --------------- | -------------------------------- |
| **Store field** | `customerIntelligence`           |
| **Component**   | `CustomerIntelSection.tsx`       |
| **API**         | `GET /api/tickets/{id}/customer` |

**Population:**

1. Calls Zendesk MCP `get_ticket` to find `requester_id`
2. Calls Zendesk MCP `search_tickets` with `requester_id:{id}` to find ALL tickets by this customer (up to 50)
3. Computes:
   - Open/total ticket count
   - Sentiment (based on how many recent tickets are urgent/high)
   - Top 5 tags across all tickets
   - Tier: Enterprise/Premium/Standard (from tags + volume)
   - ARR: from tags, custom fields, or tier-based defaults
   - Recent incidents: high/urgent tickets in last 30 days
4. Resolves org name from enriched ticket data

**Renders**: Name, email, org, ARR, tier badge, open/total stats, sentiment meter, recent incidents list with status, top tags.

---

### 3. Readiness (Ticket Readiness — Stage 1: Intake)

|                 |                                   |
| --------------- | --------------------------------- |
| **Store field** | `ticketReadiness`                 |
| **Component**   | `TicketReadinessSection.tsx`      |
| **API**         | `GET /api/tickets/{id}/readiness` |

**Population:**

1. Fetches ticket from Zendesk MCP
2. Checks 5 fields using heuristics:
   - **product_module**: Product/module keywords in subject, description, tags, custom fields
   - **error_description**: Error-related words (error, fail, crash, broken)
   - **repro_steps**: Step patterns ("step 1", numbered lists)
   - **logs_attached**: Attachments or log keywords
   - **version_info**: Version patterns (v1.2, version 3.0)
3. Score = 20 points per present field (0-100)
4. Missing fields get ActionButtons with chat prompts

**Renders**: Score progress bar (green >80, yellow >50, red <=50), checklist with check/cross per field, action buttons for missing fields.

**Stage cascade**: Once data arrives -> auto-advance to Classification -> `fetchCaseClassification()`.

---

### 4. Classification (Case Classification — Stage 2)

|                 |                                  |
| --------------- | -------------------------------- |
| **Store field** | `caseClassification`             |
| **Component**   | `CaseClassificationSection.tsx`  |
| **API**         | `GET /api/tickets/{id}/classify` |

**Population:**

1. Fetches ticket from Zendesk MCP
2. Searches SearchUnify for matching KB articles
3. Sends ticket + KB results to LLM to classify into:
   - `self_service` — Answerable via KB
   - `service_request` — Config change / feature activation
   - `feature_request` — New feature ask
   - `bug_known_issue` — Bug or known defect
   - `unknown_issue` — Needs investigation
4. LLM returns category, confidence, reasoning, suggested actions
5. Falls back to heuristic classification if no LLM available

**Renders**: Color-coded category badge, confidence, reasoning text, action buttons.

**Stage cascade**: Once classification arrives:

- Advances to Resolution stage
- Maps category -> resolution module via `CATEGORY_TO_MODULE`:
  - `self_service` -> SelfServiceModule
  - `service_request` / `feature_request` -> ServiceRequestModule
  - `bug_known_issue` -> KnownIssueModule
  - `unknown_issue` -> TroubleshootingModule
- Already-solved tickets skip directly to Capture stage

---

### 5. Insights (Resolution Insights)

|                 |                                             |
| --------------- | ------------------------------------------- |
| **Store field** | `resolutionInsights`                        |
| **Component**   | `ResolutionInsightsSection.tsx`             |
| **API**         | `GET /api/tickets/{id}/resolution-insights` |

**Population:**

1. Searches **SearchUnify** and **JIRA** in parallel
2. Extracts JIRA issue IDs from SearchUnify content via regex
3. Verifies up to 5 extracted issue IDs by calling JIRA MCP `get_issue`
4. Builds evidence sources: KB articles (type: "kb"), JIRA issues (type: "jira")
5. LLM generates common resolution descriptions and similar case counts

Additional data sources:

- `fetchAIEnrichment` merges `linkedJiraIssues` from `/brief`
- SSE tool results: `handleJiraIssueResult` and `handleJiraSearchResult` in canvas-bridge

**Renders**: Similar cases count, common resolutions with frequency bars, engineering issues list (ID, title, color-coded status), evidence source badges (Ticket/KB/Jira/Incident icons).

---

### 6. Next Action (Recommended Action)

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Store field** | `nextBestAction`                                   |
| **Component**   | `NextBestActionSection.tsx`                        |
| **API**         | Part of `GET /api/tickets/{id}/brief` LLM response |

**Population**: Extracted from the `/brief` LLM response. The LLM generates:

- `recommendation` — What the agent should do
- `confidence` — How sure the LLM is
- `reasoning` — Why this action
- `category` — respond / escalate / investigate / resolve (determines icon)
- `actions` — ActionButton array with chat prompts or MCP tool calls

**Renders**: Category icon, recommendation text, reasoning, confidence badge, clickable action buttons.

---

### 7. Root Cause (Resolution Module)

|                  |                                                                     |
| ---------------- | ------------------------------------------------------------------- |
| **Store fields** | `rootCauseSignals`, `knownIssueResolution`, `resolutionInsights`    |
| **Component**    | `ResolutionStageContainer.tsx` -> routes to active module           |
| **API**          | Data comes from `/brief`, `/resolution-insights`, JIRA tool results |

Which module renders depends on classification (`resolutionWorkflow.activeModule`):

- **KnownIssueModule** (`bug_known_issue`): Shows `knownIssueResolution` — issue ID, title, status badge (Open/In Progress/Resolved), JIRA link, workaround, affected versions. Falls back to `resolutionInsights.relatedEngineeringIssues`. Shows "Send Workaround" and "Check Status" buttons.

- **TroubleshootingModule** (`unknown_issue`): Diagnostic tools, troubleshooting steps, root cause signals.

- **SelfServiceModule** (`self_service`): Best-matching KB article from resolution insights evidence sources.

- **ServiceRequestModule** (`service_request`/`feature_request`): Request summary.

- **ExpertSwarmingSection** (overlay): Activates within troubleshooting when root cause confidence < 0.5 AND priority is high/urgent.

`knownIssueResolution` is set when `handleJiraIssueResult` in canvas-bridge detects a Bug/Defect JIRA issue. `rootCauseSignals` come from the `/brief` LLM response.

---

### 8. Incidents (Incident Detection)

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Store field** | `incidentSignals`                                  |
| **Component**   | `IncidentDetectionSection.tsx`                     |
| **API**         | Part of `GET /api/tickets/{id}/brief` LLM response |

**Population**: From the `/brief` LLM response when the LLM detects a pattern of similar issues:

- `patternDescription` — What pattern was detected
- `affectedTicketIds` — Other tickets with the same issue
- `severity` — low/medium/high/critical
- `confidence`
- `suggestedAction` — "Create Incident" button

**Renders**: Cards per signal with severity badge (color-coded border), confidence, pattern description, clickable affected ticket IDs, "Create Incident" button.

---

### 9. Timeline (Ticket Timeline)

|                 |                                  |
| --------------- | -------------------------------- |
| **Store field** | `timelineEvents`                 |
| **Component**   | `TimelineSection.tsx`            |
| **API**         | `GET /api/tickets/{id}/timeline` |

**Population — Multiple sources:**

1. `fetchTimeline()` from canvas-bridge calls `/timeline` route -> fetches comments via Zendesk MCP `get_ticket_comments` -> converts to timeline events
2. `TimelineSection` component has a `useEffect` self-healing fallback that fetches if store is empty
3. `handleTicketComments` in canvas-bridge converts SSE tool results from `get_ticket_comments` directly
4. `handleCreatedComment` appends new comments and re-fetches for consistency

Each comment becomes a `TimelineEvent`:

- `type`: `customer_reply` (public) or `internal_note` (non-public)
- `author`, `timestamp`, `text` (truncated 500 chars)

**Renders**: Vertical timeline with color-coded icons per event type (blue = customer, teal = agent, yellow = status change, gray = internal note, red = escalation). Shows author, timestamp, message text.

---

## Communication Dock

Persistent footer (outside scroll area) with:

- 3 tabs: Reply, Internal Note, Escalation
- Shows suggested draft when generated by LLM
- "Draft Message" button triggers chat action
- "Send" button triggers Zendesk comment creation
- Auto-expands when `suggestedDraft` arrives

---

## Data Flow Summary

```
Dive In / get_ticket
    |
    +---> /brief (LLM)       --> Intel (enriched), Next Action, Root Cause,
    |                              Incidents, Suggested Actions, JIRA links
    +---> /customer           --> Customer
    +---> /readiness          --> Readiness --> auto triggers /classify
    |                                            --> Classification --> activates Resolution Module
    +---> /resolution-insights --> Insights (SearchUnify + JIRA)
    +---> /timeline            --> Timeline
    +---> /similar             --> Similar Cases
```

---

## Canvas Store (Zustand)

File: `src/stores/canvas-store.ts` (ephemeral, no persist middleware)

**Core state**: `activeTicketId`, `sections` (visibility/loading per section), `focusedSection`, `resolutionWorkflow`

**Data fields**: One per section (all nullable/empty by default):

- `ticketIntelligence`, `customerIntelligence`, `ticketReadiness`, `caseClassification`
- `resolutionInsights`, `nextBestAction`, `similarCases`, `timelineEvents`
- `rootCauseSignals`, `diagnosticTools`, `expertSwarming`, `incidentSignals`
- `kbArticleDraft`, `communicationTemplates`
- Module-specific: `selfServiceResolution`, `knownIssueResolution`, `serviceRequestSummary`, `resolutionSummary`

**Important setter pattern**: Every data setter (e.g. `setTicketIntelligence`) does TWO things:

1. Sets the data field
2. Updates the corresponding section's `SectionState` — `visible: true`, `loading: false`, `lastUpdated: new Date()`

This means sections automatically appear in the nav bar as soon as data arrives.

**`loadTicket(ticketId)`**: Resets ALL data to null/empty, resets workflow to intake, applies intake stage layout, sets `focusedSection` to "ticket-intelligence".

---

## Key Files Reference

| File                                                    | Purpose                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/types/canvas.ts`                                   | All type definitions (section IDs, data interfaces, workflow types)  |
| `src/stores/canvas-store.ts`                            | Zustand store — state, setters, stage layout, workflow               |
| `src/lib/chat/canvas-bridge.ts`                         | Tool result handlers, background fetch functions, JIRA merge helpers |
| `src/components/canvas/CanvasPanel.tsx`                 | Main container, FocusedSectionRenderer                               |
| `src/components/canvas/SectionNavBar.tsx`               | Horizontal chip navigation                                           |
| `src/components/canvas/WorkflowProgressBar.tsx`         | 4-stage visual progress                                              |
| `src/components/canvas/ResolutionStageContainer.tsx`    | Routes to resolution modules                                         |
| `src/components/canvas/CommunicationDock.tsx`           | Persistent draft/reply footer                                        |
| `src/components/morning-brief/TriageCard.tsx`           | Dive In entry point                                                  |
| `src/app/api/tickets/[id]/brief/route.ts`               | LLM enrichment API                                                   |
| `src/app/api/tickets/[id]/customer/route.ts`            | Customer intelligence API                                            |
| `src/app/api/tickets/[id]/readiness/route.ts`           | Readiness assessment API                                             |
| `src/app/api/tickets/[id]/classify/route.ts`            | Case classification API                                              |
| `src/app/api/tickets/[id]/resolution-insights/route.ts` | Resolution insights API (SearchUnify + JIRA)                         |
| `src/app/api/tickets/[id]/timeline/route.ts`            | Timeline events API                                                  |
| `src/app/api/tickets/[id]/similar/route.ts`             | Similar cases API                                                    |
