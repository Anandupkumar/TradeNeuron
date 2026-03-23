import { LoadingSkeleton } from '../LoadingSkeleton';
import { renderWithProviders } from '@/test/test-utils';

describe('LoadingSkeleton', () => {
  it('renders the correct number of skeleton items (count=3 should have 3 child divs)', () => {
    const { container } = renderWithProviders(
      <LoadingSkeleton variant="card" count={3} />,
    );
    const root = container.firstElementChild;
    expect(root?.childElementCount).toBe(3);
  });

  it("renders without crashing for each variant: 'card', 'table-row', 'chart', 'text'", () => {
    const variants = ['card', 'table-row', 'chart', 'text'] as const;
    for (const variant of variants) {
      const { container } = renderWithProviders(<LoadingSkeleton variant={variant} />);
      expect(container.firstElementChild).toBeTruthy();
    }
  });
});
