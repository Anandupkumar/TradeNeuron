import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddFavorite, useFavorites, useRemoveFavorite } from '../useFavorites';
import { createHookWrapper, renderWithProviders } from '../../test/test-utils';
import { favoritesApi } from '../../api/favorites.api';
import { mockFavorite, mockFavoritesResponse } from '../../mocks/fixtures';

vi.mock('../../api/favorites.api', () => ({
  favoritesApi: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useFavorites', () => {
  beforeEach(() => {
    vi.mocked(favoritesApi.list).mockResolvedValue(mockFavoritesResponse);
  });

  it('returns favorites data after loading', async () => {
    const { result } = renderHook(() => useFavorites(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFavoritesResponse);
  });
});

function TestAddFavoriteComponent() {
  const favorites_query = useFavorites();
  const add_mutation = useAddFavorite();
  return (
    <div>
      <span data-testid="status">{favorites_query.isSuccess ? 'loaded' : 'loading'}</span>
      <button type="button" onClick={() => add_mutation.mutate({ symbol: 'INFY.NS' })}>
        Add
      </button>
    </div>
  );
}

function TestRemoveFavoriteComponent() {
  const favorites_query = useFavorites();
  const remove_mutation = useRemoveFavorite();
  return (
    <div>
      <span data-testid="status">{favorites_query.isSuccess ? 'loaded' : 'loading'}</span>
      <button type="button" onClick={() => remove_mutation.mutate('RELIANCE.NS')}>
        Remove
      </button>
    </div>
  );
}

describe('useAddFavorite', () => {
  beforeEach(() => {
    vi.mocked(favoritesApi.list).mockResolvedValue(mockFavoritesResponse);
    vi.mocked(favoritesApi.add).mockResolvedValue(mockFavorite);
  });

  it('calls favoritesApi.add on mutate', async () => {
    renderWithProviders(<TestAddFavoriteComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loaded');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(favoritesApi.add).toHaveBeenCalledWith('INFY.NS', undefined);
    });
  });
});

describe('useRemoveFavorite', () => {
  beforeEach(() => {
    vi.mocked(favoritesApi.list).mockResolvedValue(mockFavoritesResponse);
    vi.mocked(favoritesApi.remove).mockResolvedValue({
      removed: true,
      symbol: 'RELIANCE.NS',
    });
  });

  it('calls favoritesApi.remove on mutate', async () => {
    renderWithProviders(<TestRemoveFavoriteComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('loaded');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(favoritesApi.remove).toHaveBeenCalledWith('RELIANCE.NS');
    });
  });
});
