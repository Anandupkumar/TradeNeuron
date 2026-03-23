import { Navigate } from 'react-router-dom';
import { useIdentityStore } from '../../store/identity.store';

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const api_key = useIdentityStore((s) => s.apiKey);
  if (!api_key) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}
