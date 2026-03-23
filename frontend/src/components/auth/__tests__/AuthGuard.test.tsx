import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '../AuthGuard';
import { useIdentityStore } from '../../../store/identity.store';

describe('AuthGuard', () => {
  beforeEach(() => {
    useIdentityStore.setState({ apiKey: '' });
  });

  it('redirects to /setup when apiKey is empty', () => {
    useIdentityStore.setState({ apiKey: '' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/setup" element={<div>Setup Page</div>} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>Dashboard</div>
              </AuthGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Setup Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders children when apiKey is set', () => {
    useIdentityStore.setState({ apiKey: 'test-key' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/setup" element={<div>Setup Page</div>} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>Dashboard</div>
              </AuthGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Setup Page')).not.toBeInTheDocument();
  });
});
