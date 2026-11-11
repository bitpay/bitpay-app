import crypto from 'crypto';
import {Platform} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  CloudStorage,
  CloudStorageError,
  CloudStorageErrorCode,
  CloudStorageProvider,
  CloudStorageScope,
} from 'react-native-cloud-storage';

type GoogleSigninModule =
  typeof import('@react-native-google-signin/google-signin');

// Not linked on iOS (react-native.config.js), so it must only load on Android.
const getGoogleSignin = (): GoogleSigninModule =>
  require('@react-native-google-signin/google-signin');

const BACKUP_DIRECTORY = 'BitPay Backups';
const BACKUP_FILE_PATTERNS: [CloudBackupKind, RegExp][] = [
  ['phrase', /^BitPay-Backup-(\d+)-([0-9a-f]{16})\.json$/],
  ['keyshare', /^BitPay-Keyshare-(\d+)-([0-9a-f]{16})\.json$/],
];
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_REQUEST_TIMEOUT_MS = 15000;

export type CloudBackupErrorReason =
  | 'cancelled'
  | 'unavailable'
  | 'storage_full'
  | 'network'
  | 'not_confirmed'
  | 'unknown';

export class CloudBackupError extends Error {
  reason: CloudBackupErrorReason;

  constructor(reason: CloudBackupErrorReason) {
    super(reason);
    this.reason = reason;
  }
}

export interface CloudBackupFileEntry {
  name: string;
  createdAt: number;
}

export type CloudBackupKind = 'phrase' | 'keyshare';

export interface CloudBackupGroup {
  kind: CloudBackupKind;
  groupId: string;
  files: CloudBackupFileEntry[];
}

let cloudStorage: CloudStorage | undefined;

const getCloudStorage = (): CloudStorage => {
  if (!cloudStorage) {
    cloudStorage =
      Platform.OS === 'ios'
        ? new CloudStorage(CloudStorageProvider.ICloud, {
            scope: CloudStorageScope.Documents,
          })
        : new CloudStorage(CloudStorageProvider.GoogleDrive, {
            scope: CloudStorageScope.Documents,
            timeout: DRIVE_REQUEST_TIMEOUT_MS,
            accessToken: async () =>
              (await getGoogleSignin().GoogleSignin.getTokens()).accessToken,
          });
  }
  return cloudStorage;
};

const toCloudBackupError = (err: unknown): CloudBackupError => {
  if (err instanceof CloudBackupError) {
    return err;
  }
  if (err instanceof CloudStorageError) {
    switch (err.code) {
      case CloudStorageErrorCode.QUOTA_EXCEEDED:
        return new CloudBackupError('storage_full');
      case CloudStorageErrorCode.NETWORK_ERROR:
      case CloudStorageErrorCode.RATE_LIMITED:
        return new CloudBackupError('network');
      case CloudStorageErrorCode.AUTHENTICATION_FAILED:
      case CloudStorageErrorCode.ACCESS_TOKEN_MISSING:
        return new CloudBackupError('unavailable');
      case CloudStorageErrorCode.DIRECTORY_NOT_FOUND:
        return new CloudBackupError(
          Platform.OS === 'ios' ? 'unavailable' : 'unknown',
        );
    }
  }
  return new CloudBackupError('unknown');
};

const signInToGoogle = async (chooseAccount: boolean): Promise<void> => {
  const {GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes} =
    getGoogleSignin();
  GoogleSignin.configure({scopes: [DRIVE_FILE_SCOPE]});
  try {
    await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
    if (chooseAccount && GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }
    if (GoogleSignin.hasPreviousSignIn()) {
      const silent = await GoogleSignin.signInSilently();
      if (silent.type === 'success') {
        return;
      }
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new CloudBackupError('cancelled');
    }
  } catch (err) {
    if (err instanceof CloudBackupError) {
      throw err;
    }
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new CloudBackupError('cancelled');
    }
    throw new CloudBackupError('unavailable');
  }
};

