# Fund Data Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade fund management so returns and risk are derived from a durable transaction ledger and cached NAV data, with safer East Money access.

**Architecture:** Add a shared East Money client, SQLite tables for NAV cache and fund transactions, a pure fund ledger service, controller/routes for transactions and summaries, and a restrained ledger/freshness UI on the existing fund page.

**Tech Stack:** Node.js, Express, sql.js SQLite, node:test, React 18, Vite, ECharts.

---

## File Structure

- Create `server/services/eastmoneyClient.js`: shared throttled East Money HTTP wrapper.
- Create `server/services/fundLedgerService.js`: pure ledger and portfolio calculations.
- Modify `server/services/fundNavService.js`: use the shared client and expose NAV cache-friendly data.
- Modify `server/utils/initDb.js`: create `fund_transactions` and `fund_nav_cache`.
- Modify `server/models/fundModels.js`: CRUD for transactions, NAV cache upsert/read, summary helpers.
- Modify `server/controllers/fundController.js`: add transaction, cache sync, fund summary, and portfolio summary handlers.
- Modify `server/routes/fundRoutes.js`: wire new endpoints before dynamic `/:id` routes where needed.
- Modify `client/src/services/api.js`: add transaction and summary API wrappers.
- Modify `client/src/pages/FundManagement.jsx`: add ledger tab, freshness indicators, and summary metrics while keeping existing layout.
- Create/modify tests under `server/__tests__` and `client/src/pages`.

## Tasks

### Task 1: East Money Client

- [ ] Write `server/__tests__/eastmoneyClient.test.js` covering normalized success metadata and retry/failure metadata with injected fetch/sleep.
- [ ] Run `cd server && npm test -- __tests__/eastmoneyClient.test.js` and confirm it fails because the module does not exist.
- [ ] Create `server/services/eastmoneyClient.js` with `createEastMoneyClient` and default `eastMoneyClient`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Fund Ledger Service

- [ ] Write `server/__tests__/fundLedgerService.test.js` covering buy/sell/fee/dividend/current NAV calculations, missing NAV degraded status, and portfolio summary.
- [ ] Run focused test and confirm it fails because the module does not exist.
- [ ] Create `server/services/fundLedgerService.js` with pure calculation exports.
- [ ] Run focused test and confirm it passes.

### Task 3: Database And Models

- [ ] Write model tests for transaction CRUD and NAV cache upsert/read.
- [ ] Run focused test and confirm it fails because model functions/tables are missing.
- [ ] Update `server/utils/initDb.js` and `server/models/fundModels.js`.
- [ ] Run focused test and confirm it passes.

### Task 4: Fund Controller And Routes

- [ ] Write controller/route-level tests for adding a fund creating an initial buy transaction and for portfolio summary using cached NAV.
- [ ] Run focused test and confirm it fails.
- [ ] Update `server/controllers/fundController.js`, `server/routes/fundRoutes.js`, and `server/services/fundNavService.js`.
- [ ] Run focused test and confirm it passes.

### Task 5: Frontend API And Fund Page

- [ ] Add focused client test coverage for exported tab/ranking helper if practical; otherwise rely on build and manual browser check for page integration.
- [ ] Update `client/src/services/api.js`.
- [ ] Update `client/src/pages/FundManagement.jsx` with ledger tab, transaction modal/table, and summary/freshness display.
- [ ] Run `cd client && npm run build`.

### Task 6: Verification

- [ ] Run `cd server && npm test`.
- [ ] Run `cd client && npm run build`.
- [ ] Start backend and frontend dev servers if needed.
- [ ] Inspect the fund page at desktop and narrow viewport with Playwright/screenshots.
