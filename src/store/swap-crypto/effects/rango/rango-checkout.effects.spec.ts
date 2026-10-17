/**
 * Tests for the Rango checkout orchestration.
 *
 * These cover the decisions that protect the user rather than the happy path:
 * that a moved rate aborts instead of signing, that an unmet allowance stops
 * before a proposal is built, that a route we cannot sign is refused, and that
 * the order is recorded before any polling so a killed app does not lose it.
 *
 * No network and no credentials — the HTTP layer and the wallet's proposal
 * builder are both mocked.
 */

import configureTestStore from '@test/store';

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('./rango', () => ({
  rangoGetSwapQuote: jest.fn(),
  rangoCreateSwapTx: jest.fn(),
  rangoGetStatus: jest.fn(),
  rangoIsApproved: jest.fn(),
  rangoReportFailure: jest.fn(() => Promise.resolve()),
  rangoGetCurrencies: jest.fn(),
  rangoGetSupportedChains: jest.fn(),
}));

jest.mock('../../../wallet/effects/send/send', () => ({
  createTxProposal: jest.fn(() => () => Promise.resolve({id: 'ctxp-1'})),
}));

import {rangoCreateSwapTx, rangoGetStatus, rangoReportFailure} from './rango';
import {createTxProposal} from '../../../wallet/effects/send/send';
import {
  rangoCreateCheckoutTx,
  RangoRateMovedError,
  rangoTrackSwap,
  saveRangoTx,
} from './rango-checkout.effects';
import {rangoPollStatus} from './rango-swap.effects';

const mockCreateSwapTx = rangoCreateSwapTx as jest.Mock;
const mockGetStatus = rangoGetStatus as jest.Mock;
const mockReportFailure = rangoReportFailure as jest.Mock;
const mockCreateTxProposal = createTxProposal as unknown as jest.Mock;

const wallet = (over: Partial<any> = {}): any => ({
  id: 'wallet-1',
  chain: 'btc',
  currencyAbbreviation: 'btc',
  tokenAddress: undefined,
  ...over,
});

const transferTx = {
  type: 'TRANSFER',
  method: 'transfer',
  blockChain: 'BTC',
  fromWalletAddress: 'bc1qsender',
  recipientAddress: 'bc1q6csj53wdrzyzextj2syljvhh0vhynyrx904gp8',
  memo: '=:e:0xabc:1/1:rg:0',
  memoType: 'UTF8',
  amount: '9990000',
  decimals: 8,
};

const swapResponse = (over: Partial<any> = {}) => ({
  requestId: 'req-1',
  resultType: 'OK',
  route: {
    outputAmount: '1000',
    outputAmountMin: '990',
    feeUsd: 0.2,
    swapper: {id: 'Thorchain', title: 'Thorchain'},
  },
  error: null,
  tx: transferTx,
  ...over,
});

const baseParams = {
  fromWallet: wallet(),
  toWallet: wallet({id: 'wallet-2', chain: 'eth', currencyAbbreviation: 'eth'}),
  fromAddress: 'bc1qsender',
  toAddress: '0xrecipient',
  amount: '10000000',
  slippage: 1.5,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateTxProposal.mockImplementation(
    () => () => Promise.resolve({id: 'ctxp-1'}),
  );
});