export const connectToCloud = async ({
  chooseAccount = false,
}: {chooseAccount?: boolean} = {}): Promise<void> => {
  const {isConnected} = await NetInfo.fetch();
  if (isConnected === false) {
    throw new CloudBackupError('network');
  }
  if (Platform.OS !== 'ios') {
    await signInToGoogle(chooseAccount);
  }
  if (!(await getCloudStorage().isCloudAvailable())) {
    throw new CloudBackupError('unavailable');
  }
};

export const getCloudAccountEmail = (): string | undefined =>
  Platform.OS === 'ios'
    ? undefined
    : getGoogleSignin().GoogleSignin.getCurrentUser()?.user.email;

export const getCloudBackupGroupId = (keyRef: string) =>
  crypto.createHash('sha256').update(keyRef).digest('hex').slice(0, 16);

export const getCloudBackupFileName = (createdAt: number, keyRef: string) =>
  `BitPay-Backup-${createdAt}-${getCloudBackupGroupId(keyRef)}.json`;

export const getCloudKeyshareFileName = (createdAt: number, keyRef: string) =>
  `BitPay-Keyshare-${createdAt}-${getCloudBackupGroupId(keyRef)}.json`;

export const groupBackupsByKey = (names: string[]): CloudBackupGroup[] => {
  const groups = new Map<string, CloudBackupGroup>();
  names.forEach(name => {
    for (const [kind, pattern] of BACKUP_FILE_PATTERNS) {
      const match = pattern.exec(name);
      if (match) {
        const id = `${kind}:${match[2]}`;
        const group = groups.get(id) || {kind, groupId: match[2], files: []};
        group.files.push({name, createdAt: Number(match[1])});
        groups.set(id, group);
        return;
      }
    }
  });
  return [...groups.values()]
    .map(group => ({
      ...group,
      files: group.files.sort((a, b) => b.createdAt - a.createdAt),
    }))
    .sort((a, b) => b.files[0].createdAt - a.files[0].createdAt);
};

export const saveCloudBackupFile = async (
  name: string,
  contents: string,
): Promise<void> => {
  const storage = getCloudStorage();
  const path = `${BACKUP_DIRECTORY}/${name}`;
  try {
    if (!(await storage.exists(BACKUP_DIRECTORY))) {
      await storage.mkdir(BACKUP_DIRECTORY);
    }
    if (await storage.exists(path)) {
      throw new CloudBackupError('unknown');
    }
    await storage.writeFile(path, contents);
    if ((await storage.readFile(path)) !== contents) {
      throw new CloudBackupError('not_confirmed');
    }
  } catch (err) {
    throw toCloudBackupError(err);
  }
};

export const saveCloudKeyshare = (keyRef: string, contents: string) =>
  saveCloudBackupFile(getCloudKeyshareFileName(Date.now(), keyRef), contents);

export const listCloudBackups = async (): Promise<CloudBackupGroup[]> => {
  const storage = getCloudStorage();
  try {
    if (!(await storage.exists(BACKUP_DIRECTORY))) {
      return [];
    }
    return groupBackupsByKey(await storage.readdir(BACKUP_DIRECTORY));
  } catch (err) {
    throw toCloudBackupError(err);
  }
};

export const readCloudBackupFile = async (name: string): Promise<string> => {
  try {
    return await getCloudStorage().readFile(`${BACKUP_DIRECTORY}/${name}`);
  } catch (err) {
    throw toCloudBackupError(err);
  }
};

export const deleteCloudBackupFiles = async (
  keyRef: string,
  keepName?: string,
): Promise<number> => {
  const groupId = getCloudBackupGroupId(keyRef);
  const storage = getCloudStorage();
  try {
    const group = (await listCloudBackups()).find(
      g => g.kind === 'phrase' && g.groupId === groupId,
    );
    const oldestFirst = [...(group?.files || [])]
      .reverse()
      .filter(({name}) => name !== keepName);
    for (const {name} of oldestFirst) {
      await storage.unlink(`${BACKUP_DIRECTORY}/${name}`);
    }
    return oldestFirst.length;
  } catch (err) {
    throw toCloudBackupError(err);
  }
};
