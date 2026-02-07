import { useEffect, useState } from 'react';
import { formatDuration } from '@/helpers/utilities';

type OrderDurationProps = {
  startTime: string | number | Date | undefined;
  endTime?: string | number | Date | undefined;
};

export default function OrderDuration({ startTime, endTime }: OrderDurationProps) {
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    if (!startTime) {
      setDuration('0:00');
      return;
    }

    const start = new Date(startTime).getTime();
    if (Number.isNaN(start)) {
      setDuration('0:00');
      return;
    }

    // If we have an endTime, it's a static duration (delivered order)
    if (endTime) {
      const end = new Date(endTime).getTime();
      if (!Number.isNaN(end)) {
        setDuration(formatDuration(end - start));
      }
      return;
    }

    // Dynamic duration (active order) updates every second
    const update = () => {
      const now = Date.now();
      setDuration(formatDuration(now - start));
    };

    update(); // Initial update
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return <>{duration}</>;
}