describe('rangoCreateCheckoutTx', () => {
  it('builds a proposal when the route is usable', async () => {
    mockCreateSwapTx.mockResolvedValue(swapResponse());
    const store = configureTestStore({});

    const result = await store.dispatch(rangoCreateCheckoutTx(baseParams));

    expect(result.requestId).toBe('req-1');
    expect(result.ctxp).toEqual({id: 'ctxp-1'});
    expect(mockCreateTxProposal).toHaveBeenCalled();
  });

  it('aborts when the rate moved below the accepted minimum', async () => {
    // Accepted 990; the swap call comes back guaranteeing only 900.
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({
        route: {outputAmount: '910', outputAmountMin: '900', feeUsd: 0.2},
      }),
    );
    const store = configureTestStore({});

    await expect(
      store.dispatch(
        rangoCreateCheckoutTx({
          ...baseParams,
          acceptedOutputAmountMin: '990',
        }),
      ),
    ).rejects.toBeInstanceOf(RangoRateMovedError);

    // Nothing may be built once the quote is rejected.
    expect(mockCreateTxProposal).not.toHaveBeenCalled();
  });

  it('releases the route reservation when it aborts on a moved rate', async () => {
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({
        route: {outputAmount: '910', outputAmountMin: '900'},
      }),
    );
    const store = configureTestStore({});

    await store
      .dispatch(
        rangoCreateCheckoutTx({
          ...baseParams,
          acceptedOutputAmountMin: '990',
        }),
      )
      .catch(() => undefined);

    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({requestId: 'req-1', eventType: 'USER_REJECT'}),
    );
  });

  it('proceeds when the rate improved', async () => {
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({
        route: {outputAmount: '1100', outputAmountMin: '1050'},
      }),
    );
    const store = configureTestStore({});

    const result = await store.dispatch(
      rangoCreateCheckoutTx({...baseParams, acceptedOutputAmountMin: '990'}),
    );

    expect(result.ctxp).toBeDefined();
  });

  it('returns the approval and builds nothing when an allowance is missing', async () => {
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({
        tx: {
          type: 'EVM',
          blockChain: 'ETH',
          from: '0xsender',
          txTo: '0xrouter',
          txData: '0xdead',
          value: '0x0',
          gasLimit: '0x1e1d67',
          gasPrice: null,
          approveTo: '0xspender',
          approveData: '0x095ea7b3',
        },
      }),
    );
    const store = configureTestStore({});

    const result = await store.dispatch(
      rangoCreateCheckoutTx({
        ...baseParams,
        fromWallet: wallet({chain: 'eth', currencyAbbreviation: 'eth'}),
      }),
    );

    expect(result.approval).toEqual({
      // approveTo is the contract the approve is sent to; spenderAddress is
      // who receives the allowance, parsed out of the calldata when it is
      // long enough and falling back to approveTo when it is not.
      approveTo: '0xspender',
      spenderAddress: '0xspender',
      data: '0x095ea7b3',
    });
    // The proposal must be built against the NEW allowance, so not yet.
    expect(result.ctxp).toBeUndefined();
    expect(mockCreateTxProposal).not.toHaveBeenCalled();
  });

  it('refuses a route the wallet cannot sign', async () => {
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({tx: {type: 'SOLANA', blockChain: 'SOLANA'}}),
    );
    const store = configureTestStore({});

    await expect(
      store.dispatch(rangoCreateCheckoutTx(baseParams)),
    ).rejects.toThrow(/cannot sign/);
  });

  it('refuses an unusable route rather than building from a null tx', async () => {
    mockCreateSwapTx.mockResolvedValue(
      swapResponse({resultType: 'NO_ROUTE', route: null, tx: null}),
    );
    const store = configureTestStore({});

    await expect(
      store.dispatch(rangoCreateCheckoutTx(baseParams)),
    ).rejects.toThrow();
    expect(mockCreateTxProposal).not.toHaveBeenCalled();
  });

  it('releases the reservation when the proposal cannot be created', async () => {
    mockCreateSwapTx.mockResolvedValue(swapResponse());
    mockCreateTxProposal.mockImplementation(
      () => () => Promise.reject(new Error('insufficient funds')),
    );
    const store = configureTestStore({});

    await expect(
      store.dispatch(rangoCreateCheckoutTx(baseParams)),
    ).rejects.toThrow(/insufficient funds/);

    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({eventType: 'FETCH_TX_FAILED'}),
    );
  });
});

