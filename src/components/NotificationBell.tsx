import { Bell } from 'lucide-react';
import { notificationService } from '../services/NotificationService';
import { useEffect, useState } from 'react';

interface NotificationBellProps {
  onBellClick?: () => void;
}

export default function NotificationBell({ onBellClick }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(() =>
    notificationService.getUnreadCount()
  );

  useEffect(() => {
    return notificationService.subscribe(() => {
      setUnreadCount(notificationService.getUnreadCount());
    });
  }, []);

  const handleClick = () => {
    if (onBellClick) {
      onBellClick();
    }
  };

  return (
    <button 
      className="chip bell-btn" 
      onClick={handleClick}
      style={{ position: 'relative', padding: '8px' }}
      aria-label="Notificações"
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span 
          className="notification-badge"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}
