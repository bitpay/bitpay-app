import RNFS from 'react-native-fs';
import {reduxStorage, storage} from './index';
import {backupPersistRoot} from './backup/fs-backup';
import {activateVaultStorage, isVaultActive} from './vault-storage';

it('gates ordinary root, restore, removal and backup writers before activation', async () => {
  expect(isVaultActive()).toBe(false);
  const set = jest.spyOn(storage, 'set');
  const get = jest.spyOn(storage, 'getString');
  await expect(reduxStorage.setItem('persist:root', '{}')).rejects.toThrow();
  expect(() => reduxStorage.getItem('persist:root')).toThrow();
  expect(() => reduxStorage.removeItem('persist:root')).toThrow();
  expect(() => backupPersistRoot('{}')).toThrow();
  expect(set).not.toHaveBeenCalled();
  expect(get).not.toHaveBeenCalled();
  expect(RNFS.writeFile).not.toHaveBeenCalled();
});

it('retains ordinary empty-root behavior after activation with no modern backup', async () => {
  activateVaultStorage();
  (RNFS.exists as jest.Mock).mockResolvedValue(false);
  expect((await reduxStorage.getItem('persist:root')) === null).toBe(true);
  expect(storage.getAllKeys()).toHaveLength(0);
});
