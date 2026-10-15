import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import type { notificationService as NotificationServiceType } from './NotificationService';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

// Installed before the service module is evaluated so the singleton can persist.
const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
  writable: true,
});

let service: typeof NotificationServiceType;

beforeAll(async () => {
  service = (await import('./NotificationService')).notificationService;
});

describe('NotificationService', () => {
  beforeEach(() => {
    service.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds an alert with id, timestamp and unread state', () => {
    service.addAlert({ title: 'Chuva Intensa', description: 'Chuva intensa esperada' });
    const alerts = service.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Chuva Intensa');
    expect(alerts[0].read).toBe(false);
    expect(alerts[0].id).toBeTruthy();
    expect(alerts[0].timestamp).toBeGreaterThan(0);
    expect(service.getUnreadCount()).toBe(1);
  });

  it('ignores duplicate alerts for the same condition inside the window', () => {
    service.addAlert({ title: 'Tempestade', description: 'a', dedupeKey: 'sp|Tempestade' });
    service.addAlert({ title: 'Tempestade', description: 'b', dedupeKey: 'sp|Tempestade' });
    expect(service.getAlerts()).toHaveLength(1);
  });

  it('allows the same condition again after the dedupe window', () => {
    vi.useFakeTimers();
    service.addAlert({ title: 'Tempestade', description: 'a', dedupeKey: 'sp|Tempestade' });
    vi.advanceTimersByTime(31 * 60 * 1000);
    service.addAlert({ title: 'Tempestade', description: 'a', dedupeKey: 'sp|Tempestade' });
    expect(service.getAlerts()).toHaveLength(2);
  });

  it('treats different dedupe keys as different conditions', () => {
    service.addAlert({ title: 'Tempestade', description: 'a', dedupeKey: 'sp|Tempestade' });
    service.addAlert({ title: 'Tempestade', description: 'a', dedupeKey: 'rio|Tempestade' });
    expect(service.getAlerts()).toHaveLength(2);
  });

  it('falls back to the title as dedupe key', () => {
    service.addAlert({ title: 'Vento Forte', description: 'a' });
    service.addAlert({ title: 'Vento Forte', description: 'b' });
    expect(service.getAlerts()).toHaveLength(1);
  });

  it('marks one and all alerts as read', () => {
    service.addAlert({ title: 'A', description: 'a' });
    service.addAlert({ title: 'B', description: 'b' });
    const [first] = service.getAlerts();
    service.markAsRead(first.id);
    expect(service.getUnreadCount()).toBe(1);
    service.markAllAsRead();
    expect(service.getUnreadCount()).toBe(0);
  });

  it('dismisses and clears alerts', () => {
    service.addAlert({ title: 'A', description: 'a' });
    service.addAlert({ title: 'B', description: 'b' });
    const [first] = service.getAlerts();
    service.dismissAlert(first.id);
    expect(service.getAlerts()).toHaveLength(1);
    service.clearAll();
    expect(service.getAlerts()).toHaveLength(0);
  });

  it('persists alerts to localStorage', () => {
    service.addAlert({ title: 'Chuva Forte', description: '12.3 mm' });
    const raw = storage.getItem('clima-alerts');
    expect(raw).toBeTruthy();
    const parsed: unknown = JSON.parse(raw as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect((parsed as { title: string }[])[0].title).toBe('Chuva Forte');
  });

  it('caps the queue at 50 alerts, keeping the newest', () => {
    for (let i = 0; i < 55; i++) {
      service.addAlert({ title: `Alerta ${i}`, description: 'x' });
    }
    const alerts = service.getAlerts();
    expect(alerts).toHaveLength(50);
    expect(alerts[0].title).toBe('Alerta 54');
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const seen: number[] = [];
    const unsubscribe = service.subscribe(alerts => seen.push(alerts.length));
    service.addAlert({ title: 'A', description: 'a' });
    unsubscribe();
    service.addAlert({ title: 'B', description: 'b' });
    expect(seen).toEqual([1]);
  });
});