describe('saveRangoTx', () => {
  it('records the order as running, keyed on requestId', async () => {
    mockCreateSwapTx.mockResolvedValue(swapResponse());
    const store = configureTestStore({});

    const prepared = await store.dispatch(rangoCreateCheckoutTx(baseParams));

    store.dispatch(
      saveRangoTx({
        prepared,
        txid: '0xbroadcast',
        fromWallet: baseParams.fromWallet,
        toWallet: baseParams.toWallet,
        toAddress: '0xrecipient',
        amountFrom: 0.1,
        amountTo: 1.5,
      }),
    );

    const saved = store.getState().SWAP_CRYPTO.rango['req-1'];
    expect(saved).toBeDefined();
    // Persisted BEFORE polling, so a killed app still shows the swap.
    expect(saved.status).toBe('running');
    expect(saved.txHash).toBe('0xbroadcast');
  });
});

describe('rangoPollStatus', () => {
  it('stops immediately when the caller has cancelled', async () => {
    const store = configureTestStore({});

    await store.dispatch(
      rangoPollStatus('req-1', '0xabc', {
        cancelled: () => true,
        intervalMs: 1,
        timeoutMs: 50,
      }),
    );

    // Must not even ask once — the screen is gone.
    expect(mockGetStatus).not.toHaveBeenCalled();
  });

  it('returns as soon as the swap settles', async () => {
    mockGetStatus.mockResolvedValue({status: 'success', outputAmount: '1000'});
    const store = configureTestStore({});

    const res = await store.dispatch(
      rangoPollStatus('req-1', '0xabc', {intervalMs: 1, timeoutMs: 500}),
    );

    expect(res?.status).toBe('success');
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps polling through a transient failure', async () => {
    mockGetStatus
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({status: 'failed'});
    const store = configureTestStore({});

    const res = await store.dispatch(
      rangoPollStatus('req-1', '0xabc', {intervalMs: 1, timeoutMs: 500}),
    );

    // A broadcast swap must not be abandoned because one poll failed.
    expect(res?.status).toBe('failed');
    expect(mockGetStatus).toHaveBeenCalledTimes(2);
  });
});

describe('rangoTrackSwap', () => {
  it('updates a stored order when the swap settles', async () => {
    mockCreateSwapTx.mockResolvedValue(swapResponse());
    mockGetStatus.mockResolvedValue({status: 'success'});
    const store = configureTestStore({});

    const prepared = await store.dispatch(rangoCreateCheckoutTx(baseParams));
    store.dispatch(
      saveRangoTx({
        prepared,
        txid: '0xbroadcast',
        fromWallet: baseParams.fromWallet,
        toWallet: baseParams.toWallet,
        toAddress: '0xrecipient',
        amountFrom: 0.1,
        amountTo: 1.5,
      }),
    );

    await store.dispatch(
      rangoTrackSwap({requestId: 'req-1', txid: '0xbroadcast'}),
    );

    expect(store.getState().SWAP_CRYPTO.rango['req-1'].status).toBe('success');
  });

  it('leaves the order alone when tracking was cancelled', async () => {
    mockCreateSwapTx.mockResolvedValue(swapResponse());
    mockGetStatus.mockResolvedValue({status: 'success'});
    const store = configureTestStore({});

    const prepared = await store.dispatch(rangoCreateCheckoutTx(baseParams));
    store.dispatch(
      saveRangoTx({
        prepared,
        txid: '0xbroadcast',
        fromWallet: baseParams.fromWallet,
        toWallet: baseParams.toWallet,
        toAddress: '0xrecipient',
        amountFrom: 0.1,
        amountTo: 1.5,
      }),
    );

    await store.dispatch(
      rangoTrackSwap({
        requestId: 'req-1',
        txid: '0xbroadcast',
        cancelled: () => true,
      }),
    );

    expect(store.getState().SWAP_CRYPTO.rango['req-1'].status).toBe('running');
  });
});
