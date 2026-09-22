import {
  buildTokenWalletId,
  findByTokenWalletId,
  getBaseWalletIdFromTokenWalletId,
  getTokenAddressFromTokenWalletId,
} from './token-wallet-id';

describe('buildTokenWalletId', () => {
  it('joins the base wallet id and the token address without touching their casing', () => {
    expect(
      buildTokenWalletId(
        'wallet-1',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      ),
    ).toBe('wallet-1-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });
});

describe('findByTokenWalletId', () => {
  const getId = (wallet: {id: string}) => wallet.id;

  it('returns undefined when there is nothing to look into', () => {
    expect(
      findByTokenWalletId(undefined, 'wallet-1-0xtoken', getId),
    ).toBeUndefined();
    expect(findByTokenWalletId([], 'wallet-1-0xtoken', getId)).toBeUndefined();
  });

  it('finds the wallet by an exact identifier', () => {
    const wallet = {id: 'wallet-1-0xtoken'};

    expect(
      findByTokenWalletId(
        [{id: 'wallet-1'}, wallet],
        'wallet-1-0xtoken',
        getId,
      ),
    ).toBe(wallet);
  });

  it('falls back to a case insensitive match when no identifier matches exactly', () => {
    const wallet = {id: 'wallet-1-0xabcdef'};

    expect(findByTokenWalletId([wallet], 'wallet-1-0xAbCdEf', getId)).toBe(
      wallet,
    );
  });

  it('prefers the exact match over one that only differs in casing', () => {
    const upperCasedMint = {
      id: 'wallet-1-So11111111111111111111111111111111111111112',
    };
    const lowerCasedMint = {
      id: 'wallet-1-so11111111111111111111111111111111111111112',
    };

    expect(
      findByTokenWalletId(
        [lowerCasedMint, upperCasedMint],
        'wallet-1-So11111111111111111111111111111111111111112',
        getId,
      ),
    ).toBe(upperCasedMint);

    expect(
      findByTokenWalletId(
        [upperCasedMint, lowerCasedMint],
        'wallet-1-so11111111111111111111111111111111111111112',
        getId,
      ),
    ).toBe(lowerCasedMint);
  });

  it('skips items with no identifier', () => {
    const wallet = {id: 'wallet-1-0xtoken'};

    expect(
      findByTokenWalletId(
        [{id: undefined as unknown as string}, wallet],
        'wallet-1-0xtoken',
        getId,
      ),
    ).toBe(wallet);
  });

  it('returns undefined when nothing matches', () => {
    expect(
      findByTokenWalletId(
        [{id: 'wallet-1-0xother'}],
        'wallet-1-0xtoken',
        getId,
      ),
    ).toBeUndefined();
  });
});

describe('getTokenAddressFromTokenWalletId', () => {
  it('returns the token address a token wallet id carries', () => {
    expect(
      getTokenAddressFromTokenWalletId('wallet-1', 'wallet-1-0xtoken'),
    ).toBe('0xtoken');
  });

  it('keeps the casing of a Base58 mint', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    expect(
      getTokenAddressFromTokenWalletId('wallet-1', `wallet-1-${mint}`),
    ).toBe(mint);
  });

  it('returns undefined for an id that belongs to another wallet', () => {
    expect(
      getTokenAddressFromTokenWalletId('wallet-1', 'wallet-2-0xtoken'),
    ).toBeUndefined();
  });

  it('returns undefined for the base wallet id itself', () => {
    expect(
      getTokenAddressFromTokenWalletId('wallet-1', 'wallet-1'),
    ).toBeUndefined();
    expect(
      getTokenAddressFromTokenWalletId('wallet-1', 'wallet-1-'),
    ).toBeUndefined();
  });
});

describe('getBaseWalletIdFromTokenWalletId', () => {
  it('strips the token address off the end', () => {
    expect(
      getBaseWalletIdFromTokenWalletId('wallet-1-0xtoken', '0xtoken'),
    ).toBe('wallet-1');
  });

  it('resolves a mint that is not 0x prefixed', () => {
    const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    expect(getBaseWalletIdFromTokenWalletId(`wallet-1-${mint}`, mint)).toBe(
      'wallet-1',
    );
  });

  it('resolves a token of a multisig wallet to the multisig wallet', () => {
    expect(
      getBaseWalletIdFromTokenWalletId(
        'wallet-1-0xmultisig-0xtoken',
        '0xtoken',
      ),
    ).toBe('wallet-1-0xmultisig');
  });

  it('returns undefined when the id does not carry that token address', () => {
    expect(
      getBaseWalletIdFromTokenWalletId('wallet-1-0xtoken', '0xother'),
    ).toBeUndefined();
  });
});
