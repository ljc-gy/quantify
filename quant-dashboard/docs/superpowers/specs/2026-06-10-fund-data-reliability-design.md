# Fund Data Reliability And Ledger Design

## Purpose

This phase upgrades the fund-management area from a current-position screen into a reliable personal fund ledger. The goal is to make fund values, returns, risk metrics, and future research panels traceable to stored transactions and cached NAV history instead of relying on repeated live API calls and mutable summary fields.

The design borrows the most useful idea from `simonlin1212/a-stock-data`: data providers should be wrapped behind explicit, rate-limited clients, especially East Money endpoints. This project will not copy the full skill into the app. Instead, it will adopt the data-source discipline and leave room for later A-share research endpoints.

## Current Context

The app already has:

- A React fund page at `client/src/pages/FundManagement.jsx`.
- Fund APIs in `server/controllers/fundController.js` and `server/routes/fundRoutes.js`.
- Fund persistence in `server/models/fundModels.js` and `server/utils/initDb.js`.
- East Money fund NAV fetching in `server/services/fundNavService.js`.
- Long-term fund scoring through `server/routes/longTerm.js`, `server/services/longTermAnalysisService.js`, and `client/src/pages/fundLongTermView.js`.

The current model stores `funds` as both position master data and latest valuation data. It also stores `fund_nav_snapshots`, but historical NAV data is mostly fetched from East Money on demand. This makes the screen useful, but fragile: repeated refreshes can hit upstream throttling, return calculations depend on current mutable fields, and there is no durable buy/sell/dividend/fee history.

## Scope

Phase 1 includes:

- A shared East Money HTTP client for Node services with throttling, timeout, retry, normalized errors, and response metadata.
- A fund NAV cache table so fund history can be reused across charts, long-term scoring, and portfolio trend.
- A fund transaction ledger for buy, sell, dividend, fee, split, and manual adjustment records.
- Derived fund position metrics computed from transactions and latest cached NAV.
- Fund page UI additions for ledger entry, data freshness, source status, and clearer risk/return metrics.
- Focused backend and frontend tests around the new calculations and data-client behavior.

Phase 1 does not include:

- Full `a-stock-data` endpoint migration.
- Python `mootdx` integration.
- Fund quarterly holding penetration or manager research.
- Automated real brokerage import.
- Multi-user authentication changes.

## Approaches Considered

### Recommended: Ledger First, Data Client First

Build a small, reliable foundation before adding more research feeds. This keeps the work testable and directly improves the fund page. It also reduces East Money pressure by caching NAV history and making repeated chart loads deterministic.

Trade-off: this does not immediately add all A-share research features, but it gives those later features a cleaner service boundary.

### Alternative: Add A-Share Research Endpoints First

Port selected `a-stock-data` endpoints such as sector membership, fund flow, reports, and filings into Node services before changing the fund model.

Trade-off: this would make stock research richer quickly, but fund management would still be built on a weak ledger and repeated external calls.

### Alternative: UI Polish Only

Improve the fund screen with more charts using existing APIs and fields.

Trade-off: fastest visible change, but it would hide the core accounting weakness instead of fixing it.

## Architecture

The first phase adds two backend boundaries:

- `eastmoneyClient`: one shared request layer for East Money endpoints.
- `fundLedgerService`: one calculation layer that turns transactions plus NAV cache into current position, return, and risk data.

`fundNavService` remains responsible for fund-specific East Money parsing, but it should call `eastmoneyClient` instead of raw `fetch`. `fundModels` remains the SQLite access layer and gets new functions for transactions and cached NAV rows. Controllers stay thin: validate request input, call services/models, return normalized responses.

On the frontend, `FundManagement.jsx` should stay the main page for this phase, but ledger entry and dense display blocks should be split into small local components if the implementation touches large sections of the file. The page should show where numbers came from: latest NAV date, cache freshness, failed refresh count, and whether a metric is calculated from ledger data or still fallback data.

## Data Model

Add `fund_transactions`:

- `id`
- `user_id`
- `fund_id`
- `type`: `buy`, `sell`, `dividend`, `fee`, `split`, `adjustment`
- `trade_date`
- `shares`
- `nav`
- `amount`
- `fee`
- `note`
- `created`
- `updated`

Add `fund_nav_cache`:

- `id`
- `fund_code`
- `nav_date`
- `nav`
- `daily_return_pct`
- `source`
- `fetched_at`
- `quality`
- unique key on `fund_code` and `nav_date`

