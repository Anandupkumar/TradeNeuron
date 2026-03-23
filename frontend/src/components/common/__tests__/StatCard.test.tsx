import { screen } from '@testing-library/react';
import { StatCard } from '../StatCard';
import { renderWithProviders } from '@/test/test-utils';

describe('StatCard', () => {
  it('renders label and value', () => {
    renderWithProviders(<StatCard label="Total PnL" value="12.5%" />);
    expect(screen.getByText('Total PnL')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('renders sub_text when provided', () => {
    const sub_text = 'vs last week';
    renderWithProviders(<StatCard label="L" value={1} sub_text={sub_text} />);
    expect(screen.getByText(sub_text)).toBeInTheDocument();
  });

  it('does not render sub_text when not provided', () => {
    const { container } = renderWithProviders(<StatCard label="Label only" value={42} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]).toHaveTextContent('Label only');
  });

  it("renders with trend='up' without crashing", () => {
    const { container } = renderWithProviders(
      <StatCard label="Up" value={1} trend="up" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders with trend='down' without crashing", () => {
    const { container } = renderWithProviders(
      <StatCard label="Down" value={1} trend="down" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
