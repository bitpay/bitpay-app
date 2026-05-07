import configureTestStore from '@test/store';
import {showWalletError} from './errors';
import {showBottomNotificationModal} from '../../../app/app.actions';
import {ongoingProcessManager} from '../../../../managers/OngoingProcessManager';

// Mock sleep so tests run without real delays
jest.mock('../../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../../utils/helper-methods'),
  sleep: jest.fn(() => Promise.resolve()),
}));

// Spy on ongoingProcessManager.hide
jest.mock('../../../../managers/OngoingProcessManager', () => ({
  ongoingProcessManager: {
    hide: jest.fn(),
    show: jest.fn(),
  },
}));

// Mock showBottomNotificationModal so we can inspect the dispatched payload
jest.mock('../../../app/app.actions', () => ({
  ...jest.requireActual('../../../app/app.actions'),
  showBottomNotificationModal: jest.fn(payload => ({
    type: 'MOCK_SHOW_BOTTOM_NOTIFICATION',
    payload,
  })),
  dismissBottomNotificationModal: jest.fn(() => ({
    type: 'MOCK_DISMISS_BOTTOM_NOTIFICATION',
  })),
}));

const mockedShow = showBottomNotificationModal as jest.Mock;

describe('showWalletError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the ongoing process loader before showing the error', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError());
    expect(ongoingProcessManager.hide).toHaveBeenCalledTimes(1);
  });

  it('dispatches showBottomNotificationModal with type error', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError());
    expect(mockedShow).toHaveBeenCalledTimes(1);
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.type).toBe('error');
    expect(payload.enableBackdropDismiss).toBe(true);
  });

  it('shows default title/message for unknown/undefined type', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError());
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('Error');
    expect(payload.message).toBe('Unknown Error');
  });

  it('shows correct message for walletNotSupported', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('walletNotSupported'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('Wallet not supported');
    expect(payload.message).toContain('not supported');
  });

  it('shows correct message for walletNotSupportedToBuy', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('walletNotSupportedToBuy'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('Wallet not supported');
    expect(payload.message).toContain('buying');
  });

  it('shows correct message for noSpendableFunds', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('noSpendableFunds'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No spendable balance');
  });

  it('shows correct message for needsBackup', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('needsBackup'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('Needs backup');
  });

  it('shows correct message for walletNotCompleted', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('walletNotCompleted'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('Incomplete Wallet');
  });

  it('shows generic no-coin message for noWalletsAbleToBuy without coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('noWalletsAbleToBuy'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No wallets');
    expect(payload.message).toContain('No wallets available to receive funds.');
  });

  it('shows coin-specific message for noWalletsAbleToBuy with coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('noWalletsAbleToBuy', 'btc'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No wallets');
    // message template receives coin
    expect(payload.message).toBeDefined();
  });

  it('shows correct message for noWalletsAbleToSell without coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('noWalletsAbleToSell'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No wallets');
    expect(payload.message).toContain('sell crypto');
  });

  it('shows correct message for noWalletsAbleToSell with coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('noWalletsAbleToSell', 'eth'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No wallets');
  });

  it('shows correct message for keysNoSupportedWallet without coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('keysNoSupportedWallet'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No supported wallets');
    expect(payload.message).toContain('supported wallets able to buy crypto');
  });

  it('shows correct message for keysNoSupportedWallet with coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('keysNoSupportedWallet', 'eth'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No supported wallets');
  });

  it('shows correct message for keysNoSupportedWalletToSell without coin', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('keysNoSupportedWalletToSell'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No supported wallets');
    expect(payload.message).toContain('sell crypto');
  });

  it('shows correct message for emptyKeyList', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('emptyKeyList'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No keys with supported wallets');
    expect(payload.message).toContain('receive funds');
  });

  it('shows correct message for emptyKeyListToSend', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('emptyKeyListToSend'));
    const payload = mockedShow.mock.calls[0][0];
    expect(payload.title).toBe('No keys with supported wallets');
    expect(payload.message).toContain('send funds');
  });

  it('includes an OK action that dispatches dismissBottomNotificationModal', async () => {
    const store = configureTestStore({});
    await store.dispatch(showWalletError('needsBackup'));
    const payload = mockedShow.mock.calls[0][0];
    expect(Array.isArray(payload.actions)).toBe(true);
    const okAction = payload.actions[0];
    expect(okAction.text).toBe('OK');
    expect(okAction.primary).toBe(true);
    // Calling the action should dispatch dismiss
    okAction.action();
    const {dismissBottomNotificationModal} = jest.requireMock(
      '../../../app/app.actions',
    );
    expect(dismissBottomNotificationModal).toHaveBeenCalledTimes(1);
  });
});
