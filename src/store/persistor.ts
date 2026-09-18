// Kept apart from the store index so importing it does not pull in MMKV.
let activePersistor: {flush: () => Promise<any>} | null = null;

export const setActivePersistor = (persistor: {
  flush: () => Promise<any>;
}): void => {
  activePersistor = persistor;
};

export const flushPersistor = async (): Promise<void> => {
  await activePersistor?.flush();
};