Keep `funds` as the user-visible position master and latest snapshot table for compatibility. After this phase, `shares`, `amount`, `pl`, and `rate` should be treated as derived/cache fields updated from the ledger service rather than as the source of truth.

## Backend API Design

Add transaction APIs:

- `GET /api/fund/:fundId/transactions`
- `POST /api/fund/:fundId/transactions`
- `PUT /api/fund/transactions/:id`
- `DELETE /api/fund/transactions/:id`

Add analysis APIs:

- `GET /api/fund/:fundId/summary`
- `GET /api/fund/portfolio-summary`
- `POST /api/fund/sync-nav-cache`

Existing APIs should keep working:

- `GET /api/fund/list`
- `POST /api/fund/add`
- `POST /api/fund/refresh-nav`
- `GET /api/fund/history/:code`
- `GET /api/fund/portfolio-trend`

For backward compatibility, adding a fund with shares and cost should create an initial `buy` transaction. Existing fund rows with no transactions should be migrated lazily: the first summary request can synthesize an initial buy transaction from `shares` and `cum_nav`, then mark calculations as ledger-backed.

## Calculation Rules

For each fund:

- Net shares = buy shares - sell shares, adjusted by split and adjustment transactions.
- Invested cash = buy amount + fees - sell amount - cash dividends, with manual adjustments included.
- Current value = net shares multiplied by latest cached NAV.
- Profit/loss = current value + realized sell proceeds + dividends - buy amount - fees.
- Return rate = profit/loss divided by invested cash when invested cash is positive.

Portfolio-level metrics:

- Total value, total profit/loss, and weighted return.
- Allocation by fund type and individual fund weight.
- Maximum drawdown from cached portfolio NAV trend.
- Recent return over 1 week, 1 month, 3 months, and 1 year when enough NAV points exist.

When NAV data is missing, the UI should show a degraded status instead of silently showing zeroes.

## Error Handling

`eastmoneyClient` returns structured metadata:

- `ok`
- `status`
- `source`
- `requestedAt`
- `durationMs`
- `attempts`
- `rateLimited`
- `error`

Fund services convert upstream failures into user-safe messages and keep cached data available. If refresh fails but cached NAV exists, the API should return stale data with `fresh: false` and a warning. If both refresh and cache are unavailable, the API should return a clear failure for that fund without blocking other funds.

## Frontend Experience

The fund page should keep its current dashboard feel, but the information hierarchy should shift:

- Top cards: total value, invested cash, total P/L, max drawdown, latest NAV date.
- Tabs: charts, ledger, holdings detail, auto-invest, returns.
- Ledger tab: transaction table plus add/edit modal.
- Detail tab: current positions with data freshness and latest NAV source.
- Returns tab: cumulative return, realized/unrealized P/L, recent return windows, drawdown.

The add-fund flow should still feel simple. When a user enters a fund code, shares, and cost, the app creates the fund and an initial buy transaction in one action.

## Testing Strategy

Backend tests:

- East Money client throttles sequential calls and normalizes timeout/failure metadata.
- Fund ledger calculations cover buys, sells, fees, dividends, and missing NAV.
- Adding a fund creates an initial transaction.
- NAV cache upserts by fund code and date without duplicating rows.
- Portfolio summary ignores one failed fund refresh while returning the rest.

Frontend tests:

- Fund long-term ranking keeps working with cached NAV metadata.
- Ledger tab renders transactions and handles empty state.
- Add-fund modal posts data that creates an initial buy transaction.

Manual verification:

- Run server tests.
- Run client tests.
- Start the local app and inspect the fund page at desktop and narrow widths.
- Refresh NAV twice and confirm the second load uses cache unless a sync is requested.

## Rollout Plan

Implementation should be incremental:

1. Add the shared East Money client and tests.
2. Add database tables and model functions.
3. Add ledger calculation service and tests.
4. Wire fund controller/routes while preserving old endpoints.
5. Update the fund page with ledger and freshness UI.
6. Run full verification and capture screenshots.

This keeps each change reversible and avoids a large rewrite of the existing fund page.

## Future Phases

After Phase 1, the next useful phases are:

- Phase 2: selected `a-stock-data` stock research endpoints for sector membership, fund flow, filings, reports, and valuation.
- Phase 3: fund holding penetration, mapping fund positions to industries and concepts.
- Phase 4: decision assistant for add/hold/reduce/watch using ledger, risk, benchmark, and market context.
