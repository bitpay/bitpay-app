import {Effect} from '../../../index';
import {Key} from '../../wallet.models';
import {setCloudBackupComplete} from '../../wallet.actions';
import {normalizeMnemonic, startImportMnemonic} from '../import/import';
import {BwcProvider} from '../../../../lib/bwc';
import {encryptCloudBackup} from '../../../../utils/cloud-backup/codec';
import {
  connectToCloud,
  deleteCloudBackupFiles,
  getCloudBackupFileName,
  saveCloudBackupFile,
} from '../../../../utils/cloud-backup/storage';

const BWC = BwcProvider.getInstance();
const Errors = BWC.getErrors();

export const isMissingWalletsError = (err: unknown): boolean =>
  err instanceof Errors.WALLET_DOES_NOT_EXIST ||
  (err instanceof Error && err.message === 'WALLET_DOES_NOT_EXIST');

export const startCloudBackup =
  ({
    key,
    words,
    password,
    revokeOlder = false,
  }: {
    key: Key;
    words: string[];
    password: string;
    revokeOlder?: boolean;
  }): Effect<Promise<void>> =>
  async dispatch => {
    await connectToCloud();
    const createdAt = Date.now();
    const fingerPrint = key.properties?.fingerPrint || '';
    const keyRef = fingerPrint || key.id;
    const name = getCloudBackupFileName(createdAt, keyRef);
    const contents = await encryptCloudBackup(
      {keyId: key.id, fingerPrint, createdAt},
      {
        mnemonic: words.join(' '),
        keyName: key.keyName || '',
        ...(key.properties?.mnemonicHasPassphrase
          ? {mnemonicHasPassphrase: true as const}
          : {}),
      },
      password,
    );
    await saveCloudBackupFile(name, contents);
    dispatch(setCloudBackupComplete({keyId: key.id, timestamp: createdAt}));
    if (revokeOlder) {
      await deleteCloudBackupFiles(keyRef, name);
    }
  };

export const isKeyPassphrase = (
  mnemonic: string,
  passphrase: string,
  fingerPrint: string,
): boolean =>
  BWC.createKey({
    seedType: 'mnemonic',
    seedData: normalizeMnemonic(mnemonic),
    passphrase,
  }).fingerPrint === fingerPrint;

export const startRestoreRecoveryPhrase =
  (mnemonic: string, passphrase?: string): Effect<Promise<Key>> =>
  async dispatch =>
    (await dispatch<any>(
      startImportMnemonic(
        {words: mnemonic},
        {
          includeTestnetWallets: true,
          includeLegacyWallets: true,
          ...(passphrase ? {passphrase} : {}),
        },
      ),
    )) as Key;
