import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface WrapperOptions {
  route?: string;
}

function createWrapper({ route = '/' }: WrapperOptions = {}) {
  const query_client = createTestQueryClient();
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={query_client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & WrapperOptions = {},
) {
  const { route, ...render_options } = options;
  return render(ui, { wrapper: createWrapper({ route }), ...render_options });
}

export function createHookWrapper(options: WrapperOptions = {}) {
  return createWrapper(options);
}

export { createTestQueryClient };
