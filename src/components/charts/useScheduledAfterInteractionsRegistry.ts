import {useCallback, useRef} from 'react';
import type {ScheduledAfterInteractionsHandle} from '../../utils/scheduleAfterInteractionsAndFrames';

export const useScheduledAfterInteractionsRegistry = () => {
  const scheduledHandlesRef = useRef<Set<ScheduledAfterInteractionsHandle>>(
    new Set(),
  );

  const cancelAllScheduledWork = useCallback(() => {
    for (const handle of scheduledHandlesRef.current) {
      handle.cancel();
    }
    scheduledHandlesRef.current.clear();
  }, []);

  const trackScheduledHandle = useCallback(
    (handle: ScheduledAfterInteractionsHandle) => {
      scheduledHandlesRef.current.add(handle);
      void handle.done.finally(() => {
        scheduledHandlesRef.current.delete(handle);
      });
    },
    [],
  );

  const removeScheduledHandle = useCallback(
    (handle: ScheduledAfterInteractionsHandle | undefined, cancel = false) => {
      if (!handle) {
        return;
      }

      scheduledHandlesRef.current.delete(handle);
      if (cancel) {
        handle.cancel();
      }
    },
    [],
  );

  return {
    cancelAllScheduledWork,
    trackScheduledHandle,
    removeScheduledHandle,
  };
};
