jest.mock('../../lib/bwc', () => {
  const mockWalletClient = {
    credentials: {},
  };
  const mockInstance = {
    getClient: jest.fn(() => mockWalletClient),
    createKey: jest.fn(() => ({
      id: 'mock-key-id',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    })),
    createTssKey: jest.fn(() => ({
      id: 'mock-tss-key-id',
      isPrivKeyEncrypted: jest.fn(() => false),
      toObj: jest.fn(() => ({})),
    })),
    getErrors: jest.fn(() => ({})),
    getUtils: jest.fn(() => ({formatAmount: jest.fn(() => '0')})),
    getBitcore: jest.fn(() => ({})),
    getBitcoreCash: jest.fn(() => ({})),
    getBitcoreDoge: jest.fn(() => ({})),
    getBitcoreLtc: jest.fn(() => ({})),
    getCore: jest.fn(() => ({})),
    getPayProV2: jest.fn(() => ({trustedKeys: {}})),
    getTssSign: jest.fn(() => class MockTssSign {}),
    getTssKey: jest.fn(() => class MockTssKey {}),
    getConstants: jest.fn(() => ({
      SCRIPT_TYPES: {},
      DERIVATION_STRATEGIES: {},
    })),
    getEncryption: jest.fn(() => ({})),
    getLogger: jest.fn(() => ({})),
    parseSecret: jest.fn(),
  };
  return {
    BwcProvider: {
      getInstance: jest.fn(() => mockInstance),
      API: {},
      instance: mockInstance,
    },
  };
});

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), error: jest.fn(), debug: jest.fn()},
}));

jest.mock('../log', () => ({
  LogActions: {
    persistLog: jest.fn((x: any) => x),
    error: jest.fn((msg: string) => ({type: 'LOG_ERROR', payload: msg})),
    info: jest.fn((msg: string) => ({type: 'LOG_INFO', payload: msg})),
  },
}));

jest.mock('../log/initLogs', () => ({add: jest.fn()}));

jest.mock('../wallet/utils/wallet', () => ({
  buildWalletObj: jest.fn(() => ({id: 'mock-wallet'})),
}));

import {BwcProvider} from '../../lib/bwc';
import {bindWalletKeys} from './transforms';
import {decryptWalletStore, encryptWalletStore} from './encrypt';

const secretKey = 'test-secret';
const shareBytes = [1, 2, 3, 250, 251, 252];
const reducedShareBytes = [9, 8, 7];

const buildTssState = () => ({
  keys: {
    key1: {
      id: 'key1',
      properties: {
        id: 'key1',
        metadata: {chain: 'btc', network: 'livenet', m: '2', n: '2'},
        keychain: {
          privateKeyShare: Buffer.from(shareBytes),
          reducedPrivateKeyShare: Buffer.from(reducedShareBytes),
          commonKeyChain: 'common-key-chain',
        },
      },
      wallets: [],
    },
  },
});

const persistCycle = (state: any) =>
  decryptWalletStore(
    JSON.parse(JSON.stringify(encryptWalletStore(state, secretKey))),
    secretKey,
  );

const createTssKeyMock = () =>
  BwcProvider.getInstance().createTssKey as unknown as jest.Mock;

describe('tss keychain persistence', () => {
  beforeEach(() => {
    createTssKeyMock().mockClear();
  });

  it('hands bwc a share buffer with the original bytes after a persist cycle', () => {
    bindWalletKeys.out!(persistCycle(buildTssState()), 'WALLET', {} as any);

    const {keychain} = createTssKeyMock().mock.calls[0][0];
    expect(Buffer.isBuffer(keychain.privateKeyShare)).toBe(true);
    expect([...keychain.privateKeyShare]).toEqual(shareBytes);
    expect(keychain.commonKeyChain).toBe('common-key-chain');
  });

  it('matches what bwc received before the keychain was encrypted', () => {
    bindWalletKeys.out!(
      JSON.parse(JSON.stringify(buildTssState())),
      'WALLET',
      {} as any,
    );
    const legacy = createTssKeyMock().mock.calls[0][0];

    createTssKeyMock().mockClear();
    bindWalletKeys.out!(persistCycle(buildTssState()), 'WALLET', {} as any);

    expect(createTssKeyMock().mock.calls[0][0]).toEqual(legacy);
  });

  it('never writes the share bytes to storage', () => {
    const persisted = JSON.stringify(
      encryptWalletStore(buildTssState(), secretKey),
    );

    expect(persisted).not.toContain('250,251,252');
    expect(persisted).not.toContain('common-key-chain');
  });
});
