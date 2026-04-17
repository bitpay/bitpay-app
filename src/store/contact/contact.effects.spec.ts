/**
 * Tests for contact.effects.ts
 *
 * Covers all five migration effects:
 *   - startContactMigration
 *   - startContactV2Migration
 *   - startContactTokenAddressMigration
 *   - startContactBridgeUsdcMigration
 *   - startContactPolMigration
 */

import configureTestStore from '@test/store';
import {createContact} from './contact.actions';
import {
  startContactMigration,
  startContactV2Migration,
  startContactTokenAddressMigration,
  startContactBridgeUsdcMigration,
  startContactPolMigration,
} from './contact.effects';
import {tokenManager} from '../../managers/TokenManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: jest.fn(() => ({tokenDataByAddress: {}})),
  },
}));

// Sentry is already mocked in test/setup.js

// ---------------------------------------------------------------------------
// Helper: build a minimal ContactRowProps
// ---------------------------------------------------------------------------
const makeContact = (overrides: Partial<any> = {}) => ({
  address: '0xABC123',
  coin: 'btc',
  chain: 'btc',
  network: 'livenet',
  name: 'Alice',
  ...overrides,
});

// ---------------------------------------------------------------------------
// startContactMigration
// ---------------------------------------------------------------------------
describe('startContactMigration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds chain = coin for a UTXO coin that is already supported', async () => {
    // 'btc' is in BitpaySupportedUtxoCoins → chain should become 'btc'
    const store = configureTestStore({});
    store.dispatch(createContact(makeContact({coin: 'btc', chain: ''})));

    await store.dispatch(startContactMigration());

    const {list} = store.getState().CONTACT;
    expect(list).toHaveLength(1);
    expect(list[0].chain).toBe('btc');
  });

  it('adds chain = coin for an OtherBitpaySupportedCoin (e.g. xrp)', async () => {
    const store = configureTestStore({});
    store.dispatch(
      createContact(makeContact({coin: 'xrp', chain: '', address: '0xXRP'})),
    );

    await store.dispatch(startContactMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].chain).toBe('xrp');
  });

  it('falls back to "eth" for an unknown coin', async () => {
    const store = configureTestStore({});
    store.dispatch(
      createContact(
        makeContact({coin: 'unknowncoin', chain: '', address: '0xUNK'}),
      ),
    );

    await store.dispatch(startContactMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].chain).toBe('eth');
  });

  it('resolves even when contact list is empty', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(startContactMigration()),
    ).resolves.toBeUndefined();
    expect(store.getState().CONTACT.list).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// startContactV2Migration
