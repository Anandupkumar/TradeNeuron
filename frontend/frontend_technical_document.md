# TradeNeuron -- Frontend Technical Document

## Table of Contents

1. [Project Overview and Design Philosophy](#1-project-overview-and-design-philosophy)
2. [Tech Stack and Dependencies](#2-tech-stack-and-dependencies)
3. [Project Structure](#3-project-structure)
4. [Environment Configuration](#4-environment-configuration)
5. [Type System and Contract Strategy](#5-type-system-and-contract-strategy)
6. [Authentication, Identity, and Onboarding Flow](#6-authentication-identity-and-onboarding-flow)
7. [API Client Layer](#7-api-client-layer)
8. [State Management](#8-state-management)
9. [Routing and Navigation](#9-routing-and-navigation)
10. [Pages and Screens](#10-pages-and-screens)
11. [Component Library](#11-component-library)
12. [Charting and Data Visualisation](#12-charting-and-data-visualisation)
13. [Real-Time Pipeline Status](#13-real-time-pipeline-status)
14. [Formatting and Display Rules](#14-formatting-and-display-rules)
15. [Error Boundaries and Error Handling](#15-error-boundaries-and-error-handling)
16. [Loading State Standards](#16-loading-state-standards)
17. [Filter Debouncing and URL State](#17-filter-debouncing-and-url-state)
18. [Feature Flag System](#18-feature-flag-system)
19. [Logging and Debug Strategy](#19-logging-and-debug-strategy)
20. [Keyboard Shortcuts](#20-keyboard-shortcuts)
21. [Optimistic UI for Mutations](#21-optimistic-ui-for-mutations)
22. [Responsive and Mobile Considerations](#22-responsive-and-mobile-considerations)
23. [Environment-Specific Behaviour](#23-environment-specific-behaviour)
24. [Testing Strategy](#24-testing-strategy)
25. [Build and Deployment](#25-build-and-deployment)

---

## 1. Project Overview and Design Philosophy

TradeNeuron's frontend is a **data-dense, single-page trading dashboard** for a single user or a small team. It is not a public product — it is an internal analytical tool. The design must therefore prioritise information density, speed, and clarity over marketing aesthetics.

### Core principles

**Data first.** Every screen should answer a specific question ("what should I do today?", "how is the system performing?", "what happened to this stock?"). UI chrome exists to serve data, not decorate it.

**Dark mode by default.** Financial dashboards are used for extended periods, often in low-light environments. The default theme is dark. Light mode is available as a user toggle.

**No unnecessary loading.** Data that changes daily (signals, candles, fundamentals) should be cached client-side after the first load. Avoid re-fetching on every navigation.

**Numbers are sacred.** Price, PnL, and percentage figures must always be formatted consistently. Green for positive, red for negative. Never show unrounded prices or ambiguous percentage signs. See Section 14 for exact formatting rules.

**The pipeline runs at 4:30 PM IST on weekdays.** The frontend must make it obvious whether today's data has been updated or not. A stale data indicator is not optional.

**Type contracts are immutable boundaries.** Every backend response shape is codified in TypeScript. No `any`. No implicit assumptions. When the backend changes, the TypeScript compiler reports it — never a runtime crash.

**Crashes are isolated, never app-wide.** Every page and major UI section is wrapped in an Error Boundary. One broken chart never blanks the whole dashboard.

---

## 2. Tech Stack and Dependencies

### Core

| Package | Version | Purpose |
|---------|---------|---------|
| React | ^18.x | UI framework |
| TypeScript | ^5.x | Type safety throughout |
| Vite | ^5.x | Build tool and dev server |
| React Router DOM | ^6.x | Client-side routing |
| TanStack Query (React Query) | ^5.x | Server state, caching, background refetch |
| Zustand | ^4.x | Client-side global state (user identity, theme) |
| Axios | ^1.x | HTTP client (wraps fetch with interceptors) |

### UI and Styling

| Package | Version | Purpose |
|---------|---------|---------|
| Tailwind CSS | ^3.x | Utility-first styling |
| shadcn/ui | latest | Component primitives (Dialog, Dropdown, Sheet, etc.) |
| Lucide React | ^0.4xx | Icon set |
| clsx | ^2.x | Conditional class merging |

### Charting

| Package | Version | Purpose |
|---------|---------|---------|
| Lightweight Charts (TradingView) | ^4.x | Candlestick / OHLCV charts |
| Recharts | ^2.x | Area charts, bar charts, metric trend lines |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | ^3.x | Date formatting, IST helpers |
| date-fns-tz | ^2.x | Timezone-aware formatting |
| react-hot-toast | ^2.x | Toast notifications |
| use-debounce | ^10.x | Debounce hook for filters and search |
| uuid | ^9.x | UUID generation for user identity |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Vitest | ^1.x | Unit test runner |
| Testing Library / React | ^14.x | Component testing |
| MSW | ^2.x | API mock service worker for tests |
| ESLint | ^8.x | Linting |
| Prettier | ^3.x | Formatting |

---

## 3. Project Structure

```
frontend/
  src/
    api/
      client.ts              # Axios instance with interceptors
      signals.api.ts         # Includes rejected() method
      stocks.api.ts
      favorites.api.ts
      paperTrading.api.ts
      backtest.api.ts
      health.api.ts
      tradeDecision.api.ts   # get, upsert, history for manual trade decisions
    components/
      layout/
        AppShell.tsx          # Sidebar + topbar + error boundary wrapper
        Sidebar.tsx
        Topbar.tsx
        PipelineStatusBar.tsx
      errors/
        RootErrorBoundary.tsx  # Catches crashes at app level
        PageErrorBoundary.tsx  # Catches crashes at page level
        ChartErrorBoundary.tsx # Catches crashes in chart components only
      auth/
        ApiKeySetupScreen.tsx  # Full-screen first-time onboarding
        ApiKeyModal.tsx        # Re-entry modal on 401
      signals/
        SignalCard.tsx
        SignalTable.tsx
        SignalBadge.tsx
        SignalFilters.tsx
        SignalDetailDrawer.tsx
        ConfidenceBreakdownBar.tsx
        ExplainabilityPanel.tsx
        TradeChecklist.tsx
        DecisionOverridePanel.tsx
      charts/
        CandlestickChart.tsx
        EquityCurveChart.tsx
        DrawdownChart.tsx
        VolumeChart.tsx
        IndicatorOverlay.tsx
      stocks/
        StockHeader.tsx
        IndicatorGrid.tsx
        FeatureGrid.tsx
        SectorBadge.tsx
      paper_trading/
        PaperSummaryCards.tsx
        PaperTradeTable.tsx
        PnLCurveChart.tsx
      backtest/
        BacktestResultCard.tsx
        MetricsComparisonTable.tsx
        WalkForwardChart.tsx
      favorites/
        FavoritesList.tsx
        FavoriteCard.tsx
        AddFavoriteDialog.tsx
      common/
        DataTable.tsx
        StatCard.tsx
        EmptyState.tsx
        ErrorState.tsx
        LoadingSkeleton.tsx
        ConfidenceBar.tsx
        RiskRewardBadge.tsx
        MarketRegimeBadge.tsx
        PriceChange.tsx
        Pagination.tsx
    hooks/
      useSignals.ts
      useActiveSignals.ts
      useStockDetail.ts
      useHistory.ts
      useFavorites.ts
      usePaperTrading.ts
      useBacktest.ts
      useHealth.ts
      useMarketStatus.ts
      useDebounce.ts         # Re-export from use-debounce for uniformity
      useKeyboardShortcuts.ts
      useFilterUrlSync.ts    # Syncs filter state to/from URL query params
      useTradeDecisions.ts   # Query + mutation hooks for trade decisions
    pages/
      Dashboard.tsx
      Signals.tsx
      StockDetail.tsx
      PaperTrading.tsx
      Backtest.tsx
      Watchlist.tsx
      Settings.tsx
    store/
      identity.store.ts      # userId (UUID) + apiKey, persisted to localStorage
      theme.store.ts         # dark/light mode
      ui.store.ts            # transient UI state (open drawers, active shortcuts)
    utils/
      format.ts              # All number, price, date formatting
      symbols.ts             # NIFTY 50 symbol list + sector mapping
      constants.ts           # App-wide constants
      logger.ts              # Dev logger (no-ops in production)
      featureFlags.ts        # Feature flag resolution
    types/
      api.types.ts           # Generic API envelope + pagination
      signal.types.ts        # Includes ConfidenceBreakdown interface
      stock.types.ts
      paperTrade.types.ts
      backtest.types.ts
      health.types.ts
      favorite.types.ts
      rejectedSignal.types.ts  # RejectStage, RejectedSignal, RejectedSignalsResponse
      tradeDecision.types.ts   # DecisionType, TradeDecision, DecisionHistoryItem
    mocks/
      handlers.ts            # MSW request handlers
      fixtures/              # Static mock data for tests
        signals.ts
        stocks.ts
        health.ts
    styles/
      globals.css
    App.tsx
    main.tsx
  public/
  index.html
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  .env.example
```

---

## 4. Environment Configuration

File: `.env.example`

```env
# Backend API base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1

# API key — same value as API_KEY in backend .env
# WARNING: stored in localStorage in production.
# Do not use a high-privilege key in shared environments.
VITE_API_KEY=your_api_key_here

# App metadata
VITE_APP_NAME=TradeNeuron
VITE_APP_VERSION=1.0.0

# Feature flags
VITE_ENABLE_SHORT_SIGNALS=true
VITE_ENABLE_PAPER_TRADING=true
VITE_ENABLE_BACKTEST=true

# Debug
VITE_DEBUG_MODE=false
```

All env vars are accessed via `import.meta.env.VITE_*`. Never access them directly outside `src/utils/constants.ts`.

```typescript
// src/utils/constants.ts
export const API_BASE_URL   = import.meta.env.VITE_API_BASE_URL;
export const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY ?? '';
export const APP_NAME       = import.meta.env.VITE_APP_NAME ?? 'TradeNeuron';
export const APP_VERSION    = import.meta.env.VITE_APP_VERSION ?? '1.0.0';
export const DEBUG_MODE     = import.meta.env.VITE_DEBUG_MODE === 'true';

export const FEATURES = {
  shortSignals: import.meta.env.VITE_ENABLE_SHORT_SIGNALS === 'true',
  paperTrading: import.meta.env.VITE_ENABLE_PAPER_TRADING === 'true',
  backtest:     import.meta.env.VITE_ENABLE_BACKTEST === 'true',
};

export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
};
```

---

## 5. Type System and Contract Strategy

This is a critical section. The backend is the source of truth for all data shapes. The frontend must never use `any`, never guess field names, and never assume a field is present unless it is explicitly typed as non-optional.

### Strategy: Manually maintained strict contracts

The backend does not ship an OpenAPI spec, so types are maintained manually in `src/types/`. This means every backend API change must be reflected here immediately. The compiler will then catch everywhere in the UI that consumes that type — this is the point.

**Rules enforced by `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

These four settings together make it impossible for an unchecked field access to reach production silently.

### Generic API envelope

Every backend response is wrapped in this shape. All API modules return the unwrapped `data` (the interceptor strips the envelope). But the envelope type is still defined so the interceptor itself is typesafe.

```typescript
// src/types/api.types.ts

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
```

### Signal type

```typescript
// src/types/signal.types.ts

export type SignalType      = 'BUY' | 'SELL';
export type SignalDirection = 'LONG' | 'SHORT';
export type ExecutionType   = 'EQUITY' | 'FUTURES' | 'OPTIONS' | 'NONE';
export type SignalStatus    = 'ACTIVE' | 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED';
export type ConfidenceTier  = 'HIGH' | 'NORMAL' | 'LOW';
export type StrategySource  =
  | 'TREND_PULLBACK'
  | 'BREAKOUT'
  | 'RANGE'
  | 'MEAN_REVERSION'
  | 'TREND_PULLBACK_SHORT'
  | 'BREAKDOWN'
  | string;   // combined: "TREND_PULLBACK+BREAKOUT"

export interface ConfidenceBreakdown {
  technical: number;
  momentum: number;
  volume: number;
  quality: number;
}

export interface Signal {
  id: number;
  symbol: string;
  date: string;                    // YYYY-MM-DD
  signal_type: SignalType;
  direction: SignalDirection;
  execution_type: ExecutionType;   // EQUITY for longs, FUTURES for shorts in FNO, NONE for non-executable
  is_executable: boolean;          // false for SHORT signals in equity-only accounts
  confidence: number;              // 0–100
  confidence_tier: ConfidenceTier | null;  // HIGH (85+), NORMAL (75-84), LOW (70-74)
  entry_price: number;
  stop_loss: number;
  target_price: number;
  risk_reward: number;
  shares_to_buy: number;
  position_value: number;
  capital_risk_inr: number;
  reasons: string[];
  status: SignalStatus;
  strategy_source: StrategySource;
  is_favorite: boolean;
  created_at: string;              // ISO timestamp
  explanation: string[] | null;
  confidence_breakdown: ConfidenceBreakdown | null;
}

export interface SignalFilters {
  status?: SignalStatus | 'all';
  direction?: SignalDirection | 'all';
  confidence_tier?: ConfidenceTier | 'all';
  symbol?: string;
  from_date?: string;
  to_date?: string;
  min_confidence?: number;
  favorites_only?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'date' | 'confidence' | 'symbol';
  sort_order?: 'asc' | 'desc';
}

export interface ActiveSignalsResponse {
  signals: Signal[];
}

export interface SignalListResponse {
  signals: Signal[];
  pagination: PaginationMeta;
}
```

> **Backend contract notes:**
> - `direction`, `shares_to_buy`, `position_value`, and `capital_risk_inr` are populated by the backend position-sizing and SELL-signal upgrades. The backend stores these on the `signals` table and returns them in all signal endpoints.
> - The `direction` filter in `SignalFilters` is sent as a query parameter to `GET /api/v1/signals`. The backend must support `?direction=LONG|SHORT` as a filter. Ensure the backend API contract includes this parameter.

### Stock type

```typescript
// src/types/stock.types.ts

export type RsiZone = 'OVERSOLD' | 'PULLBACK' | 'NEUTRAL' | 'OVERBOUGHT';
export type MarketRegime = 'BULLISH' | 'SIDEWAYS' | 'BEARISH' | 'HIGH_VOLATILITY';

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  delivery_pct: number | null;     // NSE delivery percentage (0–100)
}

export interface CandleWithIndicators extends Candle {
  indicators?: {
    ema_20?: number | null;
    ema_50?: number | null;
    ema_200?: number | null;
    rsi?: number | null;
  };
}

export interface StockIndicators {
  ema_20: number | null;
  ema_50: number | null;
  ema_200: number | null;
  rsi: number | null;
  macd_line: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  atr: number | null;
  volume_change: number | null;
}

export type VolumeTier = 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

export interface StockFeatures {
  is_uptrend: boolean;
  rsi_zone: RsiZone;
  is_volume_spike: boolean;
  is_breakout: boolean;
  close_position: number | null;  // (close - low) / (high - low) — breakout strength
  ema50_slope: number | null;     // ema50_today - ema50_5d_ago — trend direction
  near_support: boolean;
  is_liquid: boolean;
  is_ranging: boolean;
  z_score_20d: number | null;
  distance_from_52w_high_pct: number | null;
  relative_strength_vs_nifty: number | null;

  // --- Fields added by backend improvements ---
  rvol: number | null;              // Relative Volume (today vol / 20-day avg vol)
  volume_tier: VolumeTier | null;   // Tiered classification based on RVOL
  vwap: number | null;              // Rolling Volume-Weighted Average Price
  vwap_distance_pct: number | null; // Distance of close from VWAP (%)
  is_near_vwap: boolean;            // |vwap_distance_pct| <= 1.5%
  is_high_delivery: boolean;        // Delivery % above 20-day median
  delivery_pct: number | null;      // NSE delivery percentage (0–100)
}

export interface StockDetail {
  symbol: string;
  sector: string;
  is_favorite: boolean;
  latest_candle: Candle;
  indicators: StockIndicators;
  features: StockFeatures;
  active_signal: Signal | null;
}

export interface HistoryResponse {
  symbol: string;
  candles: CandleWithIndicators[];
  total: number;
}
```

> **Backend contract notes:**
> - `is_ranging` and `z_score_20d` are computed by the backend's adaptive-threshold and range-strategy upgrades. The backend stores these in the `features` table and returns them in the `GET /api/v1/stock/:symbol` features object.
> - `rvol` (Relative Volume) is computed as `current_volume / avg_volume_20d`. `volume_tier` is derived from RVOL: LOW (<0.5), NORMAL (0.5–1.5), HIGH (1.5–2.5), VERY_HIGH (2.5–4.0), EXTREME (>4.0). These replace the simple `is_volume_spike` boolean for scoring purposes (though `is_volume_spike` is retained for backward compatibility).
> - `vwap` is a rolling VWAP computed from intraday-equivalent data. `vwap_distance_pct` = `(close - vwap) / vwap * 100`. `is_near_vwap` flags when `|vwap_distance_pct| <= 1.5%`, used as a signal generation filter.
> - `delivery_pct` comes from NSE Bhavcopy. `is_high_delivery` = true when today's delivery % exceeds the 20-day rolling median. High delivery adds a +10 confidence bonus: on breakout signals (LONG) it confirms institutional buying, and on breakdown candles (SHORT) it confirms institutional selling pressure.
> - All new feature fields (`rvol`, `volume_tier`, `vwap`, `vwap_distance_pct`, `is_near_vwap`, `is_high_delivery`, `delivery_pct`) are stored in the `features` table and returned by the backend in the `GET /api/v1/stock/:symbol` response under the `features` object.

### Paper trade type

```typescript
// src/types/paperTrade.types.ts

export type ExitReason = 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED' | 'MANUAL';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface PaperTrade {
  id: number;
  signal_id: number;
  symbol: string;
  direction: SignalDirection;
  execution_type: ExecutionType;   // matches the signal's execution type
  entry_date: string;
  entry_price: number;
  actual_entry_price: number | null;
  stop_loss: number;
  target_price: number;
  shares_to_buy: number;
  exit_date: string | null;
  exit_price: number | null;
  exit_reason: ExitReason | null;
  pnl_pct: number | null;
  gross_pnl_inr: number | null;
  status: TradeStatus;
}

export interface PaperTradingSummary {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_rate_pct: number;
  avg_pnl_pct: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;
}
```

> **Backend contract notes:**
> - `direction` and `shares_to_buy` live on the `signals` table, not on `paper_trades`. The backend `GET /api/v1/paper-trading/trades` endpoint must JOIN `paper_trades` with `signals` to include these fields in the response. Verify the backend query includes this join.
> - `gross_pnl_inr` is computed as `pnl_pct / 100 × entry_price × shares_to_buy`. The backend should compute and return this field, or the frontend can derive it from available data if the backend omits it.
> - `max_drawdown_pct` in `PaperTradingSummary` requires the backend to compute a running cumulative drawdown over closed trades. If the backend's `getSummary()` does not compute this, it should be added. As a fallback, the frontend can compute it client-side from the trades list by tracking peak cumulative PnL and the maximum drop from that peak.

### Health type

```typescript
// src/types/health.types.ts

export interface HealthData {
  status: 'ok' | 'degraded';
  db: 'connected' | 'disconnected';
  last_pipeline_run: string | null;   // ISO timestamp, null if never run
  active_signals_count: number;
}
```

### Backtest type

```typescript
// src/types/backtest.types.ts

export interface BacktestResult {
  strategy_name: string;
  run_date: string;
  test_period: string;
  total_signals: number;
  wins: number;
  losses: number;
  neutral: number;
  win_rate_pct: number;
  avg_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number | null;
  profit_factor: number | null;
  avg_holding_days: number | null;
}
```

### Favorite types

```typescript
// src/types/favorite.types.ts

export interface FavoriteRecord {
  id: number;
  user_id: string;
  symbol: string;
  notes: string | null;
  created_at: string;              // ISO timestamp
}

export interface FavoritesResponse {
  favorites: FavoriteRecord[];
}
```

### Rejected signal type

```typescript
// src/types/rejectedSignal.types.ts

export type RejectStage =
  | 'FUNDAMENTAL_FILTER' | 'SENTIMENT_FILTER'
  | 'VWAP_FILTER' | 'PCR_FILTER' | 'SECTOR_GATE'
  | 'CONFIDENCE_GATE' | 'RR_GATE'
  | 'MERGED_RISK_ZERO' | 'ACTIVE_CAP' | 'POSITION_SIZING';

export interface RejectedSignal {
  id: number;
  symbol: string;
  date: string;
  strategy_source: string;
  reject_stage: RejectStage;
  reject_reason: string;
  raw_confidence: number | null;
  raw_rr: number | null;
  created_at: string;
}

export interface RejectedSignalsResponse {
  rejected: RejectedSignal[];
}
```

### Trade decision type

```typescript
// src/types/tradeDecision.types.ts

export type DecisionType = 'TAKEN' | 'SKIPPED' | 'MODIFIED';

export interface TradeDecision {
  signal_id: number;
  user_identifier: string;
  decision: DecisionType;
  notes: string | null;
  actual_entry: number | null;
  actual_qty: number | null;
  decided_at: string;
  updated_at: string;
}

export interface DecisionHistoryItem extends TradeDecision {
  symbol: string;
  signal_type: SignalType;
  confidence: number;
  status: SignalStatus;
}

export interface DecisionHistoryResponse {
  decisions: DecisionHistoryItem[];
}
```

> **Backend contract notes:**
> - `explanation` is a JSON array of human-readable sentences. The backend sets it to NULL for signals generated before migration 023.
> - `confidence_breakdown` decomposes the overall confidence score into technical, momentum, volume, and quality buckets. NULL for pre-migration signals.
> - `rejected_signals` provides full pipeline transparency — every rejected candidate is logged with its `reject_stage` and `reject_reason`.
> - `trade_decisions` supports one decision per signal per user. The backend upserts using `INSERT ON DUPLICATE KEY UPDATE`.

### Type discipline rules

These rules are absolute. No exceptions.

1. **No `any`.** If you don't know the type, use `unknown` and narrow it explicitly.
2. **Nullable fields must be `T | null`, never `T | undefined`.** The backend uses `null` for missing optional values. Match it exactly.
3. **Never assume array elements are present** without checking. `noUncheckedIndexedAccess` enforces this at compile time.
4. **When the backend adds a field**, add it to the type first, then consume it in the component. Never the other way around.
5. **When the backend removes a field**, the compiler will list every component that consumed it. Fix them all before shipping.

---

## 6. Authentication, Identity, and Onboarding Flow

The backend requires two headers on every request. The frontend manages both via a Zustand store persisted to `localStorage`.

### First-time user flow

On first load, the app checks whether an API key is stored. If not, it renders a full-screen `ApiKeySetupScreen` before allowing any navigation. This screen is not a modal — it is the entire page content. The main app layout is not rendered at all until the key is validated.

```
First visit
    ↓
App boots → reads localStorage
    ↓
apiKey === ''?
    YES → render ApiKeySetupScreen (full screen, no sidebar/topbar)
    NO  → render AppShell → Dashboard
```

**`ApiKeySetupScreen` (`src/components/auth/ApiKeySetupScreen.tsx`):**

The screen contains:
- App logo and name
- Brief description ("Enter your TradeNeuron API key to access the dashboard")
- API key input (type="password", toggleable to text)
- "Connect" button — calls `GET /api/v1/health` with the entered key
  - On success (200): saves key to store, proceeds to app
  - On 401: shows inline error "Invalid key — please check your .env"
  - On network error: shows "Could not reach the server at {API_BASE_URL}"
- The user's UUID is auto-generated silently on this screen — they never see or interact with it

This screen must look polished. It is the first thing a new user sees.

### 401 re-entry flow (session invalidated)

If the backend returns `401` during normal use (e.g., the key was rotated in the backend `.env`), the Axios response interceptor dispatches `tn:auth-failure`. The `AppShell` listens for this event and opens the `ApiKeyModal` — a full-screen, non-dismissible modal — prompting re-entry of the key. The user cannot click away from it.

```typescript
// src/components/auth/ApiKeyModal.tsx
// This modal has no close button and no backdrop click dismiss.
// The only way to proceed is to successfully validate a key.
```

### Identity store

```typescript
// src/store/identity.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface IdentityState {
  userId: string;          // UUID, auto-generated on first visit
  apiKey: string;          // Set after successful validation
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const useIdentityStore = create<IdentityState>()(
  persist(
    (set) => ({
      userId:   uuidv4(),
      apiKey:   '',
      setApiKey:   (key)  => set({ apiKey: key }),
      clearApiKey: ()     => set({ apiKey: '' }),
    }),
    { name: 'tn_identity' }
  )
);
```

The `X-User-Id` header is sent with every request, including those that don't need it. The backend ignores it on non-favorites endpoints.

### Guard component

All routes except the setup screen are wrapped in an `AuthGuard` component that redirects to the setup screen if `apiKey` is empty:

```typescript
// src/components/auth/AuthGuard.tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const apiKey = useIdentityStore((s) => s.apiKey);
  if (!apiKey) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}
```

---

## 7. API Client Layer

### Axios instance

**File:** `src/api/client.ts`

```typescript
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { useIdentityStore } from '../store/identity.store';
import { logger } from '../utils/logger';
import type { ApiEnvelope } from '../types/api.types';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Request interceptor — inject auth headers on every request
apiClient.interceptors.request.use((config) => {
  const { apiKey, userId } = useIdentityStore.getState();
  config.headers['X-API-Key'] = apiKey;
  config.headers['X-User-Id'] = userId;
  logger.debug('[API] -->', config.method?.toUpperCase(), config.url);
  return config;
});

// Response interceptor — unwrap envelope, handle global errors
apiClient.interceptors.response.use(
  (response) => {
    const envelope = response.data as ApiEnvelope<unknown>;
    if (envelope.success === false) {
      return Promise.reject(new Error(envelope.error ?? 'Unknown error'));
    }
    logger.debug('[API] <--', response.status, response.config.url);
    return envelope.data;  // unwrap — downstream sees only the data
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('tn:auth-failure'));
    }
    const message =
      (error.response?.data as ApiEnvelope<never>)?.error
      ?? error.message
      ?? 'Unknown error';
    logger.error('[API] ERROR', error.response?.status, message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
```

### API modules

Each module wraps one resource. They are called only from React Query hooks — never from components directly.

**`src/api/signals.api.ts`**

```typescript
import apiClient from './client';
import type {
  SignalListResponse, ActiveSignalsResponse, SignalFilters,
  RejectedSignalsResponse,
} from '../types';

export const signalsApi = {
  list:     (filters: SignalFilters): Promise<SignalListResponse> =>
    apiClient.get('/signals', { params: filters }),
  active:   (): Promise<ActiveSignalsResponse> =>
    apiClient.get('/signals/active'),
  rejected: (date?: string): Promise<RejectedSignalsResponse> =>
    apiClient.get('/signals/rejected', { params: date ? { date } : {} }),
};
```

**`src/api/tradeDecision.api.ts`**

```typescript
import apiClient from './client';
import type { TradeDecision, DecisionHistoryResponse } from '../types';

export const tradeDecisionApi = {
  get:     (signalId: number): Promise<TradeDecision | null> =>
    apiClient.get(`/signals/${signalId}/decision`),
  upsert:  (signalId: number, body: {
    decision: 'TAKEN' | 'SKIPPED' | 'MODIFIED';
    notes?: string;
    actual_entry?: number;
    actual_qty?: number;
  }): Promise<TradeDecision> =>
    apiClient.post(`/signals/${signalId}/decision`, body),
  history: (limit?: number): Promise<DecisionHistoryResponse> =>
    apiClient.get('/decisions', { params: limit ? { limit } : {} }),
};
```

**`src/api/stocks.api.ts`**

```typescript
import apiClient from './client';
import type { StockDetail, HistoryResponse } from '../types';

export const stocksApi = {
  detail: (symbol: string): Promise<StockDetail> =>
    apiClient.get(`/stock/${encodeURIComponent(symbol)}`),
  history: (symbol: string, params: { from_date?: string; to_date?: string; include_indicators?: boolean }): Promise<HistoryResponse> =>
    apiClient.get(`/history/${encodeURIComponent(symbol)}`, { params }),
};
```

`M&M.NS` must always pass through `encodeURIComponent()` before use in any URL segment. This produces `M%26M.NS`. Express on the backend decodes it automatically.

**`src/api/favorites.api.ts`**

```typescript
import apiClient from './client';
import type { FavoritesResponse, FavoriteRecord } from '../types/favorite.types';

export const favoritesApi = {
  list:   (): Promise<FavoritesResponse> => apiClient.get('/favorites'),
  add:    (symbol: string, notes?: string): Promise<FavoriteRecord> =>
    apiClient.post('/favorites', { symbol, notes }),
  remove: (symbol: string): Promise<{ removed: boolean; symbol: string }> =>
    apiClient.delete(`/favorites/${encodeURIComponent(symbol)}`),
};
```

**`src/api/paperTrading.api.ts`**

```typescript
import apiClient from './client';
import type { PaperTradingSummary, PaperTrade } from '../types/paperTrade.types';
import type { PaginatedResponse } from '../types/api.types';

export const paperTradingApi = {
  summary: (): Promise<PaperTradingSummary> =>
    apiClient.get('/paper-trading/summary'),
  trades:  (params: { status?: string; symbol?: string; page?: number; limit?: number }): Promise<PaginatedResponse<PaperTrade>> =>
    apiClient.get('/paper-trading/trades', { params }),
};
```

**`src/api/backtest.api.ts`**

```typescript
import apiClient from './client';
import type { BacktestResult } from '../types/backtest.types';

export const backtestApi = {
  results: (params: { strategy?: string; latest?: boolean }): Promise<{ results: BacktestResult[] }> =>
    apiClient.get('/backtest/results', { params }),
};
```

**`src/api/health.api.ts`**

```typescript
import apiClient from './client';
import type { HealthData } from '../types/health.types';

export const healthApi = {
  check: (): Promise<HealthData> => apiClient.get('/health'),
};
```

---

## 8. State Management

The frontend uses two distinct state layers with a clear separation:

**TanStack Query** manages all server state — signals, stocks, history, paper trades, backtest results. It handles caching, background refetching, and loading/error states.

**Zustand** manages client-only global state — user identity, API key, theme, and UI state with no server equivalent.

### Cache strategy (TanStack Query stale times)

| Data | Stale time | Refetch on window focus |
|------|-----------|------------------------|
| Active signals | 5 minutes | No |
| Signal list (paginated) | 2 minutes | No |
| Stock detail | 5 minutes | No |
| History / candles | 30 minutes | No |
| Favorites | 30 seconds | Yes |
| Paper trading summary | 5 minutes | No |
| Paper trading trades | 2 minutes | No |
| Backtest results | 10 minutes | No |
| Health check | 60 seconds (polling) | Yes |

All data changes daily after the pipeline. `refetchOnWindowFocus` is deliberately disabled for most queries to avoid surprise re-fetches when the user switches browser tabs.

### React Query hooks

**`src/hooks/useSignals.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';
import type { SignalFilters } from '../types';

export function useActiveSignals() {
  return useQuery({
    queryKey: ['signals', 'active'],
    queryFn:  () => signalsApi.active(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSignals(filters: SignalFilters) {
  return useQuery({
    queryKey:  ['signals', 'list', filters],
    queryFn:   () => signalsApi.list(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,  // prevent flash on page change (RQ v5)
    refetchOnWindowFocus: false,
  });
}
```

**`src/hooks/useHealth.ts`**

```typescript
export function useHealth() {
  return useQuery({
    queryKey:       ['health'],
    queryFn:        () => healthApi.check(),
    staleTime:      60 * 1000,
    refetchInterval: 60 * 1000,  // poll every 60 seconds
    refetchOnWindowFocus: true,
  });
}
```

**`src/hooks/useMarketStatus.ts`**

> **Design note:** `useMarketStatus` is a pure function (no hooks, state, or effects). It is named as a hook (`use*`) to follow the project convention that all query-adjacent logic lives in `hooks/`. This is acceptable since it is always called from within React components alongside real hooks. If preferred, it can be moved to `utils/marketStatus.ts` as a plain function.

```typescript
import { formatInTimeZone } from 'date-fns-tz';

export interface MarketStatus {
  marketOpen:      boolean;
  pipelineRanToday: boolean;
  dataIsStale:     boolean;
  isWeekday:       boolean;
}

export function useMarketStatus(lastPipelineRun?: string | null): MarketStatus {
  const now      = new Date();
  const ist      = 'Asia/Kolkata';
  const istTime  = formatInTimeZone(now, ist, 'HH:mm');
  const istDate  = formatInTimeZone(now, ist, 'yyyy-MM-dd');
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  const marketOpen = isWeekday && istTime >= '09:15' && istTime < '15:30';

  const pipelineRanToday = lastPipelineRun != null
    ? formatInTimeZone(new Date(lastPipelineRun), ist, 'yyyy-MM-dd') === istDate
    : false;

  const dataIsStale = isWeekday && istTime >= '17:00' && !pipelineRanToday;

  return { marketOpen, pipelineRanToday, dataIsStale, isWeekday };
}
```

**`src/hooks/useTradeDecisions.ts`**

```typescript
export function useDecision(signalId: number) {
  return useQuery({
    queryKey: ['decisions', signalId],
    queryFn:  () => tradeDecisionApi.get(signalId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertDecision(signalId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision: DecisionType; notes?: string; actual_entry?: number; actual_qty?: number }) =>
      tradeDecisionApi.upsert(signalId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisions', signalId] });
      toast.success('Decision saved');
    },
    onError: () => toast.error('Failed to save decision'),
  });
}
```

### Mutations (favorites — with optimistic update)

See Section 21 for the full optimistic UI implementation.

```typescript
// src/hooks/useFavorites.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../api/favorites.api';
import toast from 'react-hot-toast';

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes?: string }) =>
      favoritesApi.add(symbol, notes),
    onMutate: async ({ symbol }) => {
      // Optimistic update — see Section 21 for full implementation
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const previous = qc.getQueryData(['favorites']);
      // inject optimistic favorite record
      return { previous };
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(['favorites'], context?.previous);
      toast.error('Failed to add to watchlist');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Added to watchlist');
    },
  });
}
```

---

## 9. Routing and Navigation

**File:** `src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { FEATURES } from './utils/constants';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding — no auth guard, no app shell */}
        <Route path="/setup" element={<ApiKeySetupScreen />} />

        {/* Protected routes — require valid API key */}
        <Route element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="/signals"       element={<Signals />} />
          <Route path="/funnel"        element={<Funnel />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/watchlist"     element={<Watchlist />} />
          <Route path="/settings"      element={<Settings />} />

          {/* Feature-flagged routes */}
          <Route path="/paper-trading"
            element={FEATURES.paperTrading ? <PaperTrading /> : <Navigate to="/" replace />}
          />
          <Route path="/backtest"
            element={FEATURES.backtest ? <Backtest /> : <Navigate to="/" replace />}
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Sidebar navigation items

| Icon | Label | Route | Badge | Hidden when flag off |
|------|-------|-------|-------|---------------------|
| LayoutDashboard | Dashboard | / | — | — |
| Zap | Signals | /signals | Active signal count | — |
| Filter | Funnel | /funnel | — | — |
| Star | Watchlist | /watchlist | Favorite count | — |
| Wallet | Paper Trading | /paper-trading | Open trade count | `paperTrading` |
| FlaskConical | Backtest | /backtest | — | `backtest` |
| Settings | Settings | /settings | — | — |

### URL design for StockDetail

```
/stock/RELIANCE.NS
/stock/INFY.NS
/stock/M%26M.NS    ← always URL-encoded; never stored raw in the URL
```

The `StockDetail` page extracts and decodes the symbol from the URL:

```typescript
const { symbol: encodedSymbol } = useParams<{ symbol: string }>();
const symbol = decodeURIComponent(encodedSymbol ?? '');
```

---

## 10. Pages and Screens

### 10.1 Dashboard (`/`)

**Purpose:** Answer "what should I do today?"

**Layout:** 3-section page:
1. Top row — 4 stat cards: Active Signals count, Today's Market Regime, Open Paper Trades, Portfolio-at-Risk (INR)
2. Middle — Active Signals table (latest 5) + Quick Watchlist panel
3. Bottom — Paper Trading Summary mini-chart (equity curve, last 30 days)

**Data sources:**
- `GET /api/v1/signals/active`
- `GET /api/v1/health`
- `GET /api/v1/paper-trading/summary` (only if `FEATURES.paperTrading`)
- `GET /api/v1/favorites`

**Market Regime badge (prominent):**
- BULLISH → green pill
- SIDEWAYS → amber pill
- BEARISH → red pill
- HIGH_VOLATILITY → red pill with warning icon

---

### 10.2 Signals (`/signals`)

**Purpose:** Browse, filter, and inspect all signals.

**Layout:**
1. Filter bar (top) — debounced, synced to URL query params
2. Active Signals section — card grid (today's signals)
3. All Signals table — paginated, sortable

**Filters (all synced to URL query params — survive page refresh):**

| Filter | Control | API param | Debounced? |
|--------|---------|-----------|-----------|
| Status | Multi-select pills | `status` | No |
| Direction | Toggle: LONG / SHORT / All | via `direction` | No |
| Strategy | Dropdown | `strategy_source` | No |
| Date range | Date picker | `from_date`, `to_date` | No |
| Min confidence | Slider 0–100 | `min_confidence` | Yes (300ms) |
| Symbol | Autocomplete | `symbol` | Yes (300ms) |
| Favorites only | Toggle | `favorites_only` | No |
| Sort | Column header | `sort_by`, `sort_order` | No |

See Section 17 for filter debouncing and URL sync implementation.

**If `FEATURES.shortSignals` is false:** Direction filter does not show the "SHORT" option. SELL signal type badges are not rendered even if the backend returns them.

**Signal Card (active signal):**
```
┌─────────────────────────────────────────────────────────┐
│ RELIANCE.NS  ●ACTIVE    [BUY / LONG]     ★ (favorite)  │
│ Conglomerate · TREND_PULLBACK+BREAKOUT                  │
├──────────────┬──────────────┬───────────────────────────┤
│ Entry        │ Stop Loss    │ Target                    │
│ ₹2,450.00    │ ₹2,380.00    │ ₹2,600.00                │
├──────────────┴──────────────┴───────────────────────────┤
│ Confidence: ████████░░ 78%   R:R 2.14   Shares: 28    │
│ Reasons: Trend Alignment · Volume Spike · Breakout     │
│ Signal date: 23 Mar 2026                               │
└─────────────────────────────────────────────────────────┘
```

**Signal Table columns:**

| Column | Source field | Notes |
|--------|-------------|-------|
| Symbol | `symbol` | Link to `/stock/:symbol` |
| Date | `date` | `DD MMM YYYY` |
| Direction | `direction` | LONG (green) / SHORT (red) — hidden if `!FEATURES.shortSignals` |
| Exec | `execution_type` | EQUITY / FUTURES / NONE — hidden if `!FEATURES.shortSignals`. Non-executable rows at 60% opacity |
| Signal Type | `signal_type` | BUY / SELL |
| Strategy | `strategy_source` | Abbreviated |
| Confidence | `confidence` | Progress bar + integer |
| Entry | `entry_price` | ₹ formatted |
| Stop Loss | `stop_loss` | ₹ formatted |
| Target | `target_price` | ₹ formatted |
| R:R | `risk_reward` | e.g. "2.14x" |
| Status | `status` | Coloured pill |
| ★ | `is_favorite` | Star toggle — optimistic update |

Clicking any row opens a `SignalDetailDrawer`.

**Signal Detail Drawer:**
- Confidence breakdown bar (segmented by technical / momentum / volume / quality)
- Explainability panel with human-readable sentences
- All price levels with visual price bar (entry / SL / target relative to each other)
- Position sizing: Shares · Position value · Capital at risk
- Trade checklist with pass/warn/fail status for key attributes
- Decision override panel for logging TAKEN / SKIPPED / MODIFIED with notes
- Link to stock detail page

**Rejected Signals Section:**
Below the active and all signals sections, a collapsible "Rejected Signals" panel shows candidates that were filtered out by the pipeline. This fetches from `GET /api/v1/signals/rejected` and displays a table with columns: Symbol, Strategy, Reject Stage, Reason, Confidence, R:R.

**Pagination:** Page size = 20 (default). User can change to 50 or 100 using a dropdown. See Section 17.

---

### 10.3 Funnel (`/funnel`)

**Purpose:** Pipeline observability — understand which gates are filtering out the most signal candidates and whether any thresholds are over-strict.

**Data source:** `GET /api/v1/signals/funnel?date=YYYY-MM-DD`

**Hook:** `useFunnel(date?)` — TanStack Query with 5-minute stale time.

**Layout:**
1. Header with date picker input
2. Summary cards row — Total Candidates, Final Signals, Conversion Rate (color-coded: green >= 10%, amber >= 5%, red < 5%)
3. Warnings panel — amber alert box when any gate has pass rate < 40% with 5+ inputs
4. Gate breakdown — visual pass rate bars per gate with color coding (green >= 80%, blue >= 60%, amber >= 40%, red < 40%)
5. Detailed table — Gate name, Input count, Rejected count, Passed count, Pass Rate percentage

**Components used:** `LoadingSkeleton`, `ErrorState`, `EmptyState`, `PassRateBar` (local to page)

**New component:** `ExecutionBadge` (`src/components/signals/ExecutionBadge.tsx`) — displays execution type as a small badge. `NONE` execution type shows orange "Not Executable" badge with Ban icon. Used in SignalCard, SignalTable, and SignalDetailDrawer for non-executable signals.

---

### 10.4 Stock Detail (`/stock/:symbol`)

**Purpose:** Deep dive into a single stock.

**Layout:**
1. Stock header: symbol, sector badge, is_favorite toggle, latest price + change %
2. Candlestick chart with indicator overlays (EMA 20/50/200 toggleable)
3. Volume chart (shared x-axis)
4. Indicator grid: RSI, MACD, ATR, Volume change
5. Feature grid: all boolean features + z_score_20d + RVOL / Volume Tier + VWAP distance + Delivery %
6. Active signal panel (if signal exists)
7. Signal history table (last 30 signals for this stock)

**Feature grid additions (from backend improvements):**

The feature grid now includes the following additional cards:

| Feature | Field | Display | Card style |
|---------|-------|---------|------------|
| RVOL | `rvol` | `1.85x` (2 decimals + "x") | Numeric card |
| Volume Tier | `volume_tier` | Coloured pill: LOW (grey), NORMAL (blue), HIGH (amber), VERY_HIGH (orange), EXTREME (red) | Pill badge |
| VWAP | `vwap` | `formatINR()` | Numeric card |
| VWAP Distance | `vwap_distance_pct` | `formatPct(v, true)` e.g. "+0.82%" | Signed % with colour |
| Near VWAP | `is_near_vwap` | Green "Near" / grey "Far" pill | Boolean pill |
| High Delivery | `is_high_delivery` | Green "Yes" / grey "No" pill | Boolean pill |
| Delivery % | `delivery_pct` | `formatPct()` e.g. "42.50%" | Numeric card |

**Candlestick chart controls:**
- Timeframe: 1M / 3M / 6M / 1Y
- Overlay toggles: EMA20 / EMA50 / EMA200
- Volume chart toggle
- Chart theme follows app theme

**Data limit:** The history endpoint is called with a maximum of 500 candles regardless of timeframe. If a 1Y timeframe would return 252 candles, that is fine — but 3Y (756 candles) should be avoided. The `from_date` query param is set based on the selected timeframe to enforce this.

---

### 10.5 Paper Trading (`/paper-trading`)

Only rendered if `FEATURES.paperTrading` is true.

**Layout:**
1. Summary stat row: Total Trades / Win Rate / Avg PnL% / Total PnL (₹) / Max Drawdown
2. Equity curve chart (cumulative PnL, closed trades only)
3. Trades table — filterable by status, symbol

**Equity curve:** Recharts `AreaChart`. Closed trades sorted by `exit_date`, running sum of `pnl_pct` plotted. Open trades excluded.

---

### 10.6 Backtest (`/backtest`)

Only rendered if `FEATURES.backtest` is true.

**Layout:**
1. Strategy filter (TREND_PULLBACK / BREAKOUT / RANGE / MEAN_REVERSION / TREND_PULLBACK_SHORT / BREAKDOWN / COMBINED / ALL)
2. Latest results grid (one card per strategy)
3. Metrics comparison table (all runs)
4. Walk-forward bar chart (win_rate_pct per test period)

**Backtest Result Card:**
```
┌────────────────────────────────────────────┐
│ TREND_PULLBACK                             │
│ Test period: Jul–Dec 2025                  │
├──────────┬──────────┬───────────┬──────────┤
│ Win Rate │ Avg Ret  │ Max DD    │ Sharpe   │
│ 60.0%    │ +2.45%   │ -8.20%    │ 1.35     │
├──────────┴──────────┴───────────┴──────────┤
│ Profit Factor: 1.82 · Avg Hold: 6.3 days  │
│ 120 signals: 72W / 35L / 13N              │
└────────────────────────────────────────────┘
```

---

### 10.7 Watchlist (`/watchlist`)

**Layout:**
1. Add stock button (opens `AddFavoriteDialog`)
2. Watchlist cards grid

**Watchlist Card:**
```
┌────────────────────────────────────────────────────┐
│ RELIANCE.NS                    [BUY · 78%] ACTIVE  │
│ Conglomerate                                        │
│ ₹2,450.00   +1.20%  ▲                             │
│ "Watching for breakout above 2500"  [✕ Remove]     │
└────────────────────────────────────────────────────┘
```

**Add Favorite Dialog:**
- Symbol: searchable dropdown (NIFTY 50 list only)
- Notes: textarea (max 500 chars)
- On 409: inline error "Already in your watchlist" (not a toast)

---

### 10.8 Settings (`/settings`)

**Sections:**
- **Connection:** API Key field (masked, toggleable) + "Test Connection" button
- **Preferences:** Theme toggle, Default timeframe, Auto-refresh interval
- **Feature flags (read-only display):** Shows which features are enabled/disabled
- **About:** App version + last health check result

---

## 11. Component Library

### SignalBadge

```typescript
type SignalBadgeProps = {
  signalType: SignalType;
  direction: SignalDirection;
};

// BUY + LONG  → green pill "BUY"
// SELL + SHORT → red pill "SELL"
```

**Feature flag interaction:** If `!FEATURES.shortSignals`, SHORT direction is never displayed even if returned by the API. The badge renders only the `signalType` in that case.

### StatusBadge

```typescript
type StatusBadgeProps = { status: SignalStatus | TradeStatus };

ACTIVE      → blue pill
TARGET_HIT  → green pill
SL_HIT      → red pill
EXPIRED            → grey pill
EXPIRED_PENALIZED  → amber pill, label "Expired (penalized)"
OPEN               → blue pill
CLOSED             → grey pill
```

### ConfidenceBar

```typescript
type ConfidenceBarProps = {
  value: number;                     // 0–100
  tier?: ConfidenceTier | null;      // 'HIGH' | 'NORMAL' | 'LOW'
};

// Bar colour thresholds unchanged:
// < 40: red | 40–69: amber | 70+: green

// Tier badge (appended to right of bar):
// HIGH   → green badge "High"
// NORMAL → blue badge "Normal"
// LOW    → amber badge "Low"
// null   → no badge (legacy signals)
```

### StatCard

```typescript
type StatCardProps = {
  label: string;
  value: string;           // pre-formatted via format.ts
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  isLoading?: boolean;     // shows skeleton inside card
};
```

### PriceChange

```typescript
type PriceChangeProps = {
  value: number;
  format: 'pct' | 'inr' | 'raw';
};

// Positive: green text + ▲
// Negative: red text + ▼
// Zero: grey text + —
```

### MarketRegimeBadge

```typescript
type MarketRegimeBadgeProps = { regime: MarketRegime };

BULLISH         → green "● Bullish"
SIDEWAYS        → amber "● Sideways"
BEARISH         → red "● Bearish"
HIGH_VOLATILITY → red "⚠ High Volatility"
```

**Feature flag interaction:** If `!FEATURES.shortSignals`, BEARISH regime is shown as "● Market Caution" rather than mentioning short signals.

### ConfidenceBreakdownBar

```typescript
type ConfidenceBreakdownBarProps = {
  breakdown: ConfidenceBreakdown | null;
  confidence: number;
};

// Renders a segmented horizontal bar showing contribution from each scoring bucket.
// Segments: Technical (blue), Momentum (amber), Volume (teal), Quality (purple).
// Falls back to a simple single-colour ConfidenceBar if breakdown is null (pre-migration signals).
// Each segment width is proportional to its value out of the total.
// Legend shows bucket names and values below the bar.
```

### ExplainabilityPanel

```typescript
type ExplainabilityPanelProps = {
  explanation: string[] | null;
  reasons: string[];
};

// Renders a list of human-readable sentences from the explanation array.
// Each sentence appears with a checkmark icon.
// Falls back to rendering the legacy reasons array as badge pills if explanation is null.
```

### TradeChecklist

```typescript
type TradeChecklistProps = {
  signal: Signal;
};

// Derives a checklist from signal attributes with pass/warn/fail status:
// - Confidence: pass (>=80), warn (70-79), fail (<70)
// - Risk:Reward: pass (>=2.5), warn (2.0-2.5), fail (<2.0)
// - Direction: pass if LONG and regime BULLISH, warn if SIDEWAYS
// - Status: pass (ACTIVE), info (TARGET_HIT/SL_HIT), grey (EXPIRED)
// - Position Size: pass (shares > 0), fail (0)
// - Volume: pass (reasons include volume keywords)
// Each row shows icon (circle-check, alert-triangle, x-circle) + label + status text.
```

### DecisionOverridePanel

```typescript
type DecisionOverridePanelProps = {
  signalId: number;
};

// Allows the trader to record their decision on a signal:
// - Three buttons: TAKEN / SKIPPED / MODIFIED
// - Notes textarea (optional)
// - Actual entry price and quantity fields (shown only for MODIFIED)
// - Save button triggers upsert mutation
// - If a decision already exists, pre-fills all fields
// Uses useDecision and useUpsertDecision hooks.
```

### DataTable

```typescript
type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    onLimitChange: (l: number) => void;
  };
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
};

// Default page size: 20
// Available sizes: 20, 50, 100
// Shows "Showing 1–20 of 45 results" footer text
```

---

## 12. Charting and Data Visualisation

### Candlestick Chart (Lightweight Charts)

**File:** `src/components/charts/CandlestickChart.tsx`

Chart data is **memoized**. Re-renders only when `candles` reference changes — not on every parent render.

```typescript
// Data limit: always cap at 500 candles before passing to chart
// The API call should enforce this via from_date, but as a safety net:
const chartData = useMemo(() =>
  candles.slice(-500).map((c) => ({
    time: toDateStr(c.date),  // always 'YYYY-MM-DD'
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  })),
  [candles]
);
```

**Date string sanitisation (`toDateStr`):**

Lightweight Charts requires date values in strict `yyyy-MM-dd` format. The backend may return ISO 8601 timestamps (e.g., `2025-09-23T18:30:00.000Z`) or `Date` objects depending on the MySQL driver configuration. Both `CandlestickChart.tsx` and `VolumeChart.tsx` use a `toDateStr` helper to guarantee the correct format:

```typescript
function toDateStr(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw);
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '1970-01-01' : d.toISOString().slice(0, 10);
}
```

This helper handles `Date` objects, ISO strings, plain `yyyy-MM-dd` strings, and falls back to `'1970-01-01'` for unparseable values rather than crashing the chart.

The chart is initialised in a `useEffect`, updates data series on candle changes, and is fully destroyed on unmount. The chart container div gets `ref={chartContainerRef}`.

**EMA overlay colours:**
- EMA 20: blue (#3B82F6)
- EMA 50: orange (#F97316)
- EMA 200: purple (#A855F7)

**Volume bars:**
- Green candle day: #22C55E at 40% opacity
- Red candle day: #EF4444 at 40% opacity

**Chart is wrapped in `ChartErrorBoundary`.** If the chart crashes (e.g., bad data format), the error boundary shows "Chart unavailable" without affecting the rest of the stock detail page.

### Equity Curve Chart (Recharts)

Closed trades sorted by `exit_date`, cumulative `pnl_pct` computed as a running sum.

```typescript
const equityData = useMemo(() =>
  closedTrades
    .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime())
    .reduce<EquityPoint[]>((acc, trade, i) => {
      const prev = acc[i - 1]?.cumulative ?? 0;
      return [...acc, {
        date:       trade.exit_date!,
        cumulative: +(prev + (trade.pnl_pct ?? 0)).toFixed(2),
        trade_pnl:  trade.pnl_pct ?? 0,
      }];
    }, []),
  [closedTrades]
);
```

Recharts `AreaChart` with a reference line at y=0. Above-zero fill: green at 20%. Below: red at 20%.

### Walk-Forward Chart (Recharts)

Bar chart, one bar per backtest run. Grouped by strategy. Tooltip shows all 6 metrics on hover.

---

## 13. Real-Time Pipeline Status

### PipelineStatusBar

**File:** `src/components/layout/PipelineStatusBar.tsx`

Always visible — sits above the main content area in `AppShell`.

```typescript
const { data: health } = useHealth();
const { pipelineRanToday, dataIsStale, isWeekday } = useMarketStatus(
  health?.last_pipeline_run
);

// Display states:
// 1. !isWeekday → grey "Market closed — weekend"
// 2. isWeekday, pipeline ran today → green "Updated today at {time} IST · {n} active signals"
// 3. isWeekday before 4:30 PM, not run → amber "Pipeline scheduled for 4:30 PM IST"
// 4. isWeekday after 5 PM, not run → red "⚠ Today's data not yet loaded"
```

The `active_signals_count` from the health response is shown inline in the green state.

---

## 14. Formatting and Display Rules

All formatting must go through `src/utils/format.ts`. Never format numbers inline in components.

### Type coercion helper

MySQL returns `DECIMAL` columns as strings (e.g., `"2.00"` instead of `2.00`). All format functions accept `number | string | null | undefined` and internally coerce via a `toNum` helper:

```typescript
export function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}
```

All formatters return `"—"` for null/undefined/NaN inputs.

**Defensive `.toFixed()` usage:** The backend improvements introduced several new numeric fields (`rvol`, `vwap`, `vwap_distance_pct`, `delivery_pct`) that arrive as MySQL `DECIMAL` strings. All components that call `.toFixed()` must guard against non-numeric values. The pattern is:

```typescript
(toNum(v) ?? 0).toFixed(2)
// or for inline display:
typeof value === 'number' ? value.toFixed(2) : '—'
```

This prevents `TypeError: value.toFixed is not a function` crashes when the backend returns string representations of decimals. Components hardened with this pattern include `IndicatorOverlay.tsx`, `IndicatorGrid.tsx`, and `FeatureGrid.tsx`.

### Price (INR)

```typescript
export function formatINR(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return n.toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  });
}
// 2450      → "₹2,450.00"
// "2450"    → "₹2,450.00"   (string input handled)
// null      → "—"
```

### Percentage

```typescript
export function formatPct(value: number | string | null | undefined, showSign = false): string {
  const n = toNum(value);
  if (n == null) return '—';
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}
// formatPct(78)           → "78.00%"
// formatPct("2.45", true) → "+2.45%"
// formatPct(null)         → "—"
```

### Risk-reward

```typescript
export function formatRR(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return `${n.toFixed(2)}x`;
}
// 2.14   → "2.14x"
// "2.00" → "2.00x"  (MySQL returns DECIMAL as string)
```

### Dates (always IST)

```typescript
export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy');
}
// '2026-03-23' → "23 Mar 2026"

export function formatDateTime(isoStr: string): string {
  return formatInTimeZone(new Date(isoStr), 'Asia/Kolkata', "d MMM yyyy, h:mm a 'IST'");
}
// '2026-03-23T16:45:00.000Z' → "23 Mar 2026, 10:15 PM IST"
```

### Shares

```typescript
export function formatShares(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
// 150 → "150"
// 1200 → "1,200"
```

### Confidence score

Displayed as integer: `78` not `78.00`.

```typescript
export function formatConfidence(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return Math.round(n).toString();
}

export function formatExitReason(reason: string | null | undefined): string {
  if (!reason) return '—';
  if (reason === 'EXPIRED_PENALIZED') return 'Expired (penalized)';
  return reason.split('_').join(' ');
}
```

### Signal reasons display

Signal reasons are rendered as-is from the backend — no display-name mapping is applied. The backend sends human-readable strings that are displayed directly as badge pills in `SignalDetailDrawer` and `SignalCard`.

Known reason strings from the backend:

`Trend Alignment` · `RSI Pullback` · `Volume Spike` · `High Volume` · `Very High Volume` · `Extreme Volume` · `Breakout` · `Range Setup` · `Mean Reversion` · `High Delivery` · `Near VWAP` · `FinBERT Positive` · `FinBERT Negative`

### Strategy source display names

| Backend value | Display |
|--------------|---------|
| `TREND_PULLBACK` | Trend Pullback |
| `BREAKOUT` | Breakout |
| `RANGE` | Range |
| `MEAN_REVERSION` | Mean Reversion |
| `TREND_PULLBACK_SHORT` | Trend Short |
| `BREAKDOWN` | Breakdown |
| `TREND_PULLBACK+BREAKOUT` | Trend + Breakout |

---

## 15. Error Boundaries and Error Handling

### Error Boundary hierarchy

Three levels of error boundaries protect the app from crashes. A crash at any level is isolated — the parent levels remain functional.

```
<RootErrorBoundary>          ← catches everything — full-page fallback
  <AppShell>
    <PageErrorBoundary>      ← wraps each page — keeps nav working
      <Dashboard />
    </PageErrorBoundary>
    <PageErrorBoundary>
      <StockDetail>
        <ChartErrorBoundary> ← wraps chart only — keeps rest of page working
          <CandlestickChart />
        </ChartErrorBoundary>
        <IndicatorGrid />    ← unprotected, part of PageErrorBoundary
      </StockDetail>
    </PageErrorBoundary>
  </AppShell>
</RootErrorBoundary>
```

**`RootErrorBoundary`** (`src/components/errors/RootErrorBoundary.tsx`) catches any crash that escapes the page level. Shows a full-page "Something went wrong" with a "Reload app" button. Logs the error to the console (and in a future logger service).

**`PageErrorBoundary`** (`src/components/errors/PageErrorBoundary.tsx`) wraps every `<Route>` element inside `AppShell`. When a page crashes, the sidebar and topbar remain visible. The page area shows an `ErrorState` with a "Try again" button that resets the error boundary.

**`ChartErrorBoundary`** (`src/components/errors/ChartErrorBoundary.tsx`) wraps each chart component. A chart failure shows "Chart unavailable" in the chart container area only. The rest of the page (indicators, features, signal panel) is unaffected.

```typescript
// Usage pattern in App.tsx:
<Route path="/"
  element={
    <PageErrorBoundary>
      <Dashboard />
    </PageErrorBoundary>
  }
/>

// Usage in StockDetail.tsx:
<ChartErrorBoundary>
  <CandlestickChart candles={candles} />
</ChartErrorBoundary>
```

### API error handling

**Query failures (data fetching):** Show `ErrorState` component inline where the data would appear. Never a toast.

**Mutation failures (user actions):** Show a toast. If the error is a 409, show an inline error instead of a toast (the context is specific and immediate — e.g., "Already in your watchlist").

**401:** Axios interceptor dispatches `tn:auth-failure` event. `AppShell` opens `ApiKeyModal`.

**Network timeout:** The Axios client has a 15-second timeout. On timeout, the error is treated the same as any other query failure — `ErrorState` with retry.

### Error message mapping

Never show raw backend error strings. Map them to user-friendly messages:

```typescript
// src/utils/constants.ts
export const ERROR_MESSAGES: Record<string, string> = {
  'Unauthorized':                   'Invalid API key. Check Settings.',
  'Symbol not found':               'This stock was not found.',
  'X-User-Id header is required':   'Session error. Please refresh.',
  'RELIANCE.NS is already in your favorites': 'Already in your watchlist.',
};

export function friendlyError(raw: string): string {
  return ERROR_MESSAGES[raw] ?? 'Something went wrong. Please try again.';
}
```

---

## 16. Loading State Standards

Consistent loading UX rules across the entire app.

| Scenario | Component | Notes |
|----------|-----------|-------|
| First data load (no cached data) | `LoadingSkeleton` | Shows structure without content |
| Background refetch (cached data exists) | Subtle spinner in topbar corner | Never replaces existing content |
| Table page change | `DataTable` shows row skeletons | Previous data stays visible via `placeholderData` |
| Chart loading | `LoadingSkeleton` in chart container | Same dimensions as the chart |
| Mutation in progress | Button shows spinner + disabled state | Text changes to "Adding..." / "Removing..." |
| Empty results | `EmptyState` | Only shown after loading is complete |

### LoadingSkeleton variants

```typescript
type LoadingSkeletonProps = {
  variant: 'card' | 'table-row' | 'chart' | 'text';
  rows?: number;    // for table-row variant
  height?: string;  // for chart variant (e.g. "300px")
};
```

### Pattern for every data component

```typescript
const { data, isLoading, isError, error, refetch } = useSignals(filters);

if (isLoading) return <LoadingSkeleton variant="table-row" rows={5} />;
if (isError)   return <ErrorState message={friendlyError(error.message)} onRetry={refetch} />;
if (!data?.signals.length) return <EmptyState message="No signals match your filters" />;
return <SignalTable signals={data.signals} />;
```

This exact pattern must be followed in every data-dependent component, no exceptions.

---

## 17. Filter Debouncing and URL State

### Debouncing

Text inputs and sliders that trigger API calls must be debounced to avoid firing a new request on every keystroke.

```typescript
// src/hooks/useDebounce.ts
export { useDebounce } from 'use-debounce';
// Re-export for a single import point. All callers import from here, not from the package directly.
```

**Debounce timing:**

| Input type | Delay |
|-----------|-------|
| Text search / symbol autocomplete | 300ms |
| Confidence slider | 300ms |
| Date pickers | No debounce (only change on picker close) |
| Multi-select pills | No debounce (discrete choice) |
| Toggle switches | No debounce |
| Page navigation | No debounce |

```typescript
// Usage in SignalFilters.tsx:
const [symbolInput, setSymbolInput] = useState('');
const [debouncedSymbol] = useDebounce(symbolInput, 300);

// Only debouncedSymbol goes into the React Query key and API call
useSignals({ ...otherFilters, symbol: debouncedSymbol });
```

> **Note:** `useDebounce` from the `use-debounce` package returns an array `[debouncedValue, ...]`, not a plain value. Always destructure the first element.

### URL state sync

All filter state on the Signals page is synced to URL query params. This means:
- Filters survive page refresh
- URLs can be shared and reproduce the same view
- Browser back/forward button navigates filter history

**File:** `src/hooks/useFilterUrlSync.ts`

```typescript
import { useSearchParams } from 'react-router-dom';

export function useSignalFilters(): [SignalFilters, (f: Partial<SignalFilters>) => void] {
  const [params, setParams] = useSearchParams();

  const filters: SignalFilters = {
    status:         (params.get('status') as SignalStatus) ?? 'all',
    direction:      (params.get('direction') as SignalDirection) ?? 'all',
    symbol:         params.get('symbol') ?? undefined,
    from_date:      params.get('from_date') ?? undefined,
    to_date:        params.get('to_date') ?? undefined,
    min_confidence: params.get('min_confidence') ? Number(params.get('min_confidence')) : undefined,
    favorites_only: params.get('favorites_only') === 'true',
    page:           params.get('page') ? Number(params.get('page')) : 1,
    limit:          params.get('limit') ? Number(params.get('limit')) : PAGINATION.defaultPageSize,
    sort_by:        (params.get('sort_by') as SignalFilters['sort_by']) ?? 'date',
    sort_order:     (params.get('sort_order') as 'asc' | 'desc') ?? 'desc',
  };

  const setFilters = (updates: Partial<SignalFilters>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    // Reset to page 1 when any non-page filter changes
    if (!('page' in updates)) next.set('page', '1');
    setParams(next, { replace: true });
  };

  return [filters, setFilters];
}
```

**Pagination:** Default page size is 20. Available sizes: 20, 50, 100. Page size is persisted in the URL (`?limit=50`). Changing page size resets to page 1.

---

## 18. Feature Flag System

**File:** `src/utils/featureFlags.ts`

Feature flags control both routing and UI rendering. When a flag is off, the corresponding route redirects to `/` and the UI elements that depend on it are hidden entirely — they do not render as disabled or greyed-out.

```typescript
// src/utils/featureFlags.ts
import { FEATURES } from './constants';

// Centralise all feature-gated decisions here
export const featureFlags = {
  // Routing
  canAccessPaperTrading: () => FEATURES.paperTrading,
  canAccessBacktest:     () => FEATURES.backtest,

  // UI elements
  showShortDirection:    () => FEATURES.shortSignals,
  showDirectionFilter:   () => FEATURES.shortSignals,
  showBearishRegime:     () => FEATURES.shortSignals,

  // Data
  includeShortSignals:   () => FEATURES.shortSignals,
} as const;
```

### Applying flags in components

```typescript
// In SignalFilters.tsx:
const showDirectionFilter = featureFlags.showDirectionFilter();

// In Sidebar.tsx:
const navItems = [
  ...alwaysVisible,
  featureFlags.canAccessPaperTrading() && { path: '/paper-trading', label: 'Paper Trading' },
  featureFlags.canAccessBacktest()     && { path: '/backtest',      label: 'Backtest' },
].filter(Boolean);

// In SignalTable.tsx:
const columns = [
  ...baseColumns,
  featureFlags.showShortDirection() && directionColumn,
].filter(Boolean);
```

**Do not conditionally render with `if` at the top of a component.** Use the pattern above — filter from an array — so the component tree is consistent and React's reconciliation is predictable.

---

## 19. Logging and Debug Strategy

A trading dashboard needs reliable debug output in development, and zero noise in production.

**File:** `src/utils/logger.ts`

```typescript
import { DEBUG_MODE } from './constants';

const isDev = import.meta.env.DEV;
const isDebug = isDev || DEBUG_MODE;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDebug) console.debug('[TN]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDebug) console.info('[TN]', ...args);
  },
  warn: (...args: unknown[]) => {
    // always log warnings
    console.warn('[TN]', ...args);
  },
  error: (...args: unknown[]) => {
    // always log errors
    console.error('[TN]', ...args);
  },
};
```

**Rules:**
- `logger.debug` and `logger.info` are no-ops in production.
- `logger.warn` and `logger.error` always fire (they capture real problems).
- Never use `console.log` directly — always use `logger`. ESLint enforces this via the `no-console` rule.
- The Axios interceptors use `logger.debug` to print every request and response in development (see Section 7).

**ESLint config to enforce this:**

```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error", "info"] }]
  }
}
```

> **Why allow `warn`, `error`, `info`?** The custom `logger.ts` wraps `console.warn`, `console.error`, and `console.info` internally. Without these overrides the linter would flag the logger implementation itself. All application code still uses `logger.*` — the `no-console` rule catches any accidental `console.log` usage in components and hooks.

### React Query DevTools

Mounted in development only:

```typescript
// src/App.tsx
import React from 'react';

const ReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )
  : () => null;

// Inside JSX:
<QueryClientProvider client={queryClient}>
  {/* ... app ... */}
  <React.Suspense fallback={null}>
    <ReactQueryDevtools initialIsOpen={false} />
  </React.Suspense>
</QueryClientProvider>
```

---

## 20. Keyboard Shortcuts

Traders value speed. Keyboard shortcuts reduce the time from "I want to check X" to "I'm looking at X".

**File:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Do nothing if user is typing in an input, textarea, or select
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      switch (e.key) {
        case 'd': navigate('/');             break;  // Dashboard
        case 's': navigate('/signals');      break;  // Signals
        case 'w': navigate('/watchlist');    break;  // Watchlist
        case 'p': navigate('/paper-trading'); break; // Paper trading
        case 'b': navigate('/backtest');     break;  // Backtest
        case ',': navigate('/settings');     break;  // Settings (comma = gear-like)
        case '/':
          e.preventDefault();
          // Focus the symbol search input on the Signals page
          document.getElementById('symbol-search')?.focus();
          break;
        case 'f':
          // Toggle the filter panel open/closed on pages that have one
          window.dispatchEvent(new CustomEvent('tn:toggle-filters'));
          break;
        case 'Escape':
          // Close open drawer/dialog
          window.dispatchEvent(new CustomEvent('tn:close-overlay'));
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
```

**Shortcut reference table (shown in Settings → Keyboard Shortcuts):**

| Key | Action |
|-----|--------|
| `D` | Go to Dashboard |
| `S` | Go to Signals |
| `W` | Go to Watchlist |
| `P` | Go to Paper Trading |
| `B` | Go to Backtest |
| `,` | Go to Settings |
| `/` | Focus symbol search |
| `F` | Toggle filter panel |
| `Esc` | Close drawer / dialog |

---

## 21. Optimistic UI for Mutations

Favorites add/remove must feel instant. The user clicks the star and the UI updates immediately — the API call happens in the background.

### Add favorite (optimistic)

```typescript
// src/hooks/useFavorites.ts

export function useAddFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes?: string }) =>
      favoritesApi.add(symbol, notes),

    onMutate: async ({ symbol }) => {
      // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await qc.cancelQueries({ queryKey: ['favorites'] });
      await qc.cancelQueries({ queryKey: ['signals'] });

      // 2. Snapshot the previous value
      const previousFavorites = qc.getQueryData<FavoritesResponse>(['favorites']);
      const previousSignals   = qc.getQueryData(['signals', 'active']);

      // 3. Optimistically update favorites list
      qc.setQueryData<FavoritesResponse>(['favorites'], (old) => ({
        ...old!,
        favorites: [
          ...(old?.favorites ?? []),
          {
            symbol,
            sector: getSector(symbol),
            notes: undefined,
            created_at: new Date().toISOString(),
            latest_signal: null,
            latest_price: null,
          },
        ],
      }));

      // 4. Optimistically update is_favorite on any signal that matches
      // (signals list may show is_favorite: true after adding)
      // Simple approach: mark query as stale — it will refetch on success

      return { previousFavorites, previousSignals };
    },

    onError: (_err, _vars, context) => {
      // Roll back to snapshot
      if (context?.previousFavorites) {
        qc.setQueryData(['favorites'], context.previousFavorites);
      }
      toast.error('Failed to add to watchlist');
    },

    onSettled: () => {
      // Always refetch after error or success to sync with server truth
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['signals'] });
    },

    onSuccess: () => {
      toast.success('Added to watchlist');
    },
  });
}
```

### Remove favorite (optimistic)

Same pattern — snapshot, remove from list optimistically, roll back on error.

### Star toggle in tables

The star `★` in the signals table must respond immediately without waiting for the mutation to settle. Using the optimistic update pattern above, the star flips on click and the data refetches silently after the API call completes.

---

## 22. Responsive and Mobile Considerations

This is an internal tool — the primary use case is desktop. However, tablet-sized screens (iPad landscape, 1024px) must work correctly because traders check positions on tablets.

### Breakpoints

Follow Tailwind's default breakpoints. Target at minimum:
- `md` (768px) — tablet portrait: minimum viable layout
- `lg` (1024px) — tablet landscape: full layout
- `xl` (1280px) — desktop default

### Layout adjustments at tablet width

**Sidebar:** Collapses to icon-only mode at `< lg`. Icons are clickable with tooltips for labels.

**Signal cards:** Switch from a 2-column grid to a 1-column stack at `< md`.

**Candlestick chart:** Chart height reduces to 250px at `< lg` (from 400px default).

**Tables:** At `< md`, hide secondary columns (Stop Loss, Target, R:R) and show only Symbol, Confidence, Status. A tap on a row still opens the full Signal Detail Drawer.

**DataTable columns by breakpoint:**

| Column | Mobile (< md) | Tablet (md–lg) | Desktop (> lg) |
|--------|--------------|----------------|----------------|
| Symbol | ✅ | ✅ | ✅ |
| Direction | ❌ | ✅ | ✅ |
| Confidence | ✅ | ✅ | ✅ |
| Entry | ❌ | ✅ | ✅ |
| Stop Loss | ❌ | ❌ | ✅ |
| Target | ❌ | ❌ | ✅ |
| R:R | ❌ | ✅ | ✅ |
| Status | ✅ | ✅ | ✅ |

### Touch interactions

- Star toggle: minimum 44×44px tap target
- Table row: entire row is tappable, opens drawer
- Drawer: swipe-down to close on mobile (shadcn Sheet handles this natively)

---

## 23. Environment-Specific Behaviour

### Development

- Vite dev server proxies `/api` to the backend to avoid CORS:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['lightweight-charts', 'recharts'],
          },
        },
      },
    },
  };
});
```

> The proxy target is hardcoded to `http://localhost:3000` (the backend server origin). Do not set it to `VITE_API_BASE_URL` which may include the `/api/v1` path prefix.
- React Query DevTools mounted (lazy-loaded)
- All `logger.debug` and `logger.info` output visible in console
- Error boundary details shown (stack traces visible)

### Production

- Static files served via nginx / Vercel / Netlify
- Source maps disabled
- All `logger.debug` / `logger.info` calls are no-ops
- Error boundaries show user-friendly messages only (no stack traces)
- `VITE_DEBUG_MODE=true` in production `.env` re-enables debug logging without a rebuild (for remote debugging)

---

## 24. Testing Strategy

### Unit tests (Vitest + Testing Library)

Located in `src/**/__tests__/` or colocated as `*.test.tsx`.

| What to test | Focus |
|-------------|-------|
| `format.ts` | All functions with edge cases (zero, negative, very large INR values) |
| `useMarketStatus` | IST timezone logic, weekend detection, pipeline run detection |
| `useFilterUrlSync` | URL read/write for all filter fields, page reset on filter change |
| `useKeyboardShortcuts` | Navigation shortcuts, input field bypass |
| `SignalBadge` | All signal_type + direction combinations, feature flag interaction |
| `StatusBadge` | All status values |
| `PriceChange` | Positive, negative, zero |
| `ConfidenceBar` | All colour threshold ranges |
| `featureFlags` | All flags off → correct elements hidden |
| `logger` | debug/info no-ops in production, warn/error always fire |
| Chart data transforms | `chartData` memoization, 500-candle cap, `equityData` running sum |
| `friendlyError` | All mapped errors, fallback for unknown errors |
| `ConfidenceBreakdownBar` | Renders segmented bar with breakdown; falls back when breakdown is null |
| `ExplainabilityPanel` | Renders explanation sentences; falls back to reasons when null |
| `TradeChecklist` | Correct pass/warn/fail derivation for all signal attribute combinations |
| `DecisionOverridePanel` | Pre-fills existing decision; saves new decision; shows modified fields |
| `useTradeDecisions` | Query returns existing decision; mutation upserts and invalidates |

### API mock (MSW)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { mockActiveSignals, mockHealth } from './fixtures';

export const handlers = [
  http.get('/api/v1/health',         () => HttpResponse.json({ success: true, data: mockHealth, error: null })),
  http.get('/api/v1/signals/active', () => HttpResponse.json({ success: true, data: { signals: mockActiveSignals }, error: null })),
  http.get('/api/v1/signals',        () => HttpResponse.json({ success: true, data: { signals: mockActiveSignals, pagination: mockPagination }, error: null })),
  http.post('/api/v1/favorites',     () => HttpResponse.json({ success: true, data: mockFavorite, error: null }, { status: 201 })),
  http.delete('/api/v1/favorites/:symbol', () => HttpResponse.json({ success: true, data: { removed: true }, error: null })),
  http.get('/api/v1/signals/rejected',    () => HttpResponse.json({ success: true, data: { rejected: mockRejectedSignals }, error: null })),
  http.get('/api/v1/signals/:id/decision', () => HttpResponse.json({ success: true, data: null, error: null })),
  http.post('/api/v1/signals/:id/decision', () => HttpResponse.json({ success: true, data: mockDecision, error: null })),
  http.get('/api/v1/decisions',            () => HttpResponse.json({ success: true, data: { decisions: [] }, error: null })),
  // ... all endpoints
  // 401 handler for auth flow tests:
  http.get('/api/v1/health', ({ request }) => {
    const key = request.headers.get('X-API-Key');
    if (key === 'invalid') return HttpResponse.json({ success: false, data: null, error: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ success: true, data: mockHealth, error: null });
  }),
];
```

### Integration tests

Each page test:
1. Renders the page inside `QueryClientProvider` + `MemoryRouter` + `RootErrorBoundary`
2. Asserts loading skeletons appear
3. Waits for mock responses to resolve
4. Asserts key content is displayed

**Key scenarios:**
- `ApiKeySetupScreen`: empty key → setup screen; valid key → enters app; invalid key → inline error
- `Dashboard`: stat cards show correct counts; market regime badge shows correct colour
- `Signals` page: filter changes update URL; debounce delays API call; pagination works
- `StockDetail`: symbol decoded from URL; M%26M.NS decoded to M&M.NS in API call; chart renders
- `PaperTrading`: equity curve sorted correctly; feature flag off → redirects to `/`
- `Watchlist`: optimistic star toggle; 409 shows inline error; remove works
- Error Boundary: chart crash shows "Chart unavailable" without breaking rest of page
- `SignalDetailDrawer`: ConfidenceBreakdownBar renders breakdown; ExplainabilityPanel shows explanation; TradeChecklist derives correct statuses; DecisionOverridePanel saves decision
- `Signals` page rejected section: collapsible section shows rejected signals from API; displays reject stage and reason

### What not to test

- Recharts or Lightweight Charts internal rendering
- Tailwind class names
- localStorage persistence (test the store logic, not the storage mechanism)

---

## 25. Build and Deployment

### Scripts

```json
{
  "scripts": {
    "dev":        "vite",
    "build":      "tsc --noEmit && vite build",
    "preview":    "vite preview",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:ui":    "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint":       "eslint src --ext .ts,.tsx --max-warnings 0",
    "format":     "prettier --write src",
    "type-check": "tsc --noEmit"
  }
}
```

`--max-warnings 0` means the build fails on any ESLint warning, not just errors. This prevents lint warnings from accumulating over time.

### Build output

Vite outputs to `dist/`. Standard static site.

```nginx
server {
  listen 80;
  root /var/www/tradeneuron;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Environment files

```
.env.development   → vite dev server
.env.production    → vite build (default)
.env.staging       → vite build --mode staging
```

### Pre-build checklist

Before every production build, the following must pass:
1. `npm run type-check` — zero TypeScript errors
2. `npm run lint` — zero ESLint warnings or errors
3. `npm test` — all unit + integration tests pass
4. Manual verification: `ApiKeySetupScreen` works with the production API key

---

## Appendix A: NIFTY 50 Symbol Registry (Frontend Mirror)

**File:** `src/utils/symbols.ts`

```typescript
export const NIFTY_50_SYMBOLS = [
  'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
  'BAJAJ-AUTO.NS', 'BAJAJFINSV.NS', 'BAJFINANCE.NS', 'BHARTIARTL.NS', 'BPCL.NS',
  'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'INDUSINDBK.NS',
  'INFY.NS', 'ITC.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
  'LTIM.NS', 'M&M.NS', 'MARUTI.NS', 'NESTLEIND.NS', 'NTPC.NS',
  'ONGC.NS', 'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SBIN.NS',
  'SHRIRAMFIN.NS', 'SUNPHARMA.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS',
  'TCS.NS', 'TECHM.NS', 'TITAN.NS', 'TRENT.NS', 'ULTRACEMCO.NS',
] as const;

export type NiftySymbol = typeof NIFTY_50_SYMBOLS[number];

export const SECTOR_MAP: Record<NiftySymbol, string> = {
  'ADANIENT.NS': 'Conglomerate', 'ADANIPORTS.NS': 'Infrastructure',
  'APOLLOHOSP.NS': 'Healthcare',  'ASIANPAINT.NS': 'Consumer Goods',
  'AXISBANK.NS': 'Banking',       'BAJAJ-AUTO.NS': 'Automobile',
  'BAJAJFINSV.NS': 'Financial Services', 'BAJFINANCE.NS': 'Financial Services',
  'BHARTIARTL.NS': 'Telecom',     'BPCL.NS': 'Oil & Gas',
  'BRITANNIA.NS': 'FMCG',        'CIPLA.NS': 'Pharma',
  'COALINDIA.NS': 'Mining',       'DIVISLAB.NS': 'Pharma',
  'DRREDDY.NS': 'Pharma',        'EICHERMOT.NS': 'Automobile',
  'GRASIM.NS': 'Cement & Materials', 'HCLTECH.NS': 'IT',
  'HDFCBANK.NS': 'Banking',      'HDFCLIFE.NS': 'Insurance',
  'HEROMOTOCO.NS': 'Automobile',  'HINDALCO.NS': 'Metals',
  'HINDUNILVR.NS': 'FMCG',      'ICICIBANK.NS': 'Banking',
  'INDUSINDBK.NS': 'Banking',    'INFY.NS': 'IT',
  'ITC.NS': 'FMCG',             'JSWSTEEL.NS': 'Metals',
  'KOTAKBANK.NS': 'Banking',     'LT.NS': 'Infrastructure',
  'LTIM.NS': 'IT',              'M&M.NS': 'Automobile',
  'MARUTI.NS': 'Automobile',     'NESTLEIND.NS': 'FMCG',
  'NTPC.NS': 'Power',           'ONGC.NS': 'Oil & Gas',
  'POWERGRID.NS': 'Power',       'RELIANCE.NS': 'Conglomerate',
  'SBILIFE.NS': 'Insurance',     'SBIN.NS': 'Banking',
  'SHRIRAMFIN.NS': 'Financial Services', 'SUNPHARMA.NS': 'Pharma',
  'TATACONSUM.NS': 'FMCG',      'TATAMOTORS.NS': 'Automobile',
  'TATASTEEL.NS': 'Metals',      'TCS.NS': 'IT',
  'TECHM.NS': 'IT',             'TITAN.NS': 'Consumer Goods',
  'TRENT.NS': 'Retail',         'ULTRACEMCO.NS': 'Cement & Materials',
};

export function getSector(symbol: string): string {
  return SECTOR_MAP[symbol as NiftySymbol] ?? 'Unknown';
}

// Always encode for URL usage — critical for M&M.NS
export const encodeSymbol = (s: string) => encodeURIComponent(s);
export const decodeSymbol = (s: string) => decodeURIComponent(s);
```

---

## Appendix B: API → Frontend Field Mapping

### Signal object

| API field | TypeScript type | Format | Display component |
|-----------|----------------|--------|------------------|
| `id` | `number` | — | Internal only |
| `symbol` | `string` | — | Link to `/stock/:symbol` |
| `date` | `string` | `formatDate()` | Text |
| `signal_type` | `'BUY' \| 'SELL'` | — | `SignalBadge` |
| `direction` | `'LONG' \| 'SHORT'` | — | `SignalBadge` |
| `confidence` | `number` | `formatConfidence()` | `ConfidenceBar` |
| `confidence_tier` | `ConfidenceTier \| null` | — | Tier badge in `ConfidenceBar` and `SignalCard` |
| `entry_price` | `number` | `formatINR()` | Text |
| `stop_loss` | `number` | `formatINR()` | Text |
| `target_price` | `number` | `formatINR()` | Text |
| `risk_reward` | `number` | `formatRR()` | Text |
| `shares_to_buy` | `number` | `formatShares()` | Text |
| `position_value` | `number` | `formatINR()` | Text |
| `capital_risk_inr` | `number` | `formatINR()` | Text |
| `reasons` | `string[]` | rendered as-is | Badge pills |
| `status` | `SignalStatus` | — | `StatusBadge` |
| `strategy_source` | `string` | display name map | Text |
| `is_favorite` | `boolean` | — | Star icon |
| `created_at` | `string` (ISO) | `formatDateTime()` | Text |
| `explanation` | `string[] \| null` | rendered as-is | `ExplainabilityPanel` sentences |
| `confidence_breakdown` | `ConfidenceBreakdown \| null` | — | `ConfidenceBreakdownBar` segmented bar |

### Rejected signal object

| API field | TypeScript type | Format | Display component |
|-----------|----------------|--------|------------------|
| `symbol` | `string` | — | Text |
| `date` | `string` | `formatDate()` | Text |
| `strategy_source` | `string` | display name map | Text |
| `reject_stage` | `RejectStage` | underscore to title case | Coloured pill |
| `reject_reason` | `string` | rendered as-is | Text |
| `raw_confidence` | `number \| null` | `formatConfidence()` | Text |
| `raw_rr` | `number \| null` | `formatRR()` | Text |

### Trade decision object

| API field | TypeScript type | Format | Display component |
|-----------|----------------|--------|------------------|
| `signal_id` | `number` | — | Internal |
| `decision` | `DecisionType` | — | Coloured pill (TAKEN=green, SKIPPED=grey, MODIFIED=amber) |
| `notes` | `string \| null` | rendered as-is | Text area |
| `actual_entry` | `number \| null` | `formatINR()` | Input field |
| `actual_qty` | `number \| null` | integer | Input field |
| `decided_at` | `string` | `formatDateTime()` | Text |

### Stock detail object

| API field | TypeScript type | Format | Notes |
|-----------|----------------|--------|-------|
| `symbol` | `string` | — | Header |
| `sector` | `string` | — | `SectorBadge` |
| `is_favorite` | `boolean` | — | Star toggle |
| `latest_candle.close` | `number` | `formatINR()` | |
| `latest_candle.volume` | `number` | `toLocaleString('en-IN')` | |
| `latest_candle.delivery_pct` | `number \| null` | `formatPct()` | NSE delivery percentage |
| `indicators.rsi` | `number \| null` | one decimal | + RSI zone badge |
| `indicators.macd_line` | `number \| null` | signed, 2 dec | |
| `indicators.atr` | `number \| null` | `formatINR()` | |
| `indicators.volume_change` | `number \| null` | `formatPct(v, true)` | |
| `features.is_uptrend` | `boolean` | — | Green/red pill |
| `features.rsi_zone` | `RsiZone` | — | Coloured pill |
| `features.is_ranging` | `boolean` | — | Indicator pill |
| `features.z_score_20d` | `number \| null` | signed, 2 dec | |
| `features.distance_from_52w_high_pct` | `number \| null` | `formatPct()` | |
| `features.relative_strength_vs_nifty` | `number \| null` | `formatPct(v, true)` | |
| `features.rvol` | `number \| null` | `(toNum(v) ?? 0).toFixed(2) + 'x'` | Numeric card |
| `features.volume_tier` | `VolumeTier \| null` | — | Coloured pill (LOW/NORMAL/HIGH/VERY_HIGH/EXTREME) |
| `features.vwap` | `number \| null` | `formatINR()` | Numeric card |
| `features.vwap_distance_pct` | `number \| null` | `formatPct(v, true)` | Signed %, green/red |
| `features.is_near_vwap` | `boolean` | — | Green "Near" / grey "Far" pill |
| `features.is_high_delivery` | `boolean` | — | Green "Yes" / grey "No" pill |
| `features.delivery_pct` | `number \| null` | `formatPct()` | Numeric card |

### Paper trade object

| API field | TypeScript type | Format | Notes |
|-----------|----------------|--------|-------|
| `direction` | `SignalDirection` | — | `SignalBadge` |
| `pnl_pct` | `number \| null` | `formatPct(v, true)` | Green/red |
| `gross_pnl_inr` | `number \| null` | `formatINR()` | Show "—" if null |
| `exit_reason` | `ExitReason \| null` | — | `StatusBadge`, "—" if null |
| `status` | `TradeStatus` | — | `StatusBadge` |

