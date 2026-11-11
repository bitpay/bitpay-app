import crypto from 'crypto';
import {decodeCanonicalBase64} from '../../store/transforms/encrypt';

export const CLOUD_BACKUP_FORMAT = 'bitpay-recovery-phrase-backup';
const CLOUD_BACKUP_VERSION = 1;

const ARGON2_PARAMS = {memory: 64 * 1024, passes: 3, parallelism: 4};
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const FILE_FIELDS = [
  'format',
  'version',
  'keyId',
  'fingerPrint',
  'createdAt',
  'kdf',
  'cipher',
  'ciphertext',
];
const KDF_FIELDS = ['name', 'memory', 'passes', 'parallelism', 'salt'];
const CIPHER_FIELDS = ['name', 'iv', 'tag'];

export interface CloudBackupHeader {
  keyId: string;
  fingerPrint: string;
  createdAt: number;
}

export interface CloudBackupPayload {
  mnemonic: string;
  keyName: string;
  mnemonicHasPassphrase?: true;
}

interface CloudBackupFile extends CloudBackupHeader {
  format: typeof CLOUD_BACKUP_FORMAT;
  version: number;
  kdf: {
    name: 'argon2id';
    memory: number;
    passes: number;
    parallelism: number;
    salt: string;
  };
  cipher: {name: 'aes-256-gcm'; iv: string; tag: string};
  ciphertext: string;
}

export class InvalidCloudBackupError extends Error {
  reason: 'not_bitpay' | 'damaged';

  constructor(reason: 'not_bitpay' | 'damaged') {
    super(reason);
    this.reason = reason;
  }
}

export class WrongCloudBackupPasswordError extends Error {}

type Argon2 = (
  algorithm: 'argon2id',
  params: {
    message: Buffer;
    nonce: Buffer;
    parallelism: number;
    tagLength: number;
    memory: number;
    passes: number;
  },
  callback: (err: Error | null, derivedKey: Buffer) => void,
) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactFields = (value: Record<string, unknown>, fields: string[]) =>
  Object.keys(value).length === fields.length &&
  fields.every(field => field in value);

const decodeBytes = (value: unknown, length?: number): Buffer => {
  if (typeof value !== 'string' || !value) {
    throw new InvalidCloudBackupError('damaged');
  }
  let bytes: Buffer;
  try {
    bytes = decodeCanonicalBase64(value, 'cloud backup');
  } catch {
    throw new InvalidCloudBackupError('damaged');
  }
  if (length !== undefined && bytes.length !== length) {
    throw new InvalidCloudBackupError('damaged');
  }
  return bytes;
};

const authenticatedHeader = (file: CloudBackupFile): Buffer =>
  Buffer.from(
    JSON.stringify([
      file.format,
      file.version,
      file.keyId,
      file.fingerPrint,
      file.createdAt,
      file.kdf.name,
      file.kdf.memory,
      file.kdf.passes,
      file.kdf.parallelism,
      file.kdf.salt,
      file.cipher.name,
      file.cipher.iv,
    ]),
    'utf8',
  );

const deriveKey = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    (crypto as unknown as {argon2: Argon2}).argon2(
      'argon2id',
      {
        message: Buffer.from(password, 'utf8'),
        nonce: salt,
        tagLength: KEY_BYTES,
        ...ARGON2_PARAMS,
      },
      (err, derivedKey) => (err ? reject(err) : resolve(derivedKey)),
    );
  });

