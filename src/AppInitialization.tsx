import React, {useEffect} from 'react';
import {startMigrationMMKVStorage} from './store/wallet/effects';
import {useAppDispatch, useAppSelector} from './utils/hooks';
import {mark} from './perf/PerfMonitor';

export const AppInitialization = ({children}: {children: React.ReactNode}) => {
  const dispatch = useAppDispatch();
  const migrationMMKVStorageComplete = useAppSelector(
    ({APP}) => APP.migrationMMKVStorageComplete,
  );

  useEffect(() => {
    const initializeApp = async () => {
      if (!migrationMMKVStorageComplete) {
        await dispatch(startMigrationMMKVStorage());
      }
    };
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; the migration flag is only checked at startup
  }, [dispatch]);

  // The MMKV migration gate blocks the whole tree, so the moment it opens is a
  // distinct startup phase worth attributing separately. Marked in an effect
  // rather than during render so re-renders don't emit duplicate entries.
  useEffect(() => {
    if (migrationMMKVStorageComplete) {
      mark('bp_app_initialized');
    }
  }, [migrationMMKVStorageComplete]);

  if (!migrationMMKVStorageComplete) {
    return <></>;
  }

  return children;
};
