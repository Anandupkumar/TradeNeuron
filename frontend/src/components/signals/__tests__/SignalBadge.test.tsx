import { screen } from '@testing-library/react';
import { SignalBadge } from '../SignalBadge';
import { renderWithProviders } from '@/test/test-utils';

describe('SignalBadge', () => {
  it('renders "BUY" text for signal_type="BUY"', () => {
    renderWithProviders(<SignalBadge signal_type="BUY" />);
    expect(screen.getByText('BUY')).toBeInTheDocument();
  });

  it('renders "SELL" text for signal_type="SELL"', () => {
    renderWithProviders(<SignalBadge signal_type="SELL" />);
    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(
      <SignalBadge signal_type="BUY" direction="LONG" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
