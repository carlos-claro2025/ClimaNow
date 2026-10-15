export interface Alert {
  id: string;
  title: string;
  description: string;
  link?: string;
  timestamp: number;
  read: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private alerts: Alert[] = [];
  private listeners: ((alerts: Alert[]) => void)[] = [];

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public getUnreadCount(): number {
    return this.alerts.filter(a => !a.read).length;
  }

  public addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'read'>): void {
    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
    };
    this.alerts.unshift(newAlert);
    this.notifyListeners();
    this.sendBrowserNotification(newAlert);
  }

  public markAsRead(id: string): void {
    this.alerts = this.alerts.map(a => 
      a.id === id ? { ...a, read: true } : a
    );
    this.notifyListeners();
  }

  public markAllAsRead(): void {
    this.alerts = this.alerts.map(a => ({ ...a, read: true }));
    this.notifyListeners();
  }

  private sendBrowserNotification(alert: Alert): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        console.log('Creating notification with title:', alert.title, 'and body:', alert.description); // Debug
        new Notification(`[ClimaNow] ${alert.title}`, {
          body: alert.description,
          icon: '/favicon.ico',
          tag: `weather-alert-${alert.id}`,
          dir: 'ltr',
          lang: 'pt-BR',
        });
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
