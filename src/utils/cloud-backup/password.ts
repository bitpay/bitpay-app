import {
  CloudBackupPayload,
  InvalidCloudBackupError,
  WrongCloudBackupPasswordError,
  decryptCloudBackup,
} from './codec';
import {BwcProvider} from '../../lib/bwc';
import {
  CloudBackupError,
  CloudBackupFileEntry,
  getCloudBackupGroupId,
  listCloudBackups,
  readCloudBackupFile,
} from './storage';

export type CloudBackupPasswordCheck = 'match' | 'wrong' | 'none';

const readBackupCopy = async (name: string): Promise<string | undefined> => {
  try {
    return await readCloudBackupFile(name);
  } catch (err) {
    if (err instanceof CloudBackupError && err.reason === 'unknown') {
      return undefined;
    }
    throw err;
  }
};

export const checkCloudBackupPassword = async (
  password: string,
  keyRef: string,
): Promise<CloudBackupPasswordCheck> => {
  const groupId = getCloudBackupGroupId(keyRef);
  const files =
    (await listCloudBackups()).find(
      group => group.kind === 'phrase' && group.groupId === groupId,
    )?.files || [];
  let unreadable = false;
  for (const {name} of files) {
    const text = await readBackupCopy(name);
    if (text === undefined) {
      unreadable = true;
      continue;
    }
    try {
      await decryptCloudBackup(text, password);
      return 'match';
    } catch (err) {
      if (err instanceof WrongCloudBackupPasswordError) {
        return 'wrong';
      }
      if (!(err instanceof InvalidCloudBackupError)) {
        throw err;
      }
    }
  }
  if (unreadable) {
    throw new CloudBackupError('unknown');
  }
  return 'none';
};

export const decryptNewestCloudBackup = async (
  files: CloudBackupFileEntry[],
  password: string,
): Promise<{text: string; payload: CloudBackupPayload} | undefined> => {
  let wrongPassword = false;
  let unreadable = false;
  for (const {name} of files) {
    const text = await readBackupCopy(name);
    if (text === undefined) {
      unreadable = true;
      continue;
    }
    try {
      return {text, payload: await decryptCloudBackup(text, password)};
    } catch (err) {
      if (err instanceof WrongCloudBackupPasswordError) {
        wrongPassword = true;
      } else if (!(err instanceof InvalidCloudBackupError)) {
        throw err;
      }
    }
  }
  if (wrongPassword) {
    throw new WrongCloudBackupPasswordError();
  }
  if (unreadable) {
    throw new CloudBackupError('unknown');
  }
  return undefined;
};

export const KEYSHARE_PBKDF2_ITERATIONS = 600_000;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const isKeyshareEnvelope = (value: unknown) => {
  const envelope = (value || {}) as Record<string, unknown>;
  return (
    envelope.cipher === 'aes' &&
    envelope.mode === 'gcm' &&
    envelope.ks === 256 &&
    envelope.ts === 128 &&
    envelope.iter === KEYSHARE_PBKDF2_ITERATIONS &&
    ['salt', 'iv', 'ct'].every(
      field => typeof envelope[field] === 'string' && envelope[field] !== '',
    )
  );
};

export const decryptCloudKeyshare = async (
  files: CloudBackupFileEntry[],
  password: string,
): Promise<string> => {
  const encryption = BwcProvider.getInstance().getEncryption();
  let wrongPassword = false;
  let unreadable = false;
  for (const {name} of files) {
    const text = await readBackupCopy(name);
    if (text === undefined) {
      unreadable = true;
      continue;
    }
    if (!isKeyshareEnvelope(parseJson(text))) {
      continue;
    }
    let decrypted: string;
    try {
      decrypted = encryption.decryptWithPassword(text, password).toString();
    } catch {
      wrongPassword = true;
      continue;
    }
    if (
      (parseJson(decrypted) as {isTSS?: unknown} | undefined)?.isTSS === true
    ) {
      return decrypted;
    }
  }
  if (wrongPassword) {
    throw new WrongCloudBackupPasswordError();
  }
  throw unreadable
    ? new CloudBackupError('unknown')
    : new InvalidCloudBackupError('damaged');
};