// ---------------------------------------------------------------------------
describe('startContactV2Migration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('merges duplicate addresses into a single contact with combined names', async () => {
    const sharedAddress = '0xSHARED';
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: sharedAddress,
            name: 'Alice',
            coin: 'eth',
            chain: 'eth',
          }),
          makeContact({
            address: sharedAddress,
            name: 'Bob',
            coin: 'eth',
            chain: 'eth',
          }),
        ],
      },
    });

    await store.dispatch(startContactV2Migration());

    const {list} = store.getState().CONTACT;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Alice - Bob');
    expect(list[0].address).toBe(sharedAddress);
  });

  it('keeps unique addresses as separate contacts', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({address: '0xAAA', name: 'Alice'}),
          makeContact({address: '0xBBB', name: 'Bob'}),
        ],
      },
    });

    await store.dispatch(startContactV2Migration());

    const {list} = store.getState().CONTACT;
    expect(list).toHaveLength(2);
  });

  it('sets notes to "EVM compatible address\\n" for EVM addresses', async () => {
    // ethers isAddress mock returns true for any address
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: '0x1234567890123456789012345678901234567890',
            coin: 'eth',
            chain: 'eth',
          }),
        ],
      },
    });

    await store.dispatch(startContactV2Migration());

    const {list} = store.getState().CONTACT;
    // notes should be the EVM string (IsValidEVMAddress uses ethers.utils.isAddress, mocked → true)
    expect(list[0].notes).toBe('EVM compatible address\n');
  });

  it('resolves even when contact list is empty', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(startContactV2Migration()),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// startContactTokenAddressMigration
// ---------------------------------------------------------------------------
describe('startContactTokenAddressMigration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves successfully with no contacts', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(startContactTokenAddressMigration()),
    ).resolves.toBeUndefined();
  });

  it('adds tokenAddress for a matching token in an EVM chain', async () => {
    const mockTokenAddress = '0xTOKEN_ADDRESS';
    (tokenManager.getTokenOptions as jest.Mock).mockReturnValueOnce({
      tokenDataByAddress: {
        [mockTokenAddress]: {
          address: mockTokenAddress,
          coin: 'usdc',
          chain: 'eth',
        },
      },
    });

    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: '0xUSER',
            coin: 'usdc',
            chain: 'eth',
            tokenAddress: undefined,
          }),
        ],
      },
    });

    await store.dispatch(startContactTokenAddressMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].tokenAddress).toBe(mockTokenAddress);
  });

  it('does NOT add tokenAddress for a non-EVM chain', async () => {
    (tokenManager.getTokenOptions as jest.Mock).mockReturnValueOnce({
      tokenDataByAddress: {
        '0xTOKEN': {address: '0xTOKEN', coin: 'btc', chain: 'btc'},
      },
    });

    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({coin: 'btc', chain: 'btc', tokenAddress: undefined}),
        ],
      },
    });

    await store.dispatch(startContactTokenAddressMigration());

    const {list} = store.getState().CONTACT;
    // btc is not an EVM chain — tokenAddress should remain undefined
    expect(list[0].tokenAddress).toBeUndefined();
  });

  it('resolves (does not reject) even when tokenManager throws', async () => {
    (tokenManager.getTokenOptions as jest.Mock).mockImplementationOnce(() => {
      throw new Error('tokenManager failure');
    });

    const store = configureTestStore({
      CONTACT: {
        list: [makeContact({coin: 'usdc', chain: 'eth'})],
      },
    });

    await expect(
      store.dispatch(startContactTokenAddressMigration()),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// startContactBridgeUsdcMigration
// ---------------------------------------------------------------------------
describe('startContactBridgeUsdcMigration', () => {
  const bridgeUsdcTokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';

  beforeEach(() => jest.clearAllMocks());

  it('renames coin to "usdc.e" for contacts with the bridge USDC token address', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: '0xUSER',
            coin: 'usdc',
            chain: 'matic',
            tokenAddress: bridgeUsdcTokenAddress,
          }),
        ],
      },
    });

    await store.dispatch(startContactBridgeUsdcMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].coin).toBe('usdc.e');
  });

  it('leaves other contacts untouched', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: '0xOTHER',
            coin: 'usdc',
            chain: 'eth',
            tokenAddress: '0xDIFFERENT_ADDRESS',
          }),
        ],
      },
    });

    await store.dispatch(startContactBridgeUsdcMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].coin).toBe('usdc');
  });

  it('handles mixed contacts correctly', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({
            address: '0xBRIDGE',
            coin: 'usdc',
            chain: 'matic',
            tokenAddress: bridgeUsdcTokenAddress,
          }),
          makeContact({
            address: '0xNORMAL',
            coin: 'eth',
            chain: 'eth',
            tokenAddress: undefined,
          }),
        ],
      },
    });

    await store.dispatch(startContactBridgeUsdcMigration());

    const {list} = store.getState().CONTACT;
    const bridge = list.find(c => c.address === '0xBRIDGE');
    const normal = list.find(c => c.address === '0xNORMAL');
    expect(bridge?.coin).toBe('usdc.e');
    expect(normal?.coin).toBe('eth');
  });

  it('resolves even when contact list is empty', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(startContactBridgeUsdcMigration()),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// startContactPolMigration
// ---------------------------------------------------------------------------
describe('startContactPolMigration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renames coin from "matic" to "pol"', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({address: '0xMATIC', coin: 'matic', chain: 'matic'}),
        ],
      },
    });

    await store.dispatch(startContactPolMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].coin).toBe('pol');
  });

  it('leaves non-matic contacts untouched', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [makeContact({coin: 'eth', chain: 'eth'})],
      },
    });

    await store.dispatch(startContactPolMigration());

    const {list} = store.getState().CONTACT;
    expect(list[0].coin).toBe('eth');
  });

  it('handles mixed matic and non-matic contacts', async () => {
    const store = configureTestStore({
      CONTACT: {
        list: [
          makeContact({address: '0xM', coin: 'matic', chain: 'matic'}),
          makeContact({address: '0xE', coin: 'eth', chain: 'eth'}),
          makeContact({address: '0xB', coin: 'btc', chain: 'btc'}),
        ],
      },
    });

    await store.dispatch(startContactPolMigration());

    const {list} = store.getState().CONTACT;
    expect(list.find(c => c.address === '0xM')?.coin).toBe('pol');
    expect(list.find(c => c.address === '0xE')?.coin).toBe('eth');
    expect(list.find(c => c.address === '0xB')?.coin).toBe('btc');
  });

  it('resolves even when contact list is empty', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(startContactPolMigration()),
    ).resolves.toBeUndefined();
  });
});
