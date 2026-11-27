import {
  LogLevel,
  redactExtendedPrivateKeys,
  sanitizeLogEntries,
} from './log.models';

describe('redactExtendedPrivateKeys', () => {
  it('redacts xprv and tprv values', () => {
    expect(
      redactExtendedPrivateKeys(
        'bad key xprv9s21ZrQH143K3QTDL4LXw2F7HEK3 and tprv8ZgxMBicQKsPd9TeAdPA end',
      ),
    ).toEqual('bad key [...] and [...] end');
  });

  it('keeps diagnostics that only name a key field', () => {
    const message =
      'Expected encrypted protected value at properties.xPrivKey (walletPrivKey missing)';

    expect(redactExtendedPrivateKeys(message)).toEqual(message);
  });
});

describe('sanitizeLogEntries', () => {
  it('redacts key material in persisted entries and keeps the other fields', () => {
    const timestamp = '2026-01-01T00:00:00.000Z';

    expect(
      sanitizeLogEntries([
        {
          level: LogLevel.Error,
          timestamp,
          message: 'import failed xprv9s21ZrQH143K3QTDL4LXw2F7HEK3 here',
        },
        {level: LogLevel.Info, timestamp, message: 'walletPrivKey: deadbeef'},
        {level: LogLevel.Info, timestamp, message: 'plain message'},
      ]),
    ).toEqual([
      {level: LogLevel.Error, timestamp, message: 'import failed [...] here'},
      {level: LogLevel.Info, timestamp, message: 'walletPrivKey:[...]'},
      {level: LogLevel.Info, timestamp, message: 'plain message'},
    ]);
  });

  it('leaves entries without a string message untouched', () => {
    const entry = {level: LogLevel.Info, timestamp: 't'} as any;

    expect(sanitizeLogEntries([entry, null as any])).toEqual([entry, null]);
  });
});
