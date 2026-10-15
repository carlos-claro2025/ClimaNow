import { Bell } from 'lucide-react';
import { notificationService, type Alert } from '../services/NotificationService';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(() => notificationService.getAlerts());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return notificationService.subscribe(setAlerts);
  }, []);

  const close = () => {
    setOpen(false);
    bellRef.current?.focus();
  };

  // Close the panel on outside click or Escape while it is open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const handleAlertClick = (alert: Alert) => {
    if (!alert.read) notificationService.markAsRead(alert.id);
    if (alert.link) navigate(alert.link);
    close();
  };

  return (
    <div className="bell-wrapper" ref={wrapperRef}>
      <button
        ref={bellRef}
        type="button"
        className="chip bell-btn"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      <span className="sr-only" role="status">
        {unreadCount > 0 ? `${unreadCount} notificações não lidas` : ''}
      </span>

      {open && (
        <div className="bell-dropdown" role="dialog" aria-label="Central de notificações">
          <div className="bell-dropdown-header">
            <strong>Notificações</strong>
            <span className="bell-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="bell-mark-all"
                  onClick={() => notificationService.markAllAsRead()}
                >
                  Marcar todas como lidas
                </button>
              )}
              {alerts.length > 0 && (
                <button
                  type="button"
                  className="bell-mark-all"
                  onClick={() => notificationService.clearAll()}
                >
                  Limpar tudo
                </button>
              )}
            </span>
          </div>

          {alerts.length === 0 ? (
            <p className="bell-empty">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="bell-list">
              {alerts.map(alert => (
                <li key={alert.id}>
                  <button
                    type="button"
                    className={`bell-item${alert.read ? '' : ' unread'}`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <span className="bell-item-dot" aria-hidden="true" />
                    <span className="bell-item-content">
                      <span className="bell-item-title">{alert.title}</span>
                      <span className="bell-item-desc">{alert.description}</span>
                      <span className="bell-item-time">{timeFormatter.format(alert.timestamp)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}