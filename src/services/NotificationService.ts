export interface Alert {
  id: string;
  title: string;
  description: string;
  link?: string;
  /** Stable identity used to avoid re-alerting for the same ongoing condition. */
  dedupeKey?: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = 'clima-alerts';
const MAX_ALERTS = 50;
/** Same condition inside this window does not generate a new alert/notification. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

function isAlert(value: unknown): value is Alert {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.description === 'string' &&
    typeof a.timestamp === 'number' &&
    typeof a.read === 'boolean'
  );
}

class NotificationService {
  private static instance: NotificationService;
  private alerts: Alert[] = [];
  private listeners: ((alerts: Alert[]) => void)[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.alerts = parsed
        .filter(isAlert)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_ALERTS);
    } catch {
      this.alerts = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
    } catch {
      // Storage unavailable (private mode/quota): keep the queue in memory only.
    }
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public getUnreadCount(): number {
    return this.alerts.filter(a => !a.read).length;
  }

  public addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'read'>): void {
    const key = alert.dedupeKey ?? alert.title;
    const isDuplicate = this.alerts.some(
      a => (a.dedupeKey ?? a.title) === key && Date.now() - a.timestamp < DEDUPE_WINDOW_MS,
    );
    if (isDuplicate) return;

    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
    };
    this.alerts = [newAlert, ...this.alerts].slice(0, MAX_ALERTS);
    this.persist();
    this.notifyListeners();
    this.sendBrowserNotification(newAlert);
  }

  public markAsRead(id: string): void {
    this.alerts = this.alerts.map(a => (a.id === id ? { ...a, read: true } : a));
    this.persist();
    this.notifyListeners();
  }

  public markAllAsRead(): void {
    this.alerts = this.alerts.map(a => ({ ...a, read: true }));
    this.persist();
    this.notifyListeners();
  }

  public dismissAlert(id: string): void {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.persist();
    this.notifyListeners();
  }

  public clearAll(): void {
    this.alerts = [];
    this.persist();
    this.notifyListeners();
  }

  private sendBrowserNotification(alert: Alert): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification(`[ClimaNow] ${alert.title}`, {
        body: alert.description,
        icon: '/favicon.ico',
        // Stable tag per condition so the OS replaces the previous notification
        // instead of stacking a new one on every auto-refresh.
        tag: `weather-alert-${alert.dedupeKey ?? alert.title}`,
        dir: 'ltr',
        lang: 'pt-BR',
      });
    } catch {
      // Some browsers throw when the OS blocks notifications; ignore.
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getAlerts()));
  }

  public subscribe(listener: (alerts: Alert[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const notificationService = NotificationService.getInstance();