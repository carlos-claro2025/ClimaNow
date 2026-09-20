import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'clima-theme';

const normalize = (value) => (value === 'claro' ? 'claro' : 'escuro');

function readInitialTheme(urlTheme) {
  let stored = '';
  try {
    stored = localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    /* localStorage indisponível (modo privado) */
  }
  // URL wins when present so shared links keep their intent; otherwise fall back
  // to the stored preference before the dark default.
  return normalize(urlTheme || stored || 'escuro');
}

export function useTheme() {
  const [params, setParams] = useSearchParams();
  const [theme, setTheme] = useState(() => readInitialTheme(params.get('tema')));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage indisponível (modo privado) */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'claro' ? 'escuro' : 'claro';
    setTheme(next);
    // Written from the toggle only. An effect that mirrored `theme` into the URL on
    // every params change made this a second writer of ?cidade=/?tema=, resolving
    // against a stale snapshot and reverting the other one — which is what made the
    // page thrash between two cities.
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tema', next);
        return p;
      },
      { replace: true },
    );
  }, [theme, setParams]);

  return { theme, toggle };
}
