import crypto from 'crypto';
import {
  CLOUD_BACKUP_FORMAT,
  InvalidCloudBackupError,
  WrongCloudBackupPasswordError,
  classifyBackupFile,
  decryptCloudBackup,
  encryptCloudBackup,
  readCloudBackupHeader,
} from './codec';

const password = 'Str0ng!Backup-Pw';
const header = {
  keyId: 'key-1',
  fingerPrint: 'abcd1234',
  createdAt: 1793836800000,
};
const payload = {
  mnemonic: 'demo fake words not a real phrase never use these for funds',
  keyName: 'My Key',
};

const rewrite = (text: string, change: (file: any) => void) => {
  const file = JSON.parse(text);
  change(file);
  return JSON.stringify(file);
};

const flipLastBase64Char = (value: string) =>
  `${value.slice(0, -3)}${value.slice(-3, -2) === 'A' ? 'B' : 'A'}${value.slice(
    -2,
  )}`;

describe('cloud backup codec', () => {
  let encrypted: string;

  beforeAll(async () => {
    encrypted = await encryptCloudBackup(header, payload, password);
  });

  it('round-trips the payload and exposes only the header in plain text', async () => {
    expect(await decryptCloudBackup(encrypted, password)).toEqual(payload);
    expect(readCloudBackupHeader(encrypted)).toEqual(header);
    expect(encrypted).not.toContain('demo');
    expect(encrypted).not.toContain('My Key');
  });

  it.each([
    ['with', {...payload, mnemonicHasPassphrase: true as const}],
    ['without', payload],
  ])(
    'round-trips a payload %s the recovery phrase password flag',
    async (_label, value) => {
      const text = await encryptCloudBackup(header, value, password);

      expect(await decryptCloudBackup(text, password)).toEqual(value);
    },
  );

  it.each([
    ['false', false],
    ['a string', 'yes'],
  ])(
    'rejects a recovery phrase password flag set to %s as damaged',
    async (_label, flag) => {
      const text = await encryptCloudBackup(
        header,
        {...payload, mnemonicHasPassphrase: flag} as any,
        password,
      );

      await expect(decryptCloudBackup(text, password)).rejects.toThrow(
        new InvalidCloudBackupError('damaged'),
      );
    },
  );

  it('derives the key with Argon2id from the password and the file salt', async () => {
    const argon2 = jest.spyOn(crypto as any, 'argon2');

    await decryptCloudBackup(encrypted, password);

    expect(argon2).toHaveBeenCalledWith(
      'argon2id',
      {
        message: Buffer.from(password, 'utf8'),
        nonce: Buffer.from(JSON.parse(encrypted).kdf.salt, 'base64'),
        tagLength: 32,
        memory: 65536,
        passes: 3,
        parallelism: 4,
      },
      expect.any(Function),
    );
    argon2.mockRestore();
  });

  it('produces randomized ciphertext', async () => {
    const second = await encryptCloudBackup(header, payload, password);
    expect(JSON.parse(second).ciphertext).not.toBe(
      JSON.parse(encrypted).ciphertext,
    );
  });

  it('rejects the wrong password', async () => {
    await expect(
      decryptCloudBackup(encrypted, 'Wrong!Backup-Pw1'),
    ).rejects.toBeInstanceOf(WrongCloudBackupPasswordError);
  });

  it.each([
    ['keyId', (file: any) => (file.keyId = 'key-2')],
    ['fingerPrint', (file: any) => (file.fingerPrint = 'ffff0000')],
    ['createdAt', (file: any) => (file.createdAt += 1)],
    [
      'salt',
      (file: any) => (file.kdf.salt = flipLastBase64Char(file.kdf.salt)),
    ],
    [
      'iv',
      (file: any) => (file.cipher.iv = flipLastBase64Char(file.cipher.iv)),
    ],
    [
      'tag',
      (file: any) => (file.cipher.tag = flipLastBase64Char(file.cipher.tag)),
    ],
    [
      'ciphertext',
      (file: any) => (file.ciphertext = flipLastBase64Char(file.ciphertext)),
    ],
  ])('fails to decrypt when %s changes', async (_field, change) => {
    await expect(
      decryptCloudBackup(rewrite(encrypted, change), password),
    ).rejects.toThrow();
  });

  it.each([
    ['plain text', 'not json'],
    ['another wallet file', JSON.stringify({iv: 'x', ct: 'y'})],
    ['a JSON array', JSON.stringify([CLOUD_BACKUP_FORMAT])],
  ])('rejects %s as not a BitPay backup', (_label, text) => {
    expect(() => readCloudBackupHeader(text)).toThrow(
      new InvalidCloudBackupError('not_bitpay'),
    );
  });

  it.each([
    ['an unknown field', (file: any) => (file.extra = true)],
    ['a missing field', (file: any) => delete file.fingerPrint],
    ['a different version', (file: any) => (file.version = 2)],
    ['weaker Argon2 parameters', (file: any) => (file.kdf.memory = 1024)],
    ['a short IV', (file: any) => (file.cipher.iv = 'AAAA')],
    ['non-canonical base64', (file: any) => (file.ciphertext += '=')],
  ])('rejects a file with %s as damaged', (_label, change) => {
    let error: unknown;
    try {
      readCloudBackupHeader(rewrite(encrypted, change));
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidCloudBackupError);
    expect((error as InvalidCloudBackupError).reason).toBe('damaged');
  });

  it.each([
    [
      'reformatted',
      (text: string) => JSON.stringify(JSON.parse(text), null, 2),
    ],
    [
      'reordered',
      (text: string) => {
        const {ciphertext, ...rest} = JSON.parse(text);
        return JSON.stringify({ciphertext, ...rest});
      },
    ],
  ])('rejects a %s file as damaged', (_label, change) => {
    let error: unknown;
    try {
      readCloudBackupHeader(change(encrypted));
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidCloudBackupError);
    expect((error as InvalidCloudBackupError).reason).toBe('damaged');
  });
});

describe('classifyBackupFile', () => {
  let encrypted: string;

  beforeAll(async () => {
    encrypted = await encryptCloudBackup(header, payload, password);
  });

  it('recognizes a cloud backup file, ignoring surrounding whitespace', () => {
    expect(classifyBackupFile(`${encrypted}\n`)).toEqual({
      type: 'cloud',
      text: encrypted,
    });
  });

  it('extracts an exported wallet file from the surrounding text', () => {
    const exported = '{"iv":"aXY=","v":1,"ct":"Y3Q=","salt":"c2FsdA=="}';

    expect(classifyBackupFile(`Wallet backup\n${exported}\n`)).toEqual({
      type: 'export',
      text: exported,
    });
  });

  it('flags a damaged cloud backup file', () => {
    expect(
      classifyBackupFile(rewrite(encrypted, file => (file.keyId = ''))),
    ).toEqual({type: 'invalid', reason: 'damaged'});
  });

  it.each([
    ['plain text', 'abandon ability able'],
    ['an unrelated JSON file', '{"name":"notes"}'],
    ['an empty file', ''],
  ])('rejects %s as not a BitPay backup', (_label, text) => {
    expect(classifyBackupFile(text)).toEqual({
      type: 'invalid',
      reason: 'not_bitpay',
    });
  });
});
