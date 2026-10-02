import { useCallback, useEffect, useState } from 'react';
import { INMET_OFFLINE, fetchInmetWarnings, fetchRss, normalizeWarning } from './clima';

// Shared by WeatherPage and RainPage: both fetch the INMET warnings and RSS
// ticker, refresh on demand, and open the first entry in a modal. Before this
// hook, each page carried its own copy of that logic, so a bug fixed in one
// stayed unfixed in the other.
export function useInmetAlerts() {
  const [warnings, setWarnings] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [selectedWarning, setSelectedWarning] = useState(null);

  const loadWarnings = useCallback(async (signal) => {
    try {
      const list = await fetchInmetWarnings(signal);
      if (!signal?.aborted) setWarnings(list);
    } catch {
      if (!signal?.aborted) setWarnings([INMET_OFFLINE]);
    }
  }, []);

  const loadTicker = useCallback(async (signal) => {
    try {
      const list = await fetchRss(signal);
      if (!signal?.aborted) setTicker(list);
    } catch {
      if (!signal?.aborted) setTicker([]);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      await Promise.all([loadWarnings(signal), loadTicker(signal)]);
    })();
    return () => controller.abort();
  }, [loadWarnings, loadTicker]);

  const refresh = useCallback(() => {
    loadWarnings();
    loadTicker();
  }, [loadWarnings, loadTicker]);

  const openWarning = useCallback(() => {
    if (ticker.length > 0) {
      setSelectedWarning(normalizeWarning(ticker[0]));
      return;
    }
    if (warnings.length > 0) {
      setSelectedWarning(normalizeWarning(warnings[0]));
      return;
    }
    window.open('https://avisos.inmet.gov.br/', '_blank', 'noopener,noreferrer');
  }, [warnings, ticker]);

  return {
    warnings,
    ticker,
    selectedWarning,
    setSelectedWarning,
    refresh,
    openWarning,
  };
}
