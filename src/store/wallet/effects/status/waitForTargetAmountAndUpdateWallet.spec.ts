import {startUpdateWalletStatus} from './status';
import {waitForTargetAmountAndUpdateWallet} from './waitForTargetAmountAndUpdateWallet';

jest.mock('react-native', () => ({
  DeviceEventEmitter: {emit: jest.fn()},
}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {error: jest.fn(), warn: jest.fn()},
}));

jest.mock('../../../portfolio', () => ({
  populatePortfolio: jest.fn(() => ({type: 'POPULATE_PORTFOLIO'})),
}));

jest.mock('../../wallet.actions', () => ({
  updatePortfolioBalance: jest.fn(() => ({type: 'UPDATE_PORTFOLIO_BALANCE'})),
}));

jest.mock('../../utils/wallet', () => ({findWalletById: jest.fn()}));

jest.mock('./status', () => ({
  startUpdateWalletStatus: jest.fn(() => ({type: 'UPDATE_WALLET_STATUS'})),
}));

const advancePoll = async () => {
  jest.advanceTimersByTime(5000);
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe('waitForTargetAmountAndUpdateWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each(['sol', 'xrp'])(
    'waits for the %s balance minus reserve instead of pending proposal locks',
    async chain => {
      let totalAmount = 1000;
      const key = {id: 'key-1'} as any;
      const wallet = {
        id: 'wallet-1',
        chain,
        credentials: {},
        balance: {sat: 900},
        getStatus: jest.fn((_opts, cb) =>
          cb(null, {
            balance: {
              totalAmount,
              reserve: 100,
              lockedConfirmedAmount: 10_000,
            },
          }),
        ),
      } as any;
      const getState = () => ({APP: {defaultAltCurrency: {isoCode: 'USD'}}});
      const dispatch = jest.fn((action: any): any =>
        typeof action === 'function' ? action(dispatch, getState) : action,
      );

      await dispatch(
        waitForTargetAmountAndUpdateWallet({key, wallet, targetAmount: 700}),
      );
      await advancePoll();

      expect(wallet.getStatus).toHaveBeenCalledTimes(1);
      expect(startUpdateWalletStatus).not.toHaveBeenCalled();

      totalAmount = 800;
      await advancePoll();

      expect(wallet.getStatus).toHaveBeenCalledTimes(2);
      expect(startUpdateWalletStatus).toHaveBeenCalledWith({
        key,
        wallet,
        force: true,
      });
    },
  );
});
