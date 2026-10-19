import {getUpdatedWalletBalances} from './statusv2';
import {updateKeyStatus, updateWalletStatus} from './status';
import {logManager} from '../../../../managers/LogManager';

jest.mock('./status', () => ({
  updateKeyStatus: jest.fn(),
  updateWalletStatus: jest.fn(),
}));
jest.mock('../create/create', () => ({
  detectAndCreateTokensForEachEvmWallet: jest.fn(),
}));
jest.mock('../rates/rates', () => ({startGetRates: jest.fn()}));
jest.mock('../..', () => ({WalletActions: {}}));
jest.mock('../../../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

const mockUpdateKeyStatus = updateKeyStatus as jest.Mock;
const mockUpdateWalletStatus = updateWalletStatus as jest.Mock;

const key = (id: string, isReadOnly = false) =>
  ({id, isReadOnly, wallets: [{id: `${id}-w1`}]} as any);

const keyBalance = (keyId: string) => ({
  keyId,
  totalBalance: 10,
  totalBalanceLastDay: 9,
  walletUpdates: [
    {
      walletId: `${keyId}-w1`,
      balance: {sat: 1},
      pendingTxps: [],
      singleAddress: false,
    },
  ],
});

const run = (keys: any[]) => {
  const state = {
    WALLET: {keys: Object.fromEntries(keys.map(k => [k.id, k]))},
    APP: {defaultAltCurrency: {isoCode: 'USD'}},
    RATE: {rates: {}, lastDayRates: {}},
  };
  const dispatch = jest.fn(action => action);
  return getUpdatedWalletBalances({force: true})(
    dispatch as any,
    () => state as any,
    undefined,
  );
};

describe('getUpdatedWalletBalances – per-key failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the other keys’ balances when one key fails', async () => {
    mockUpdateKeyStatus.mockImplementation(({key: {id}}) =>
      id === 'k2'
        ? Promise.reject(new Error('getStatusAll timeout'))
        : Promise.resolve(keyBalance(id)),
    );

    const result = await run([key('k1'), key('k2'), key('k3')]);

    expect(result.keyBalances.map(b => b.keyId)).toEqual(['k1', 'k3']);
    expect(result.walletBalances.map(b => b.walletId)).toEqual([
      'k1-w1',
      'k3-w1',
    ]);
    expect(logManager.error).toHaveBeenCalledWith(
      expect.stringContaining('k2'),
    );
  });

  it('still rejects when every key fails', async () => {
    mockUpdateKeyStatus.mockRejectedValue(new Error('offline'));

    await expect(run([key('k1'), key('k2')])).rejects.toThrow('offline');
  });

  it('treats a cached key (no update) as success, not failure', async () => {
    mockUpdateKeyStatus.mockImplementation(({key: {id}}) =>
      Promise.resolve(id === 'k1' ? undefined : keyBalance(id)),
    );

    const result = await run([key('k1'), key('k2')]);

    expect(result.keyBalances.map(b => b.keyId)).toEqual(['k2']);
    expect(logManager.error).not.toHaveBeenCalled();
  });

  it('does not reject when only read-only keys exist', async () => {
    mockUpdateWalletStatus.mockResolvedValue({balance: {sat: 2}});

    const result = await run([key('ro', true)]);

    expect(mockUpdateKeyStatus).not.toHaveBeenCalled();
    expect(result.walletBalances.map(b => b.walletId)).toEqual(['ro-w1']);
  });
});
