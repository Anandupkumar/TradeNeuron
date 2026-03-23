import { fireEvent, screen } from '@testing-library/react';
import { ErrorState } from '../ErrorState';
import { renderWithProviders } from '@/test/test-utils';

describe('ErrorState', () => {
  it('renders default message "Something went wrong"', () => {
    renderWithProviders(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    const custom_message = 'Network timeout';
    renderWithProviders(<ErrorState message={custom_message} />);
    expect(screen.getByText(custom_message)).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const on_retry = () => {};
    renderWithProviders(<ErrorState onRetry={on_retry} />);
    expect(screen.queryByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does NOT render retry button when onRetry is not provided', () => {
    renderWithProviders(<ErrorState />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', () => {
    const on_retry = vi.fn();
    renderWithProviders(<ErrorState onRetry={on_retry} />);
    const btn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(btn);
    expect(on_retry).toHaveBeenCalledTimes(1);
  });
});