const parseCloudBackup = (text: string): CloudBackupFile => {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new InvalidCloudBackupError('not_bitpay');
  }
  if (!isRecord(file) || file.format !== CLOUD_BACKUP_FORMAT) {
    throw new InvalidCloudBackupError('not_bitpay');
  }
  const {version, keyId, fingerPrint, createdAt, kdf, cipher, ciphertext} =
    file;
  if (
    !hasExactFields(file, FILE_FIELDS) ||
    version !== CLOUD_BACKUP_VERSION ||
    typeof keyId !== 'string' ||
    !keyId ||
    typeof fingerPrint !== 'string' ||
    typeof createdAt !== 'number' ||
    !Number.isSafeInteger(createdAt) ||
    createdAt <= 0 ||
    !isRecord(kdf) ||
    !hasExactFields(kdf, KDF_FIELDS) ||
    kdf.name !== 'argon2id' ||
    kdf.memory !== ARGON2_PARAMS.memory ||
    kdf.passes !== ARGON2_PARAMS.passes ||
    kdf.parallelism !== ARGON2_PARAMS.parallelism ||
    !isRecord(cipher) ||
    !hasExactFields(cipher, CIPHER_FIELDS) ||
    cipher.name !== 'aes-256-gcm'
  ) {
    throw new InvalidCloudBackupError('damaged');
  }
  decodeBytes(kdf.salt, SALT_BYTES);
  decodeBytes(cipher.iv, IV_BYTES);
  decodeBytes(cipher.tag, TAG_BYTES);
  decodeBytes(ciphertext);
  const canonical: CloudBackupFile = {
    format: CLOUD_BACKUP_FORMAT,
    version,
    keyId,
    fingerPrint,
    createdAt,
    kdf: {name: 'argon2id', ...ARGON2_PARAMS, salt: kdf.salt as string},
    cipher: {
      name: 'aes-256-gcm',
      iv: cipher.iv as string,
      tag: cipher.tag as string,
    },
    ciphertext: ciphertext as string,
  };
  if (JSON.stringify(canonical) !== text) {
    throw new InvalidCloudBackupError('damaged');
  }
  return canonical;
};

export const readCloudBackupHeader = (text: string): CloudBackupHeader => {
  const {keyId, fingerPrint, createdAt} = parseCloudBackup(text);
  return {keyId, fingerPrint, createdAt};
};

export const encryptCloudBackup = async (
  header: CloudBackupHeader,
  payload: CloudBackupPayload,
  password: string,
): Promise<string> => {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const file: CloudBackupFile = {
    format: CLOUD_BACKUP_FORMAT,
    version: CLOUD_BACKUP_VERSION,
    keyId: header.keyId,
    fingerPrint: header.fingerPrint,
    createdAt: header.createdAt,
    kdf: {name: 'argon2id', ...ARGON2_PARAMS, salt: salt.toString('base64')},
    cipher: {name: 'aes-256-gcm', iv: iv.toString('base64'), tag: ''},
    ciphertext: '',
  };
  const key = await deriveKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(authenticatedHeader(file));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  file.cipher.tag = cipher.getAuthTag().toString('base64');
  file.ciphertext = ciphertext.toString('base64');
  return JSON.stringify(file);
};

export const decryptCloudBackup = async (
  text: string,
  password: string,
): Promise<CloudBackupPayload> => {
  const file = parseCloudBackup(text);
  const key = await deriveKey(password, decodeBytes(file.kdf.salt));
  let plaintext: string;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      decodeBytes(file.cipher.iv),
    );
    decipher.setAAD(authenticatedHeader(file));
    decipher.setAuthTag(decodeBytes(file.cipher.tag));
    plaintext = Buffer.concat([
      decipher.update(decodeBytes(file.ciphertext)),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new WrongCloudBackupPasswordError();
  }
  let payload: unknown;
  try {
    payload = JSON.parse(plaintext);
  } catch {
    throw new InvalidCloudBackupError('damaged');
  }
  if (
    !isRecord(payload) ||
    typeof payload.mnemonic !== 'string' ||
    !payload.mnemonic ||
    typeof payload.keyName !== 'string' ||
    (payload.mnemonicHasPassphrase !== undefined &&
      payload.mnemonicHasPassphrase !== true)
  ) {
    throw new InvalidCloudBackupError('damaged');
  }
  return payload.mnemonicHasPassphrase
    ? {
        mnemonic: payload.mnemonic,
        keyName: payload.keyName,
        mnemonicHasPassphrase: true,
      }
    : {mnemonic: payload.mnemonic, keyName: payload.keyName};
};

export type BackupFileKind =
  | {type: 'cloud'; text: string}
  | {type: 'export'; text: string}
  | {type: 'invalid'; reason: InvalidCloudBackupError['reason']};

const EXPORTED_BACKUP = /\{[^}]+\}/;

export const classifyBackupFile = (raw: string): BackupFileKind => {
  const text = raw.trim();
  try {
    readCloudBackupHeader(text);
    return {type: 'cloud', text};
  } catch (err) {
    if (err instanceof InvalidCloudBackupError && err.reason === 'damaged') {
      return {type: 'invalid', reason: 'damaged'};
    }
  }
  const exported = EXPORTED_BACKUP.exec(text)?.[0];
  if (exported) {
    try {
      const {ct, iv} = JSON.parse(exported);
      if (typeof ct === 'string' && typeof iv === 'string') {
        return {type: 'export', text: exported};
      }
    } catch {}
  }
  return {type: 'invalid', reason: 'not_bitpay'};
};
