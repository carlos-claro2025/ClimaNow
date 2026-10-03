import { useEffect, useState } from 'react';

const EMPTY = '--:--:--';

// Own component so the once-a-second tick re-renders only this node. Holding the
// clock in WeatherPage state re-rendered the whole page every second, which
// restarted the INMET ticker animation and re-rendered the forecast cards.
export default function Clock() {
  const [time, setTime] = useState<string>(EMPTY);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}