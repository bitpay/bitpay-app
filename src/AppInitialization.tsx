import React, {useEffect} from 'react';
import {startMigrationMMKVStorage} from './store/wallet/effects';
import {useAppDispatch, useAppSelector} from './utils/hooks';

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
  }, []);

  if (!migrationMMKVStorageComplete) {
    return <></>;
  }

  return children;
};
