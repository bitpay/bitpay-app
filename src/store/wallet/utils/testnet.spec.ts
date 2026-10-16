import {
  areTestnetWalletsVisible,
  filterTestnetWallets,
  getAccountChainsOnNetwork,
  hasTestnetWallets,
  isHiddenByTestnetMode,
  isKeyVisibleForTestnetMode,
  isTestnetWallet,
  selectShowTestnetWallets,
  selectTestnetModeUnlocked,
  syncTestnetWalletsVisibility,
} from './testnet';

const mainnet = {id: 'main', chain: 'eth', network: 'livenet'};
const sepolia = {id: 'sepolia', chain: 'eth', network: 'testnet'};
const regtest = {id: 'regtest', chain: 'btc', network: 'regtest'};

const makeState = ({
  showTestnetWallets = null,
  wallets = [] as Array<{network: string}>,
  appNetwork = 'livenet',
}: {
  showTestnetWallets?: boolean | null;
  wallets?: Array<{network: string}>;
  appNetwork?: string;
} = {}) =>
  ({
    APP: {network: appNetwork},
    WALLET: {keys: {key1: {wallets}}, showTestnetWallets},
  } as any);

afterEach(() => syncTestnetWalletsVisibility(makeState()));

describe('isTestnetWallet', () => {
  it('treats testnet and regtest as testnet', () => {
    expect(isTestnetWallet(sepolia)).toBe(true);
    expect(isTestnetWallet(regtest)).toBe(true);
    expect(isTestnetWallet(mainnet)).toBe(false);
  });

  it('falls back to the credentials network', () => {
    expect(isTestnetWallet({credentials: {network: 'testnet'}})).toBe(true);
    expect(isTestnetWallet(undefined)).toBe(false);
  });
});

describe('selectShowTestnetWallets', () => {
  it('is off by default for people without testnet wallets', () => {
    const state = makeState({wallets: [mainnet]});
    expect(selectShowTestnetWallets(state)).toBe(false);
    expect(selectTestnetModeUnlocked(state)).toBe(false);
  });

  it('keeps existing testnet wallets visible until a value is picked', () => {
    const state = makeState({wallets: [mainnet, sepolia]});
    expect(selectShowTestnetWallets(state)).toBe(true);
    expect(selectTestnetModeUnlocked(state)).toBe(true);
  });

  it('follows the toggle once set, and stays unlocked when turned off', () => {
    const off = makeState({showTestnetWallets: false, wallets: [sepolia]});
    expect(selectShowTestnetWallets(off)).toBe(false);
    expect(selectTestnetModeUnlocked(off)).toBe(true);

    const on = makeState({showTestnetWallets: true});
    expect(selectShowTestnetWallets(on)).toBe(true);
  });

  it('always shows testnet wallets in Test Mode', () => {
    const state = makeState({showTestnetWallets: false, appNetwork: 'testnet'});
    expect(selectShowTestnetWallets(state)).toBe(true);
  });

  it('treats a missing persisted value like an unset one', () => {
    const state = {
      APP: {network: 'livenet'},
      WALLET: {keys: {}},
    } as any;
    expect(selectShowTestnetWallets(state)).toBe(false);
    expect(selectTestnetModeUnlocked(state)).toBe(false);
  });
});

describe('list helpers', () => {
  it('filters testnet wallets only while testnet mode is off', () => {
    expect(filterTestnetWallets([mainnet, sepolia, regtest], false)).toEqual([
      mainnet,
    ]);
    expect(filterTestnetWallets([mainnet, sepolia], true)).toEqual([
      mainnet,
      sepolia,
    ]);
  });

  it('hides a key only when all of its wallets are testnet', () => {
    expect(isKeyVisibleForTestnetMode({wallets: [sepolia]} as any, false)).toBe(
      false,
    );
    expect(
      isKeyVisibleForTestnetMode({wallets: [sepolia, mainnet]} as any, false),
    ).toBe(true);
    expect(isKeyVisibleForTestnetMode({wallets: []} as any, false)).toBe(true);
    expect(isKeyVisibleForTestnetMode({wallets: [sepolia]} as any, true)).toBe(
      true,
    );
  });

  it('detects testnet wallets across keys', () => {
    expect(hasTestnetWallets({a: {wallets: [mainnet]} as any})).toBe(false);
    expect(
      hasTestnetWallets({
        a: {wallets: [mainnet]} as any,
        b: {wallets: [sepolia]} as any,
      }),
    ).toBe(true);
    expect(hasTestnetWallets(undefined)).toBe(false);
  });

  it('counts an account chain per network', () => {
    const wallets = [
      {chain: 'eth', network: 'livenet'},
      {chain: 'eth', network: 'testnet'},
      {chain: 'arb', network: 'testnet'},
    ];
    expect(getAccountChainsOnNetwork(wallets, 'livenet')).toEqual(['eth']);
    expect(getAccountChainsOnNetwork(wallets, 'testnet')).toEqual([
      'eth',
      'arb',
    ]);
  });
});

describe('syncTestnetWalletsVisibility', () => {
  it('mirrors the store for helpers that run outside React', () => {
    syncTestnetWalletsVisibility(makeState({showTestnetWallets: true}));
    expect(areTestnetWalletsVisible()).toBe(true);
    expect(isHiddenByTestnetMode(sepolia)).toBe(false);
    expect(filterTestnetWallets([mainnet, sepolia])).toEqual([
      mainnet,
      sepolia,
    ]);

    syncTestnetWalletsVisibility(makeState({showTestnetWallets: false}));
    expect(areTestnetWalletsVisible()).toBe(false);
    expect(isHiddenByTestnetMode(sepolia)).toBe(true);
    expect(isHiddenByTestnetMode(mainnet)).toBe(false);
    expect(filterTestnetWallets([mainnet, sepolia])).toEqual([mainnet]);
  });
});
