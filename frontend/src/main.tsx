import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';
import { useThemeStore } from './store/theme.store';
import { Toaster } from 'react-hot-toast';
import { RootErrorBoundary } from './components/errors/RootErrorBoundary';

const query_client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Root() {
  const theme = useThemeStore((s) => s.theme);
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <React.StrictMode>
      <RootErrorBoundary>
        <QueryClientProvider client={query_client}>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#18181b', color: '#fafafa', border: '1px solid #27272a' },
            }}
          />
          {import.meta.env.DEV && (
            <React.Suspense fallback={null}>
              <DevTools />
            </React.Suspense>
          )}
        </QueryClientProvider>
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

const DevTools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
