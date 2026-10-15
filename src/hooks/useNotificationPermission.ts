import { useState } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') {
      return 'default';
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const checkPermission = () => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  };

  return {
    permission,
    requestPermission,
    checkPermission,
    isSupported: typeof Notification !== 'undefined',
  };
}
