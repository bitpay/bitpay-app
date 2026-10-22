let activePersistor: {flush: () => Promise<any>; pause: () => void} | null =
  null;
let persistWriteError: unknown;
let persistReadError: unknown;

export const setActivePersistor = (persistor: {
  flush: () => Promise<any>;
  pause: () => void;
}): void => {
  activePersistor = persistor;
  persistWriteError = undefined;
  persistReadError = undefined;
};

export const pausePersistor = (error: unknown): void => {
  persistReadError = error;
  activePersistor?.pause();
};

export const reportPersistWriteError = (error: unknown): void => {
  persistWriteError = error;
};

export const flushPersistor = async (): Promise<void> => {
  if (persistReadError !== undefined) {
    throw persistReadError;
  }
  if (!activePersistor) {
    throw new Error('Persistor is not initialized');
  }

  const previousWriteError = persistWriteError;
  persistWriteError = undefined;

  await activePersistor.flush();

  if (persistReadError !== undefined) {
    throw persistReadError;
  }
  const error =
    persistWriteError !== undefined ? persistWriteError : previousWriteError;
  persistWriteError = undefined;
  if (error !== undefined) {
    throw error;
  }
};
