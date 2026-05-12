# StratEx Yield Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local StratEx branded DeFi yield simulator dashboard.

**Architecture:** A React/Vite dashboard consumes an Express API. Shared TypeScript core modules filter live DeFiLlama pools, select conservative multi-position strategies, estimate operational friction, normalize token units to USD, and render simulator-only strategy manifests.

**Tech Stack:** React, TypeScript, Vite, Express, Vitest, Recharts, Framer Motion, lucide-react, viem, HyperFrames HTML/GSAP source.

---

### Task 1: Core Strategy Engine

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/config.ts`
- Create: `src/core/strategy.ts`
- Create: `src/core/strategy.test.ts`

- [x] Write failing tests for allowed assets, chains, platforms, target bands, and allocation math.
- [x] Implement filtering, scoring, APY targeting, cost estimates, USD normalization, and simulator manifests.
- [x] Run `npm test`.

### Task 2: Server API

**Files:**
- Create: `src/server/index.ts`
- Create: `src/server/defillama.ts`
- Create: `src/server/gas.ts`
- Create: `src/server/prices.ts`

- [x] Expose `/api/markets`, `/api/rates`, `/api/gas`, `/api/prices`, `/api/risks`, and `/api/simulate`.
- [x] Fetch DeFiLlama pools with deterministic fallback data.
- [x] Gate simulation when DeFiLlama data is fallback or stale.

### Task 3: Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css`
- Create: `src/components/*`

- [x] Build left notifications, central allocation panel, right risk panel, simulator environment indicator, APY breakdowns, adapter assumptions, and source dropdowns.
- [x] Use project-local ImageGen and supplied StratEx reference imagery.
- [x] Fire visible agent animation on simulation actions.

### Task 4: HyperFrames Motion Source

**Files:**
- Create: `hyperframes/agent-motion/DESIGN.md`
- Create: `hyperframes/agent-motion/index.html`

- [x] Build a deterministic GSAP/HyperFrames “agents working” source composition matching the StratEx palette.

### Task 5: Verification

**Files:**
- Modify as required by verification failures.

- [x] Run tests.
- [x] Run lint.
- [x] Run production build.
- [x] Start localhost and inspect the dashboard in browser.
