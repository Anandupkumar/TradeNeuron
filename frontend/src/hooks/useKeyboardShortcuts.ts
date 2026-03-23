import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      switch (e.key) {
        case 'd':
          navigate('/');
          break;
        case 's':
          navigate('/signals');
          break;
        case 'w':
          navigate('/watchlist');
          break;
        case 'p':
          navigate('/paper-trading');
          break;
        case 'b':
          navigate('/backtest');
          break;
        case ',':
          navigate('/settings');
          break;
        case '/':
          e.preventDefault();
          document.getElementById('symbol-search')?.focus();
          break;
        case 'f':
          window.dispatchEvent(new CustomEvent('tn:toggle-filters'));
          break;
        case 'Escape':
          window.dispatchEvent(new CustomEvent('tn:close-overlay'));
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
