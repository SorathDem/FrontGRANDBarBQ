import { useCallback, useEffect, useRef, useState } from 'react';

export type AlertTone = 'error' | 'warn' | 'success' | 'info';

export interface AlertState {
  message: string;
  tone: AlertTone;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const clear = useCallback(() => {
    clearTimer();
    setAlert(null);
  }, [clearTimer]);

  const show = useCallback(
    (message: string, tone: AlertTone = 'error', timeoutMs?: number) => {
      clearTimer();
      setAlert({ message, tone });

      if (timeoutMs !== undefined && timeoutMs > 0) {
        timerRef.current = window.setTimeout(() => {
          setAlert(null);
          timerRef.current = undefined;
        }, timeoutMs);
      }
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { alert, show, clear };
}
