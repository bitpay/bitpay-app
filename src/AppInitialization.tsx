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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: adding the missing deps would change this effect’s existing behaviour
  }, []);

  if (!migrationMMKVStorageComplete) {
    return <></>;
  }

  return children;
};
