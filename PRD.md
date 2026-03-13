# Product Requirements Document — SU Agent Nexus

**Version:** 1.0
**Date:** 2026-03-07
**Status:** Living Document
**Audience:** Support Engineers, Product Managers, Engineering, QA

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Actors & Personas](#2-actors--personas)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Authentication & Access](#4-authentication--access)
5. [Core Features](#5-core-features)
6. [Use Cases & Workflows](#6-use-cases--workflows)
7. [Resolution Intelligence Engine — The 6-Stage Workflow](#7-resolution-intelligence-engine--the-6-stage-workflow)
8. [Command Palette (OmniBar)](#8-command-palette-omnibar)
9. [Human-in-the-Loop (HITL) Safety System](#9-human-in-the-loop-hitl-safety-system)
10. [MCP Integrations](#10-mcp-integrations)
11. [AI / LLM Integration](#11-ai--llm-integration)
12. [Functional Requirements](#12-functional-requirements)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Edge Cases & Error Handling](#14-edge-cases--error-handling)
15. [Keyboard Shortcuts Reference](#15-keyboard-shortcuts-reference)
16. [Glossary](#16-glossary)
17. [Appendix: Slash Commands Reference](#17-appendix-slash-commands-reference)
18. [Appendix: Environment Variables](#18-appendix-environment-variables)

---

## 1. Product Overview

### 1.1 What is SU Agent Nexus?

SU Agent Nexus is an **AI-powered support agent HUD (Heads-Up Display)** designed for customer support engineers. It provides a unified workspace where agents can investigate, troubleshoot, and resolve customer support tickets using a combination of real-time AI assistance, Zendesk ticket management, and SearchUnify-powered knowledge discovery — all within a single browser tab.

### 1.2 Problem Statement

Support engineers today must juggle multiple tools — Zendesk for ticket management, internal knowledge bases for resolution guidance, Slack for expert collaboration, Jira for bug tracking, and log analysis tools for diagnostics. Context-switching between these tools slows resolution times, increases cognitive load, and leads to inconsistent customer communication.

### 1.3 Solution

Agent Nexus consolidates these workflows into a **two-panel HUD**:

- **Left Panel (Chat):** A conversational AI assistant that understands the ticket context, can query Zendesk and SearchUnify on the agent's behalf, and guides the agent through a structured resolution workflow.
- **Right Panel (Canvas):** An intelligence dashboard that automatically populates with ticket analysis, customer intelligence, similar cases, root cause signals, resolution insights, and draft responses as the conversation progresses.

### 1.4 Key Value Propositions

| Value                     | Description                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Faster Resolution**     | AI-powered analysis reduces mean time to resolution (MTTR) by surfacing relevant knowledge and similar cases instantly |
| **Consistent Quality**    | Structured 6-stage workflow ensures no steps are missed                                                                |
| **Knowledge Capture**     | Automatically drafts KB articles from resolved cases, building institutional knowledge                                 |
| **Safety First**          | Human-in-the-Loop approval system prevents unintended actions on live tickets                                          |
| **Zero Data Persistence** | No ticket content or PII is stored — all state is ephemeral and session-scoped                                         |

---

## 2. Actors & Personas

### 2.1 Primary Actor: Support Engineer (Agent)

The primary user of Agent Nexus. This person handles a queue of customer support tickets and needs to investigate, troubleshoot, and resolve them efficiently.

**Characteristics:**

- Authenticated via Zendesk OAuth (uses their existing Zendesk credentials)
- Has read/write access to tickets in Zendesk
- May range from L1 (frontline) to L3 (senior/escalation) support
- Works a queue of 10-30 tickets per day
- Needs quick access to knowledge base articles, similar cases, and expert advice

**Goals:**

- Resolve tickets quickly with high-quality responses
- Avoid missing critical context (customer tier, SLA risk, related incidents)
- Draft professional, empathetic customer replies
- Escalate complex issues to the right experts
- Capture knowledge for future cases

### 2.2 Secondary Actor: AI Assistant (System)

The LLM-powered conversational agent that acts as a co-pilot for the support engineer.

**Characteristics:**

- Powered by Anthropic Claude, OpenAI, or Google Gemini (configurable)
- Has access to Zendesk tickets and SearchUnify knowledge base via MCP tools
- Operates within HITL constraints — cannot take destructive actions without approval
- Maintains session-scoped semantic memory (no cross-session persistence)

**Capabilities:**

- Fetch and analyze ticket details
- Search knowledge base for solutions
- Classify cases and assess ticket readiness
- Draft customer responses
- Suggest next best actions
- Identify incident patterns across tickets
- Recommend experts for swarming

### 2.3 Tertiary Actor: Team Lead / Admin

Not a direct user of the HUD in v1, but benefits from:

- Knowledge articles automatically drafted by agents
- Consistent resolution workflows across the team
- Incident pattern detection surfacing systemic issues

### 2.4 External Systems (Non-Human Actors)

| System           | Role                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Zendesk**      | Source of truth for tickets, comments, customer data, and ticket lifecycle             |
| **SearchUnify**  | Semantic search across knowledge base, past tickets, Slack, Jira, and incident records |
| **LLM Provider** | Generates analysis, classifications, response drafts, and orchestrates tool use        |

---

## 3. System Architecture Overview

### 3.1 High-Level Architecture

```
+---------------------------------------------------+
|                  Browser (Agent)                   |
|  +---------------------+  +---------------------+ |
|  |     Chat Panel      |  |    Canvas Panel      | |
|  |  (Left - 40%)       |  |  (Right - 60%)       | |
|  |                     |  |                       | |
|  |  Chat Input         |  |  Workflow Progress    | |
|  |  Message List       |  |  Intelligence Sections| |
|  |  Thought Trace      |  |  Response Editor      | |
|  |  HITL Approvals     |  |  Similar Cases        | |
|  +---------------------+  +---------------------+ |
|           |  Command Palette (OmniBar)  |          |
|           |  Status Bar                 |          |
+---------------------------------------------------+
               |                    ^
               | SSE Stream         | REST API
               v                    |
+---------------------------------------------------+
|              Next.js Server (API Routes)           |
|  +-------+  +----------+  +-------------------+   |
|  | Auth  |  | Chat SSE |  | Ticket Endpoints  |   |
|  | OAuth |  | Agent    |  | /brief /classify  |   |
|  |       |  | Loop     |  | /similar /experts |   |
|  +-------+  +----------+  +-------------------+   |
|       |           |               |                |
|  +----v-----------v---------------v-----------+    |
|  |         MCP Client Layer                   |    |
|  |  Rate Limiter | OAuth Token Mgmt | Cache   |    |
|  +----+-------------------+-------------------+    |
+-------|-------------------|---------------------+
        |                   |
   +----v----+        +-----v-------+
   | Zendesk |        | SearchUnify |
   | MCP     |        | MCP         |
   | Server  |        | Server      |
   +---------+        +-------------+
```

### 3.2 Tech Stack

| Layer           | Technology                                             |
| --------------- | ------------------------------------------------------ |
| Frontend        | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling         | Tailwind CSS v4, dark-only theme                       |
| State           | Zustand 5 (ephemeral, no persistence)                  |
| Auth            | NextAuth.js v5 with Zendesk OAuth2                     |
| AI/LLM          | Anthropic SDK, OpenAI SDK, Google Generative AI SDK    |
| Rich Text       | TipTap editor                                          |
| Command Palette | cmdk                                                   |
| Animations      | Framer Motion                                          |
| Notifications   | sonner (toasts)                                        |
| URL State       | nuqs                                                   |
| MCP             | @modelcontextprotocol/sdk (HTTP transport)             |
| Testing         | Vitest (unit), Playwright (E2E)                        |
| Deployment      | Docker multi-stage, Docker Compose                     |

### 3.3 Data Flow Principles

1. **No persistent storage** — No database. All ticket data, analysis results, and chat history exist only in the browser's memory (Zustand stores) for the duration of the session.
2. **MCP calls are server-side only** — The browser never directly calls Zendesk or SearchUnify. All external service calls are proxied through Next.js API routes.
3. **OAuth tokens in HTTP-only cookies** — Zendesk access tokens are stored in encrypted, HTTP-only cookies managed by NextAuth. They are never exposed to client-side JavaScript.
4. **Streaming via SSE** — Chat responses stream in real-time via Server-Sent Events, giving agents immediate feedback as the AI thinks and acts.

---

## 4. Authentication & Access

### 4.1 Login Flow

1. Agent navigates to the application URL
2. Unauthenticated users are redirected to `/login`
3. Agent clicks **"Sign in with Zendesk"**
4. Browser redirects to `{ZENDESK_SUBDOMAIN}.zendesk.com/oauth/authorizations/new`
5. Agent grants the application `read write` permissions
6. Zendesk redirects back with an authorization code
7. The server exchanges the code for an access token
8. User profile is fetched from Zendesk (`/api/v2/users/me.json`)
9. A session is created (JWT stored in HTTP-only cookie, 8-hour TTL)
10. Agent lands on the main HUD

### 4.2 Auth Modes

| Mode                | Description                                                                                                         | Use Case                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **OAuth** (default) | Each agent authenticates with their own Zendesk credentials. Their personal access token is used for all MCP calls. | Production — full per-user access control |
| **API Token**       | A shared `ZENDESK_EMAIL` + `ZENDESK_API_TOKEN` is used for all MCP calls regardless of who is logged in.            | Development/testing — simplified setup    |

### 4.3 Session Management

- Sessions expire after **8 hours** (configurable via `SESSION_TTL_MINUTES`)
- Session data includes: user ID, email, name, avatar, Zendesk access token
- On expiry, the agent is redirected to `/login`
- No "remember me" — sessions are intentionally short-lived for security

### 4.4 Route Protection

- All routes except `/login` require authentication
- API routes handle auth internally (return 401 if unauthenticated)
- Middleware intercepts navigation requests and redirects to `/login` if no valid session

---

## 5. Core Features

### 5.1 Two-Panel HUD Layout

The application uses a **resizable split-pane layout**:

| Panel              | Default Width | Purpose                                         |
| ------------------ | ------------- | ----------------------------------------------- |
| **Left (Chat)**    | 40%           | Conversational AI assistant                     |
| **Right (Canvas)** | 60%           | Intelligence dashboard with structured sections |

- The divider between panels is **draggable** — agents can resize panels to their preference
- Panel ratio is stored in session state (resets on refresh)

### 5.2 Chat Panel (Left)

The chat panel is the primary interaction surface. Agents converse with the AI assistant using natural language or slash commands.

**Components:**

| Component               | Description                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Model Selector**      | Dropdown to choose LLM provider/model (Anthropic Claude, OpenAI GPT, Google Gemini)                                         |
| **Message List**        | Scrollable conversation history with user and assistant messages                                                            |
| **Message Bubbles**     | User messages (right-aligned, accent bg), assistant messages (left-aligned, dark bg, markdown-rendered)                     |
| **Thought Trace**       | Expandable section on assistant messages showing intermediate reasoning steps, intent analysis, and tool discovery          |
| **Tool Call Cards**     | Inline cards showing which MCP tools the AI invoked (e.g., "Called zendesk\_\_get_ticket with id: 12345") and their results |
| **Streaming Indicator** | Animated dots showing the AI is generating a response                                                                       |
| **HITL Approval Cards** | Action approval cards that appear when the AI wants to perform a write operation (see Section 9)                            |
| **KB Suggestion Pills** | Clickable pill buttons suggesting relevant knowledge base articles                                                          |
| **Chat Input**          | Multi-line text area with Enter to send, Shift+Enter for newlines, slash command hints                                      |
| **Template Selector**   | Quick-access to canned response templates                                                                                   |

**Canned Templates (Built-in):**

| Template                  | Category   |
| ------------------------- | ---------- |
| Greeting                  | General    |
| Password Reset            | Account    |
| Escalation Notice         | Escalation |
| Billing Inquiry           | Billing    |
| Bug Report Acknowledgment | Technical  |
| Closing / Follow-up       | General    |

### 5.3 Canvas Panel (Right)

The canvas panel automatically populates with structured intelligence as the AI analyzes a ticket. It contains up to **17 collapsible sections**, organized around the 6-stage Resolution Intelligence Engine.

Each section:

- Has a **header** with title, icon, and optional badge (e.g., confidence score)
- Can be **collapsed/expanded** independently
- Shows a **loading skeleton** while data is being fetched
- Displays an **error state** if data fetch fails
- Animates in/out using Framer Motion

**Sections:**

| Section                  | Stage           | Description                                                                                           |
| ------------------------ | --------------- | ----------------------------------------------------------------------------------------------------- |
| Workflow Progress Bar    | —               | Visual 6-stage tracker showing current position in the resolution workflow                            |
| Next Best Action         | —               | Top AI recommendation with confidence score and action buttons                                        |
| Ticket Intelligence      | —               | Full ticket analysis: summary, sentiment, SLA risk, related articles, tags                            |
| Customer Intelligence    | —               | Customer profile: org, tier, open tickets, sentiment trend, ARR                                       |
| Ticket Readiness         | Intake          | Readiness score (0-100) with checklist of required fields                                             |
| Case Classification      | Classification  | Category (bug, feature, self-service) with confidence and reasoning                                   |
| Root Cause Analysis      | Troubleshooting | Root cause signals with confidence, evidence, and troubleshooting steps                               |
| Troubleshooting Tools    | Troubleshooting | Diagnostic tool launcher (logs, metrics, deployments)                                                 |
| Similar Cases            | Troubleshooting | Past tickets with similar issues, their resolutions, and similarity scores                            |
| Resolution Insights      | Troubleshooting | SearchUnify-powered: similar case counts, common resolutions, related Jira issues                     |
| Expert Swarming          | Swarming        | Recommended engineers with expertise tags, availability, and "Invite to Swarm" buttons                |
| Customer Communication   | Communication   | Communication templates with tone options (empathetic, technical, escalation)                         |
| Response Draft           | Communication   | TipTap rich text editor with AI-generated draft, formatting toolbar, word count, and "Send to Ticket" |
| Knowledge Capture        | Capture         | Auto-generated KB article draft: problem, root cause, resolution steps, affected versions             |
| Incident Detection       | —               | Cross-ticket pattern alerts with severity and affected ticket count                                   |
| Ticket Timeline          | —               | Chronological event history (replies, status changes, assignments)                                    |
| Diagnostics / Log Viewer | —               | Log file viewer with level filtering, search, and annotations                                         |

### 5.4 Morning Brief (Ticket Triage)

On first load (or triggered via OmniBar), agents see a **Morning Brief overlay** — a prioritized view of their open ticket queue.

**Features:**

- Fetches all open/pending tickets assigned to the agent from Zendesk
- Displays **Triage Cards** with: ticket ID, subject, priority, requester, tags
- Cards sorted by priority (urgent/high first)
- Click a card to load it into the Canvas for analysis
- **"Start Top Priority"** button to immediately begin working the highest-priority ticket
- **"Skip"** to dismiss and work freely
- Dismissible with `Escape` key

### 5.5 Log Viewer

Agents can upload or paste log files for AI-assisted analysis.

**Supported Formats:**

- **Standard:** `YYYY-MM-DD HH:MM:SS [LEVEL] (source): message`
- **Syslog:** `timestamp host process[pid]: message`
- **JSON:** `{ "timestamp", "level", "source", "message" }`

**Features:**

- Drag-and-drop file upload (DropZone component)
- Auto-format detection
- Level-based filtering (DEBUG, INFO, WARN, ERROR, FATAL)
- Text search across log entries
- Log annotations (agent can add notes to specific lines)
- Summary statistics: count by level, time range
- 10 MB file size limit

### 5.6 Response Draft Editor

A TipTap-based rich text editor in the Canvas for composing customer replies.

**Features:**

- **Formatting Toolbar:** Bold, Italic, Underline, Strikethrough, Bullet/Ordered lists, Code blocks, Undo/Redo
- **AI Pre-fill:** The AI assistant can draft a response that auto-populates in the editor
- **Manual Editing:** Agents can freely edit the draft before sending
- **Word Count:** Live word count display
- **Copy to Clipboard:** One-click copy of the formatted response
- **Send to Ticket:** Button to post the response as a Zendesk comment (requires HITL approval in supervised mode)
- **Plain Text Export:** Strips HTML for pasting into other tools

---

## 6. Use Cases & Workflows

### UC-1: Start-of-Shift Triage

**Actor:** Support Engineer
**Precondition:** Agent is authenticated
**Trigger:** Agent opens the application or triggers `/morning-brief`

**Flow:**

1. Morning Brief overlay appears with the agent's open ticket queue
2. Tickets are displayed as triage cards sorted by priority
3. Agent scans the queue for urgent items
4. Agent clicks "Start Top Priority" or selects a specific ticket
5. The overlay dismisses and the selected ticket loads into the Canvas
6. Ticket Intelligence section populates with AI-generated summary, sentiment, and SLA risk

**Outcome:** Agent has a clear picture of their workload and begins with the most critical ticket.

---

### UC-2: Investigate a Ticket

**Actor:** Support Engineer
**Precondition:** Agent is on the main HUD
**Trigger:** Agent types a message like "Pull up ticket #54321" or uses `/summarize 54321`

**Flow:**

1. The AI classifies the intent as `ticket_lookup`
2. AI calls `zendesk__get_ticket` via MCP to fetch ticket details
3. AI calls `zendesk__get_ticket_comments` to fetch conversation history
4. AI generates a summary and populates the Canvas:
   - **Ticket Intelligence:** Subject, priority, status, SLA risk, sentiment
   - **Customer Intelligence:** Requester profile, org, tier, open tickets
   - **Next Best Action:** AI's top recommendation
5. The AI responds in chat with a natural language summary
6. Thought Trace shows the reasoning steps taken

**Outcome:** Agent has full context on the ticket without leaving the HUD.

---

### UC-3: Search for Solutions

**Actor:** Support Engineer
**Precondition:** A ticket is loaded in context
**Trigger:** Agent asks "How do I fix this?" or uses `/search error code 5012`

**Flow:**

1. AI classifies intent as `kb_search`
2. AI calls `searchunify__search` with relevant keywords from the ticket
3. SearchUnify returns matched KB articles, past ticket resolutions, and Slack threads
4. AI populates the Canvas:
   - **Similar Cases:** Past tickets with resolution details and similarity %
   - **Resolution Insights:** Common resolutions, frequency, evidence sources
   - **KB Suggestion Pills** appear in the chat for quick access
5. AI summarizes findings in the chat: "I found 3 similar cases. The most common resolution is..."

**Outcome:** Agent has curated, relevant solutions without manual searching.

---

### UC-4: Assess Ticket Readiness

**Actor:** Support Engineer
**Precondition:** A ticket is loaded
**Trigger:** Agent asks "Is this ticket ready to work?" or uses `/readiness`

**Flow:**

1. AI analyzes the ticket against the readiness checklist:
   - Product/module identified?
   - Error description provided?
   - Reproduction steps included?
   - Logs attached?
   - Version info specified?
2. Canvas populates **Ticket Readiness** section:
   - Score: 0-100 with color-coded bar (red < 40, yellow 40-70, green > 70)
   - Checklist with pass/fail for each field
   - Missing fields listed explicitly
3. If score is low, AI suggests: "You should ask the customer for reproduction steps and log files."
4. Action buttons allow one-click customer follow-up for missing info

**Outcome:** Agent knows exactly what information is missing before spending time on investigation.

---

### UC-5: Classify a Case

**Actor:** Support Engineer
**Precondition:** A ticket is loaded
**Trigger:** Agent asks "What type of case is this?" or uses `/classify`

**Flow:**

1. AI analyzes ticket content, tags, and customer history
2. Classifies into one of:
   - **Self-Service** — Customer can resolve with KB article
   - **Service Request** — Standard request requiring agent action
   - **Feature Request** — Product enhancement suggestion
   - **Bug / Known Issue** — Software defect, possibly with existing Jira
3. Canvas populates **Case Classification** section:
   - Category badge (color-coded)
   - Confidence percentage
   - Reasoning explanation
   - Suggested next actions

**Outcome:** Agent immediately knows the resolution path to follow.

---

### UC-6: Draft a Customer Response

**Actor:** Support Engineer
**Precondition:** A ticket is loaded and investigated
**Trigger:** Agent asks "Draft a reply" or uses `/draft`

**Flow:**

1. AI considers all context: ticket details, investigation findings, similar case resolutions
2. AI generates a structured response with:
   - Professional greeting
   - Acknowledgment of the issue
   - Step-by-step resolution or next steps
   - Appropriate closing
3. The draft appears in both:
   - **Chat:** As a markdown-formatted message
   - **Canvas:** In the **Response Draft** section with the TipTap editor pre-filled
4. Agent reviews and edits the draft in the rich text editor
5. Agent clicks **"Send to Ticket"** to post it as a Zendesk comment
6. If HITL is in supervised mode, an approval card appears (see UC-10)

**Outcome:** Agent sends a high-quality, contextually-appropriate response in seconds.

---

### UC-7: Escalate a Ticket

**Actor:** Support Engineer
**Precondition:** A ticket is loaded; agent determines it needs escalation
**Trigger:** Agent asks "Escalate this to engineering" or uses `/escalate`

**Flow:**

1. AI analyzes the ticket for escalation-worthy signals (severity, customer tier, SLA breach risk)
2. AI populates the Canvas:
   - **Expert Swarming:** Recommended engineers with expertise tags, availability, and resolved-similar-case counts
   - **Next Best Action:** "Escalate to [Expert Name]" with confidence
3. Agent reviews the recommended experts
4. Agent clicks **"Invite to Swarm"** on the appropriate expert
5. AI suggests a Slack channel for collaboration
6. AI can draft an internal escalation note

**Outcome:** The right expert is engaged quickly with full context.

---

### UC-8: Analyze Log Files

**Actor:** Support Engineer
**Precondition:** Customer has attached log files to their ticket
**Trigger:** Agent drags a log file into the Log Viewer or uses `/check-logs`

**Flow:**

1. Log file is uploaded via the DropZone (max 10 MB)
2. Server auto-detects the log format (standard, syslog, JSON)
3. Log entries are parsed and displayed in the **Log Viewer**:
   - Tabular view with timestamp, level, source, message
   - Color-coded by severity level
4. Agent filters by level (e.g., show only ERROR and FATAL)
5. Agent searches for specific error codes or patterns
6. Agent adds annotations to key lines for reference
7. AI can analyze the logs and highlight: "Found 12 ERROR entries between 14:00-14:15. The root cause appears to be a database connection timeout."

**Outcome:** Agent quickly identifies the root cause from potentially thousands of log lines.

---

### UC-9: Capture Knowledge

**Actor:** Support Engineer
**Precondition:** A ticket has been successfully resolved
**Trigger:** Agent asks "Create a KB article from this" or uses `/kb`

**Flow:**

1. AI synthesizes the entire resolution journey: original issue, investigation steps, root cause, resolution
2. Canvas populates **Knowledge Capture** section with:
   - **Title:** Descriptive article title
   - **Problem:** Customer-facing problem statement
   - **Root Cause:** Technical explanation
   - **Resolution Steps:** Numbered step-by-step guide
   - **Affected Versions:** Product versions (as tags)
   - **Tags:** Searchable keywords
3. Status badge shows "Draft"
4. Agent reviews and edits the draft
5. Agent clicks **"Publish to KB"** to submit for review

**Outcome:** Institutional knowledge is captured immediately, reducing future resolution times for similar issues.

---

### UC-10: HITL Approval for Write Actions

**Actor:** Support Engineer
**Precondition:** HITL mode is set to "Supervised"; AI attempts a write operation
**Trigger:** AI calls a tool classified as high-risk (e.g., `create_ticket_comment`, `update_ticket`)

**Flow:**

1. AI determines it needs to execute a write operation
2. The system classifies the action's risk level:
   - **Low:** Read operations (auto-approved)
   - **Medium:** Adding comments (prompt for approval)
   - **High:** Updating ticket status, creating tickets (requires hold-to-approve)
3. An **Action Approval Card** appears in the chat panel:
   - Tool name and description
   - Risk level badge (color-coded)
   - Arguments the AI intends to pass
4. For **high-risk** actions: Agent must **press and hold the Approve button for 2 seconds** (prevents accidental approval)
5. For **medium-risk** actions: Single click to approve
6. Agent can always click **Reject** to deny the action
7. If no response within **60 seconds**, the action is auto-rejected
8. Upon approval, the tool executes and results appear in chat
9. Upon rejection, the AI acknowledges and suggests alternatives

**Outcome:** Agents maintain full control over any action that modifies live data.

---

### UC-11: Detect Incident Patterns

**Actor:** Support Engineer
**Precondition:** Multiple tickets are in the system with similar symptoms
**Trigger:** Agent asks "Are there any incident patterns?" or uses `/incident`

**Flow:**

1. AI analyzes the current ticket against recent tickets in the queue
2. If a pattern is detected (e.g., 5+ tickets about the same error in the last hour):
3. Canvas populates **Incident Detection** section:
   - Pattern description
   - Number of affected tickets
   - Severity level (low/medium/high/critical)
   - Confidence score
   - Suggested action (e.g., "Escalate as P1 incident")
4. Agent can trigger escalation or notify the team

**Outcome:** Systemic issues are surfaced proactively before they become full outages.

---

### UC-12: Switch LLM Provider Mid-Session

**Actor:** Support Engineer
**Precondition:** Multiple LLM providers are configured
**Trigger:** Agent selects a different model from the Model Selector dropdown

**Flow:**

1. Agent clicks the Model Selector in the chat header
2. Available models are shown grouped by provider (Anthropic, OpenAI, Google)
3. Agent selects a different model
4. The next chat message uses the newly selected provider/model
5. Previous conversation history is preserved and sent to the new model
6. Canvas data is retained (it does not re-fetch on model switch)

**Outcome:** Agent can switch to a different AI model if the current one isn't producing good results.

---

## 7. Resolution Intelligence Engine — The 6-Stage Workflow

The Resolution Intelligence Engine (RIE) is the core workflow framework. It provides a structured, repeatable process for ticket resolution that ensures consistency across the support team.

### 7.1 Visual Progress Tracker

At the top of the Canvas panel, a **Workflow Progress Bar** shows the current stage:

```
  [1]----[2]----[3]----[4]----[5]----[6]
Intake  Class  Troubl  Swarm  Comms  Capture
```

- **Completed stages:** Checkmark icon, green connector line
- **Current stage:** Pulsing animation, highlighted node
- **Pending stages:** Numbered circle, dim connector line
- Clicking a stage scrolls the Canvas to the corresponding section

### 7.2 Stage Details

#### Stage 1: Intake Validation

**Purpose:** Ensure the ticket has enough information to begin investigation.

**Outputs:**

- Readiness score (0-100)
- Field-by-field checklist:
  - Product / Module identified
  - Error description provided
  - Reproduction steps included
  - Logs or screenshots attached
  - Version / environment info specified
- List of missing fields with suggested prompts to request them from the customer

**Triggers:** `/readiness`, "Is this ticket ready?", automatic on ticket load

**Advancement Criteria:** Readiness score >= 70, or agent manually advances

---

#### Stage 2: Case Classification

**Purpose:** Determine the type of issue to route it to the correct resolution path.

**Categories:**
| Category | Description | Typical Action |
|----------|-------------|----------------|
| Self-Service | Customer can resolve with a KB article | Send KB link, close |
| Service Request | Standard operational request | Follow SOP, fulfill |
| Feature Request | Product enhancement suggestion | Log in Jira, communicate timeline |
| Bug / Known Issue | Software defect | Check Jira for existing bug, escalate if new |

**Outputs:**

- Category with color-coded badge
- Confidence percentage (0-100%)
- Reasoning explanation
- Suggested actions for the classified category

**Triggers:** `/classify`, "What type of case is this?"

---

#### Stage 3: Troubleshooting

**Purpose:** Investigate root cause and find resolution.

**Outputs:**

- Root cause signals (description, confidence, evidence, category)
- Troubleshooting step checklist with status tracking:
  - Pending (circle icon)
  - In Progress (pulsing dot)
  - Completed (checkmark) with result
  - Skipped (X mark)
- KB article citations for each step
- Agent annotations (free-text notes on steps)
- Similar cases with resolution details
- Resolution insights from SearchUnify: common resolutions, related Jira issues, evidence sources
- Diagnostic tool results (logs, metrics)

**Triggers:** `/rootcause`, `/similar`, `/search`, `/check-logs`, "What's causing this?"

---

#### Stage 4: Expert Swarming

**Purpose:** Bring in the right experts for complex issues.

**Outputs:**

- Expert recommendations:
  - Name, role, expertise tags
  - Availability indicator (green/yellow/red)
  - Count of similar issues previously resolved
  - "Invite to Swarm" action button
- Suggested Slack channel for collaboration
- Reasoning for why each expert was recommended

**Triggers:** `/swarm`, "Who can help with this?"

---

#### Stage 5: Customer Communication

**Purpose:** Draft and send the customer response.

**Outputs:**

- Communication templates organized by type:
  - Customer reply
  - Internal note
  - Escalation notice
- Tone selection: Empathetic, Technical, Escalation
- Rich text editor (TipTap) with formatting tools
- Word count, copy button
- "Send to Ticket" action (posts to Zendesk with HITL approval)

**Triggers:** `/draft`, "Write a reply", "Respond to customer"

---

#### Stage 6: Knowledge Capture

**Purpose:** Document the resolution for future reference.

**Outputs:**

- Auto-generated KB article draft:
  - Title
  - Problem statement
  - Root cause analysis
  - Numbered resolution steps
  - Affected product versions
  - Searchable tags
- Status indicator: Draft / Ready for Review
- "Generate Draft" and "Publish to KB" actions

**Triggers:** `/kb`, "Create an article from this case"

---

## 8. Command Palette (OmniBar)

The OmniBar is a **command palette** (similar to VS Code's Cmd+K or Spotlight) that provides quick access to all application actions.

### 8.1 Activation

- Keyboard: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- Always accessible from any state in the application

### 8.2 Command Groups

#### Actions

| Command           | Description               | Effect                                                       |
| ----------------- | ------------------------- | ------------------------------------------------------------ |
| `/summarize`      | Summarize current ticket  | Sends chat message, populates Ticket Intelligence            |
| `/draft`          | Draft a response          | Sends chat message, populates Response Draft editor          |
| `/escalate`       | Escalate current ticket   | Sends chat message, populates Expert Swarming                |
| `/check-logs`     | Analyze attached logs     | Sends chat message, opens Log Viewer                         |
| `/similar`        | Find similar cases        | Sends chat message, populates Similar Cases                  |
| `/rootcause`      | Analyze root cause        | Sends chat message, populates Root Cause section             |
| `/customer`       | Get customer intelligence | Sends chat message, populates Customer Intelligence          |
| `/search [query]` | Search knowledge base     | Sends chat message with query, populates Resolution Insights |

#### Resolution Intelligence

| Command      | Description                 | Effect                                |
| ------------ | --------------------------- | ------------------------------------- |
| `/readiness` | Check ticket readiness      | Populates Ticket Readiness section    |
| `/classify`  | Classify case type          | Populates Case Classification section |
| `/swarm`     | Find experts to swarm       | Populates Expert Swarming section     |
| `/kb`        | Generate KB article draft   | Populates Knowledge Capture section   |
| `/incident`  | Check for incident patterns | Populates Incident Detection section  |

#### Navigation

| Command       | Description             | Effect                      |
| ------------- | ----------------------- | --------------------------- |
| Morning Brief | Open ticket triage view | Shows Morning Brief overlay |

### 8.3 Search Behavior

- Commands are **fuzzy-searchable** — typing "draft" will match `/draft`
- Empty state shows all available commands grouped by category
- Commands execute immediately on selection (Enter or click)

---

## 9. Human-in-the-Loop (HITL) Safety System

### 9.1 Overview

The HITL system ensures that the AI assistant cannot perform destructive or impactful actions on live Zendesk data without explicit agent approval.

### 9.2 Operating Modes

| Mode                     | Behavior                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Supervised** (default) | Write operations require explicit agent approval. Read operations execute automatically.                  |
| **Autonomous**           | All operations execute automatically. An indicator shows the agent that the system is in autonomous mode. |

Mode can be toggled via the **HITL Toggle** in the UI.

### 9.3 Risk Classification

| Risk Level | Examples                                                    | Approval UX                          |
| ---------- | ----------------------------------------------------------- | ------------------------------------ |
| **Low**    | `get_ticket`, `get_ticket_comments`, `search`               | Auto-approved (no prompt)            |
| **Medium** | `create_ticket_comment` (adding a reply)                    | Single-click approval                |
| **High**   | `update_ticket` (changing status/priority), `create_ticket` | **Hold-to-approve** (2-second press) |

### 9.4 Approval Card UI

When approval is required, an **Action Approval Card** renders in the chat panel:

```
+--------------------------------------------------+
|  [HIGH]  Update Ticket                           |
|                                                  |
|  Tool: zendesk__update_ticket                    |
|  Action: Set status to "solved"                  |
|                                                  |
|  [====== Hold to Approve ======]   [ Reject ]    |
+--------------------------------------------------+
```

- **Risk badge:** Color-coded (green/yellow/red)
- **Tool name and action description**
- **Approve button:** Single click (medium) or hold 2 seconds (high)
- **Reject button:** Always single click
- **60-second timeout:** Auto-rejects if agent doesn't respond
- **Framer Motion animation:** Card slides in smoothly

### 9.5 HITL Workflow

```
AI decides to call a tool
        |
        v
Is HITL mode "supervised"?
   No ──> Execute immediately
   Yes ──> Classify risk
              |
        +-----+-----+
        |     |     |
       Low  Medium  High
        |     |     |
   Execute  Show   Show
   auto   approval approval
          (click)  (hold 2s)
              |     |
         +----+-----+
         |           |
      Approved    Rejected
         |           |
      Execute    AI notified,
      tool       suggests
                 alternative
```

---

## 10. MCP Integrations

### 10.1 What is MCP?

The **Model Context Protocol** (MCP) is a standardized protocol for AI models to interact with external tools and data sources. Agent Nexus uses MCP to connect the AI assistant to Zendesk and SearchUnify.

### 10.2 Zendesk MCP Server

**Server:** `reminia/zendesk-mcp-server` (Python, stdio transport wrapped with HTTP proxy)
**URL:** Configured via `MCP_ZENDESK_URL` (default: `http://zendesk-mcp:8080/mcp` in Docker)

| Tool                    | Description                                       | Risk Level |
| ----------------------- | ------------------------------------------------- | ---------- |
| `get_tickets`           | Query tickets with search/sort                    | Low        |
| `get_ticket`            | Fetch single ticket by ID                         | Low        |
| `get_ticket_comments`   | Fetch ticket conversation                         | Low        |
| `create_ticket_comment` | Post a reply to a ticket                          | Medium     |
| `create_ticket`         | Create a new ticket                               | High       |
| `update_ticket`         | Modify ticket fields (status, priority, assignee) | High       |

### 10.3 SearchUnify MCP Server

**Server:** `searchunify/su-mcp` (Docker, HTTP transport)
**URL:** Configured via `MCP_SEARCHUNIFY_URL` (default: `http://localhost:3001`)

| Tool                 | Description                                     | Risk Level |
| -------------------- | ----------------------------------------------- | ---------- |
| `search`             | Semantic search across KB, tickets, Slack, Jira | Low        |
| `get-filter-options` | Retrieve available search filters               | Low        |
| `analytics`          | Search analytics and trending queries           | Low        |

### 10.4 LogParser (In-Process)

**Server:** Custom, runs in-process (no external MCP server)

| Tool    | Description                                       | Risk Level |
| ------- | ------------------------------------------------- | ---------- |
| `parse` | Parse uploaded log files (standard, syslog, JSON) | Low        |

### 10.5 Rate Limiting

All MCP calls go through a **token bucket rate limiter**:

- Default: **60 requests per minute** per service
- Configurable via `MCP_RATE_LIMIT_RPM`
- Requests exceeding the limit are queued and retried after token refill

### 10.6 Health Monitoring

The application continuously monitors MCP service health:

- **Endpoint:** `GET /api/mcp/health`
- **Checks:** Zendesk connectivity, SearchUnify connectivity
- **Statuses:** `healthy` (all services up) or `degraded` (some services down)
- **Status Bar:** The bottom status bar shows connection status for each MCP service

---

## 11. AI / LLM Integration

### 11.1 Supported Providers

| Provider      | Models                                  | Configuration       |
| ------------- | --------------------------------------- | ------------------- |
| **Anthropic** | Claude Opus, Sonnet, Haiku (4.x family) | `ANTHROPIC_API_KEY` |
| **OpenAI**    | GPT-4o, GPT-4, GPT-3.5                  | `OPENAI_API_KEY`    |
| **Google**    | Gemini Pro, Gemini Flash                | `GOOGLE_AI_API_KEY` |

At least one provider API key must be configured. Multiple can be active simultaneously; agents select their preferred model via the Model Selector.

### 11.2 Agent Loop

The AI operates in an **agentic loop** — it can reason, call tools, observe results, and continue reasoning until it has a complete answer.

**Loop Mechanics:**

1. **Intent Classification** — Fast pattern matching to detect what the agent wants (ticket lookup, KB search, escalation, etc.)
2. **Tool Discovery** — Query all MCP services for available tools, format as LLM-compatible definitions
3. **Semantic Memory** — Build enriched context from: active ticket, KB articles found, tool call history, extracted entities
4. **Streaming LLM Call** — Send messages + tools to the LLM provider, stream the response in real-time
5. **Tool Execution** — If the LLM requests a tool call, execute it (with HITL gate if applicable) and feed the result back
6. **Iteration** — Repeat steps 4-5 until the LLM produces a final text response or max iterations (default 10) is reached

### 11.3 Semantic Memory (Session-Scoped)

The AI maintains a **session-scoped memory** that persists within a single conversation but is never saved to disk:

| Memory Slot          | Description                                               | Max Items  |
| -------------------- | --------------------------------------------------------- | ---------- |
| Active Ticket        | Currently focused ticket ID, subject, status              | 1          |
| KB Articles          | Relevant knowledge base articles found during the session | 5          |
| Tool History         | Record of all tools called and their results              | 20         |
| Entities             | Extracted ticket IDs, error codes, URLs                   | Unlimited  |
| Resolution Insights  | SearchUnify results cached for context                    | Per ticket |
| Conversation Summary | Auto-generated after 8+ messages                          | 1          |

### 11.4 Context Window Management

- **Token Estimation:** The system estimates token counts for the conversation history
- **Truncation:** When approaching the context window limit, older messages are truncated while preserving the system prompt, recent messages, and semantic memory context
- **Enriched Context Block:** The semantic memory is serialized as a markdown block and prepended to the system prompt, giving the LLM persistent context without consuming excessive tokens

### 11.5 Canvas Bridge

When the AI produces structured output (ticket analysis, classifications, draft responses), a **response parser** extracts structured data from the markdown and automatically updates the corresponding Canvas sections.

**Recognized Headings → Canvas Sections:**

| Markdown Heading                                       | Canvas Section Updated         |
| ------------------------------------------------------ | ------------------------------ |
| `### Ticket Readiness` / `### Intake Validation`       | Ticket Readiness               |
| `### Case Classification` / `### Case Type`            | Case Classification            |
| `### Troubleshooting` / `### Diagnostic Steps`         | Root Cause                     |
| `### Draft Response` / `### Draft Reply`               | Response Draft (TipTap editor) |
| `### Root Cause` / `### Underlying Issue`              | Root Cause                     |
| `### Similar Cases` / `### Related Tickets`            | Similar Cases                  |
| `### Resolution Insights` / `### SearchUnify Insights` | Resolution Insights            |
| `### Incident Detection` / `### Pattern Detection`     | Incident Detection             |
| `### Knowledge Article Draft` / `### KB Article Draft` | Knowledge Capture              |

---

## 12. Functional Requirements

### FR-1: Authentication

| ID     | Requirement                                                             |
| ------ | ----------------------------------------------------------------------- |
| FR-1.1 | The system SHALL authenticate users via Zendesk OAuth2                  |
| FR-1.2 | The system SHALL store OAuth tokens in encrypted HTTP-only cookies only |
| FR-1.3 | Sessions SHALL expire after a configurable TTL (default 8 hours)        |
| FR-1.4 | Unauthenticated requests SHALL be redirected to `/login`                |
| FR-1.5 | The system SHALL support API token mode as an alternative to OAuth      |

### FR-2: Chat Interface

| ID     | Requirement                                                                                   |
| ------ | --------------------------------------------------------------------------------------------- |
| FR-2.1 | The system SHALL provide a streaming chat interface via Server-Sent Events                    |
| FR-2.2 | Chat messages SHALL render in Markdown format                                                 |
| FR-2.3 | The system SHALL display thought traces (intermediate reasoning steps) expandable per message |
| FR-2.4 | Tool calls and their results SHALL be displayed inline as cards                               |
| FR-2.5 | The system SHALL support multi-line input (Shift+Enter) and single-line send (Enter)          |
| FR-2.6 | The system SHALL provide a command palette (OmniBar) accessible via Cmd/Ctrl+K                |
| FR-2.7 | The system SHALL support slash commands for common actions                                    |
| FR-2.8 | The system SHALL allow model/provider selection mid-session                                   |

### FR-3: Canvas Intelligence

| ID     | Requirement                                                           |
| ------ | --------------------------------------------------------------------- |
| FR-3.1 | The Canvas SHALL automatically populate sections based on AI analysis |
| FR-3.2 | Each Canvas section SHALL be independently collapsible                |
| FR-3.3 | The Canvas SHALL display a 6-stage workflow progress bar              |
| FR-3.4 | The system SHALL support smooth scrolling to specific sections        |
| FR-3.5 | Sections SHALL show loading skeletons during data fetch               |
| FR-3.6 | Sections SHALL display error states gracefully                        |

### FR-4: Ticket Operations

| ID     | Requirement                                                                                 |
| ------ | ------------------------------------------------------------------------------------------- |
| FR-4.1 | The system SHALL fetch ticket details from Zendesk via MCP                                  |
| FR-4.2 | The system SHALL support ticket queue retrieval (open/pending tickets assigned to the user) |
| FR-4.3 | The system SHALL generate AI-powered ticket briefs (summary, sentiment, SLA risk)           |
| FR-4.4 | The system SHALL provide ticket readiness scoring with field-level checklist                |
| FR-4.5 | The system SHALL classify cases into categories with confidence scores                      |
| FR-4.6 | The system SHALL surface similar cases with resolution details                              |
| FR-4.7 | The system SHALL aggregate resolution insights from SearchUnify                             |
| FR-4.8 | The system SHALL display ticket event timelines                                             |
| FR-4.9 | The system SHALL provide customer intelligence (org, tier, history)                         |

### FR-5: Response Drafting

| ID     | Requirement                                                                          |
| ------ | ------------------------------------------------------------------------------------ |
| FR-5.1 | The system SHALL provide a rich text editor (TipTap) for response composition        |
| FR-5.2 | The AI SHALL be able to pre-populate the editor with a draft response                |
| FR-5.3 | The editor SHALL support: bold, italic, underline, strikethrough, lists, code blocks |
| FR-5.4 | The system SHALL provide copy-to-clipboard functionality                             |
| FR-5.5 | The system SHALL support posting responses to Zendesk tickets (with HITL approval)   |

### FR-6: HITL Safety

| ID     | Requirement                                                                    |
| ------ | ------------------------------------------------------------------------------ |
| FR-6.1 | The system SHALL classify tool calls by risk level (low, medium, high)         |
| FR-6.2 | In supervised mode, write operations SHALL require explicit agent approval     |
| FR-6.3 | High-risk actions SHALL require a 2-second hold-to-approve interaction         |
| FR-6.4 | Pending approvals SHALL auto-reject after 60 seconds                           |
| FR-6.5 | The system SHALL support toggling between supervised and autonomous modes      |
| FR-6.6 | Rejected actions SHALL not execute, and the AI SHALL acknowledge the rejection |

### FR-7: Log Analysis

| ID     | Requirement                                                       |
| ------ | ----------------------------------------------------------------- |
| FR-7.1 | The system SHALL accept log file uploads via drag-and-drop        |
| FR-7.2 | The system SHALL auto-detect log formats (standard, syslog, JSON) |
| FR-7.3 | The system SHALL provide level-based filtering                    |
| FR-7.4 | The system SHALL support text search across log entries           |
| FR-7.5 | The system SHALL enforce a 10 MB file size limit                  |

### FR-8: Knowledge Capture

| ID     | Requirement                                                                        |
| ------ | ---------------------------------------------------------------------------------- |
| FR-8.1 | The system SHALL generate KB article drafts from resolved cases                    |
| FR-8.2 | Drafts SHALL include: title, problem, root cause, resolution steps, versions, tags |
| FR-8.3 | The system SHALL support article review before publication                         |

---

## 13. Non-Functional Requirements

### NFR-1: Security

| ID      | Requirement                                                         |
| ------- | ------------------------------------------------------------------- |
| NFR-1.1 | No ticket content or PII SHALL be persisted to any storage          |
| NFR-1.2 | All MCP calls SHALL be proxied through server-side route handlers   |
| NFR-1.3 | OAuth tokens SHALL only be stored in encrypted HTTP-only cookies    |
| NFR-1.4 | The application SHALL validate all environment variables at startup |
| NFR-1.5 | The application SHALL run as a non-root user in Docker              |

### NFR-2: Performance

| ID      | Requirement                                                                  |
| ------- | ---------------------------------------------------------------------------- |
| NFR-2.1 | Chat responses SHALL begin streaming within 2 seconds of submission          |
| NFR-2.2 | MCP tool calls SHALL timeout after 30 seconds (configurable)                 |
| NFR-2.3 | LLM requests SHALL timeout after 120 seconds (configurable)                  |
| NFR-2.4 | MCP calls SHALL be rate-limited to 60 RPM per service (configurable)         |
| NFR-2.5 | Ticket brief and resolution insight responses SHALL be cached for 10 minutes |

### NFR-3: Reliability

| ID      | Requirement                                                               |
| ------- | ------------------------------------------------------------------------- |
| NFR-3.1 | The system SHALL degrade gracefully when MCP services are unavailable     |
| NFR-3.2 | The system SHALL display connection status for all external services      |
| NFR-3.3 | The system SHALL provide error boundaries at the page and component level |
| NFR-3.4 | Docker deployments SHALL include health checks                            |

### NFR-4: Usability

| ID      | Requirement                                                            |
| ------- | ---------------------------------------------------------------------- |
| NFR-4.1 | The application SHALL use a dark-only theme optimized for extended use |
| NFR-4.2 | All interactive elements SHALL support keyboard navigation             |
| NFR-4.3 | Panel resize ratios SHALL be preserved within a session                |
| NFR-4.4 | Animations SHALL use Framer Motion for smooth transitions              |

---

## 14. Edge Cases & Error Handling

### 14.1 Authentication Edge Cases

| Scenario                          | Behavior                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| OAuth token expires mid-session   | Session becomes invalid; next API call returns 401; agent is redirected to `/login`                                  |
| Zendesk OAuth is misconfigured    | Login page shows configuration error message with provider status                                                    |
| User denies OAuth permissions     | Redirect back to `/login` with error; agent can retry                                                                |
| Multiple tabs open simultaneously | Each tab shares the same session cookie; actions in one tab don't conflict with another (ephemeral state is per-tab) |

### 14.2 MCP Service Edge Cases

| Scenario                       | Behavior                                                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zendesk MCP server is down     | System enters "degraded" mode; chat informs agent that ticket operations are unavailable; Canvas sections show error states; non-Zendesk features (KB search, log analysis) continue working |
| SearchUnify MCP server is down | Resolution Insights and Similar Cases sections show errors; ticket operations via Zendesk continue working normally                                                                          |
| Both MCP servers are down      | AI assistant operates without tools; can only provide general advice based on conversation context                                                                                           |
| MCP rate limit exceeded        | Requests are queued and retried after token refill; agent may experience slight delays                                                                                                       |
| MCP call times out (>30s)      | Tool result returns an error; AI acknowledges the failure and suggests alternatives (e.g., "I couldn't fetch the ticket. Please try again.")                                                 |
| Invalid ticket ID provided     | Zendesk returns an error; AI informs the agent: "Ticket #99999 was not found."                                                                                                               |

### 14.3 LLM Edge Cases

| Scenario                         | Behavior                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| LLM API key is invalid           | Chat returns an error event; toast notification shown; agent should check configuration                         |
| LLM request times out (>120s)    | Stream emits an error event; agent sees "The AI request timed out. Please try again."                           |
| LLM returns malformed tool call  | Tool bridge handles gracefully; returns error as tool result; AI loop continues                                 |
| Max iterations reached (10)      | Agent loop stops; final thought event emitted; AI's last response is shown even if incomplete                   |
| Context window exceeded          | Older messages are truncated; semantic memory context is preserved; conversation continues with reduced history |
| No LLM provider configured       | Application startup fails with validation error (caught by env.ts)                                              |
| Mid-stream network disconnection | SSE client detects connection loss; streaming indicator stops; agent can retry by sending a new message         |

### 14.4 HITL Edge Cases

| Scenario                                               | Behavior                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Agent doesn't respond to approval in 60s               | Action auto-rejected; AI informed; AI suggests alternative or moves on                                         |
| Agent approves but MCP call fails                      | Error returned; AI sees the failure and can suggest retry or alternative                                       |
| Mode switched from supervised to autonomous mid-stream | Takes effect on the next tool call; currently pending approvals remain pending                                 |
| Multiple pending approvals simultaneously              | Each approval card is rendered independently; agent can approve/reject in any order                            |
| Agent closes browser with pending approvals            | All pending approvals are lost (ephemeral state); the SSE connection closes; server-side agent loop terminates |

### 14.5 UI Edge Cases

| Scenario                                      | Behavior                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Very long ticket subject (500+ chars)         | Text is truncated with ellipsis in UI components                                                     |
| Ticket with no comments                       | Timeline section shows empty state; AI notes "This ticket has no conversation history yet"           |
| Log file exceeds 10 MB                        | Upload rejected with toast notification: "File size exceeds 10 MB limit"                             |
| Log file with unrecognized format             | Falls back to "standard" format parsing; may show garbled entries; agent informed                    |
| Rich text editor content lost on panel resize | Content preserved in Zustand store; editor re-renders with saved content                             |
| Browser refresh                               | All state is lost (ephemeral by design); agent starts fresh; must re-authenticate if session expired |
| Concurrent ticket loads                       | Canvas sections update to show the most recently requested ticket; previous ticket data is replaced  |
| Empty search results from SearchUnify         | Similar Cases and Resolution Insights sections show "No results found" empty state                   |

### 14.6 Network Edge Cases

| Scenario                      | Behavior                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Slow network (high latency)   | SSE streaming compensates — partial results show immediately; skeleton loaders indicate pending data |
| Total network loss            | SSE connection drops; streaming stops; API calls fail with network error; toast notification shown   |
| Network recovery after outage | Agent can retry their last action; new SSE connection established on next chat message               |

---

## 15. Keyboard Shortcuts Reference

| Shortcut        | Action                               |
| --------------- | ------------------------------------ |
| `Cmd/Ctrl + K`  | Open Command Palette (OmniBar)       |
| `Enter`         | Send message (in chat input)         |
| `Shift + Enter` | New line (in chat input)             |
| `Escape`        | Close OmniBar, dismiss Morning Brief |

---

## 16. Glossary

| Term                | Definition                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| **Agent**           | A customer support engineer using the application                                                         |
| **Canvas**          | The right panel of the HUD displaying structured intelligence sections                                    |
| **HUD**             | Heads-Up Display — the main two-panel application interface                                               |
| **HITL**            | Human-in-the-Loop — safety system requiring agent approval for write operations                           |
| **MCP**             | Model Context Protocol — standardized protocol for AI tool integration                                    |
| **OmniBar**         | Command palette for quick action access (Cmd/Ctrl+K)                                                      |
| **RIE**             | Resolution Intelligence Engine — the 6-stage workflow framework                                           |
| **SSE**             | Server-Sent Events — one-way streaming protocol for real-time chat                                        |
| **Semantic Memory** | Session-scoped context manager that remembers ticket, KB articles, and tool history within a conversation |
| **Thought Trace**   | Visible intermediate reasoning steps from the AI (intent analysis, tool discovery, etc.)                  |
| **Canvas Bridge**   | Parser that extracts structured data from AI responses and updates Canvas sections                        |
| **Tool Bridge**     | Layer that routes tool calls to the appropriate MCP service or in-process handler                         |
| **Swarming**        | Collaborative approach where multiple experts join to resolve a complex ticket                            |
| **Triage**          | Process of prioritizing and categorizing incoming tickets                                                 |
| **Morning Brief**   | Start-of-shift overlay showing the agent's ticket queue prioritized for triage                            |
| **Degraded Mode**   | System state when one or more MCP services are unavailable; partial functionality continues               |

---

## 17. Appendix: Slash Commands Reference

All slash commands can be typed directly in the chat input or selected from the OmniBar (`Cmd/Ctrl+K`).

| Command       | Category   | Description                      | Example                            |
| ------------- | ---------- | -------------------------------- | ---------------------------------- |
| `/summarize`  | Actions    | Summarize the current ticket     | `/summarize`                       |
| `/draft`      | Actions    | Draft a customer response        | `/draft`                           |
| `/escalate`   | Actions    | Initiate escalation workflow     | `/escalate`                        |
| `/check-logs` | Actions    | Analyze attached log files       | `/check-logs`                      |
| `/similar`    | Actions    | Find similar resolved cases      | `/similar`                         |
| `/rootcause`  | Actions    | Perform root cause analysis      | `/rootcause`                       |
| `/customer`   | Actions    | Get customer profile and history | `/customer`                        |
| `/search`     | Actions    | Search knowledge base            | `/search connection timeout error` |
| `/readiness`  | Resolution | Check ticket completeness        | `/readiness`                       |
| `/classify`   | Resolution | Classify case type               | `/classify`                        |
| `/swarm`      | Resolution | Find experts for collaboration   | `/swarm`                           |
| `/kb`         | Resolution | Generate KB article draft        | `/kb`                              |
| `/incident`   | Resolution | Detect cross-ticket patterns     | `/incident`                        |

---

## 18. Appendix: Environment Variables

### Required

| Variable                                                                    | Description                                          |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `NEXTAUTH_URL`                                                              | Application base URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET`                                                           | Secret key for encrypting session cookies            |
| `ZENDESK_SUBDOMAIN`                                                         | Your Zendesk instance subdomain                      |
| `ZENDESK_OAUTH_CLIENT_ID`                                                   | OAuth client ID from Zendesk Admin                   |
| `ZENDESK_OAUTH_CLIENT_SECRET`                                               | OAuth client secret from Zendesk Admin               |
| At least one of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` | LLM provider API key                                 |

### Optional

| Variable                 | Default          | Description                       |
| ------------------------ | ---------------- | --------------------------------- |
| `ZENDESK_AUTH_MODE`      | `oauth`          | Auth mode: `oauth` or `api_token` |
| `ZENDESK_EMAIL`          | —                | Required if `api_token` mode      |
| `ZENDESK_API_TOKEN`      | —                | Required if `api_token` mode      |
| `ZENDESK_BASE_URL`       | —                | Override Zendesk base URL         |
| `MCP_ZENDESK_URL`        | —                | Zendesk MCP server URL            |
| `MCP_SEARCHUNIFY_URL`    | —                | SearchUnify MCP server URL        |
| `LLM_DEFAULT_PROVIDER`   | First available  | Default LLM provider              |
| `LLM_DEFAULT_MODEL`      | Provider default | Default model name                |
| `LLM_MAX_ITERATIONS`     | `10`             | Max agent loop iterations         |
| `LLM_REQUEST_TIMEOUT_MS` | `120000`         | LLM request timeout (ms)          |
| `MCP_REQUEST_TIMEOUT_MS` | `30000`          | MCP tool call timeout (ms)        |
| `MCP_RATE_LIMIT_RPM`     | `60`             | Max MCP requests per minute       |
| `SESSION_TTL_MINUTES`    | `480`            | Session duration (8 hours)        |

---

_This document is maintained alongside the codebase. For technical implementation details, refer to the source code and inline comments. For deployment instructions, see the Docker Compose configuration and `.env.example`._
