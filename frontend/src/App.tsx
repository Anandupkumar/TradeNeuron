import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { ApiKeySetupScreen } from './components/auth/ApiKeySetupScreen';
import { AppShell } from './components/layout/AppShell';
import { FEATURES } from './utils/constants';
import { LoadingSkeleton } from './components/common/LoadingSkeleton';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Signals = React.lazy(() => import('./pages/Signals'));
const StockDetailPage = React.lazy(() => import('./pages/StockDetail'));
const PaperTrading = React.lazy(() => import('./pages/PaperTrading'));
const Backtest = React.lazy(() => import('./pages/Backtest'));
const Watchlist = React.lazy(() => import('./pages/Watchlist'));
const Settings = React.lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="p-6">
      <LoadingSkeleton variant="card" count={3} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<ApiKeySetupScreen />} />
        <Route element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route index element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
          <Route path="/signals" element={<Suspense fallback={<PageFallback />}><Signals /></Suspense>} />
          <Route path="/stock/:symbol" element={<Suspense fallback={<PageFallback />}><StockDetailPage /></Suspense>} />
          <Route path="/watchlist" element={<Suspense fallback={<PageFallback />}><Watchlist /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
          <Route
            path="/paper-trading"
            element={FEATURES.paperTrading ? <Suspense fallback={<PageFallback />}><PaperTrading /></Suspense> : <Navigate to="/" replace />}
          />
          <Route
            path="/backtest"
            element={FEATURES.backtest ? <Suspense fallback={<PageFallback />}><Backtest /></Suspense> : <Navigate to="/" replace />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
