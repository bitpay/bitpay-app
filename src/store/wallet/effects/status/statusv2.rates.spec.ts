import {getAndDispatchUpdatedWalletBalances} from './statusv2';
import {startGetRates} from '../rates/rates';

jest.mock('./status', () => ({
  updateKeyStatus: jest.fn(),
  updateWalletStatus: jest.fn(),
}));
jest.mock('../create/create', () => ({
  detectAndCreateTokensForEachEvmWallet: jest.fn(),
}));
jest.mock('../rates/rates', () => ({
  startGetRates: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../..', () => ({WalletActions: {}}));
jest.mock('../../../../managers/LogManager', () => ({
  logManager: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

const mockStartGetRates = startGetRates as jest.Mock;

const run = (
  args: Parameters<typeof getAndDispatchUpdatedWalletBalances>[0],
) => {
  const state = {
    WALLET: {keys: {}},
    APP: {defaultAltCurrency: {isoCode: 'USD'}},
    RATE: {rates: {}, lastDayRates: {}},
  };
  const dispatch: any = jest.fn(action =>
    typeof action === 'function' ? action(dispatch, () => state) : action,
  );
  return getAndDispatchUpdatedWalletBalances(args)(
    dispatch,
    () => state as any,
    undefined,
  );
};

describe('getAndDispatchUpdatedWalletBalances – rate forcing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forces rates along with balances by default', async () => {
    await run({context: 'homeRootOnRefresh'});
    expect(mockStartGetRates).toHaveBeenCalledWith(
      expect.objectContaining({force: true}),
    );
  });

  it('lets launch use cached rates while balances stay forced', async () => {
    await run({context: 'init', forceRateUpdate: false});
    expect(mockStartGetRates).toHaveBeenCalledWith(
      expect.objectContaining({force: false}),
    );
  });

  it('follows force when forceRateUpdate is not given', async () => {
    await run({context: 'init', force: false});
    expect(mockStartGetRates).toHaveBeenCalledWith(
      expect.objectContaining({force: false}),
    );
  });
});
