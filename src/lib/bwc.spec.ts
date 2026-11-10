import {BwcProvider} from './bwc';

describe('BwcProvider.createKey', () => {
  const BWC = BwcProvider.getInstance();

  it.each([
    ['an invalid checksum', 'abandon '.repeat(12).trim()],
    ['an unknown word', `${'abandon '.repeat(11)}zzzzz`],
  ])('throws INVALID_BACKUP without the phrase for %s', (_case, phrase) => {
    let thrown: any;
    try {
      BWC.createKey({seedType: 'mnemonic', seedData: phrase});
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toEqual(new Error('INVALID_BACKUP'));
    expect(thrown.cause).toBeUndefined();
    expect(thrown.stack).not.toContain('abandon');
  });

  it('creates a key from a valid phrase', () => {
    const key = BWC.createKey({
      seedType: 'mnemonic',
      seedData: `${'abandon '.repeat(11)}about`,
    });

    expect(key.fingerPrint).toEqual(expect.any(String));
  });

  it('keeps the Bad Key version error for key objects', () => {
    expect(() =>
      BWC.createKey({seedType: 'object', seedData: {version: 2}}),
    ).toThrow('Bad Key version');
  });
});
