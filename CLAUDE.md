# CLAUDE.md - Project Nexus Verification Guidelines

## Quick Verification (run after every change)

```bash
npm run typecheck        # TypeScript strict mode check
npm run lint             # ESLint + Prettier
npm run test:unit        # Vitest unit tests
npm run build            # Next.js production build
```

## Full Verification (run before commits)

```bash
npm run verify           # Runs all: typecheck + lint + test:unit + build
npm run test:e2e         # Playwright E2E (requires running server)
```

## Docker Verification

```bash
docker compose build     # Build image
docker compose up -d     # Start all services (nexus + MCP servers)
curl http://localhost:3000/api/health  # Health check
docker compose down
```

## Architecture Constraints

- NO persistent storage of ticket content or PII
- All state is ephemeral (Zustand stores without persist middleware)
- MCP calls go through server-side route handlers only (never from client)
- Client components must have 'use client' directive
- All environment variables validated at startup via src/lib/env.ts
- OAuth tokens stored in encrypted HTTP-only cookies only (no DB)

## MCP Servers (Real, Not Mocks)

- Zendesk: `reminia/zendesk-mcp-server` (Python, stdio transport)
- SearchUnify: `searchunify/su-mcp` (Docker, HTTP transport)
- LogParser: Custom in-process (src/lib/log-parser/)
- Mock servers exist ONLY in tests/mocks/ for testing

## File Conventions

- Components: PascalCase (e.g., ChatPanel.tsx)
- Hooks: camelCase with 'use' prefix (e.g., useSSE.ts)
- Stores: kebab-case with '-store' suffix (e.g., chat-store.ts)
- Tests: colocated in tests/ directory, mirroring src/ structure
- Types: separate files in src/types/, imported explicitly

## Tech Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4 (dark-only theme)
- Zustand (ephemeral state)
- NextAuth.js v5 (Zendesk OAuth2)
- MCP SDK (@modelcontextprotocol/sdk)
- cmdk (command palette), TipTap (rich text), Framer Motion (animations)
- sonner (toasts), nuqs (URL state)
- Vitest + Playwright (testing)
- Docker multi-stage (production)
