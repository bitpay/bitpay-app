import {swapCryptoReducer} from './swap-crypto.reducer';
import {SwapCryptoActions} from './index';
import {moonpaySwapTxData} from './swap-crypto.models';
import {MoonpaySwapStatus} from './models/moonpay-swap.models';

const freshState = () => swapCryptoReducer(undefined, {type: '@@INIT'} as any);

const moonpayTx = (txId: string): moonpaySwapTxData => ({
  txId,
  txHash: '0xhash',
  date: 1793639245000,
  amountTo: 4.908864,
  coinTo: 'usdc',
  chainTo: 'base',
  addressTo: '0xto',
  walletIdTo: 'wallet-to',
  amountFrom: 0.05357334,
  coinFrom: 'sol',
  chainFrom: 'sol',
  refundAddress: 'refund',
  payinAddress: 'payin',
  totalExchangeFee: 0.08,
  status: MoonpaySwapStatus.submitted,
});

describe('swapCryptoReducer - MoonPay', () => {
  it('starts with an empty MoonPay history', () => {
    expect(freshState().moonpay).toEqual({});
  });

  it('saves a swap keyed by its swaps.xyz txId', () => {
    const state = swapCryptoReducer(
      freshState(),
      SwapCryptoActions.successTxMoonpay({moonpaySwapTxData: moonpayTx('a')}),
    );
    expect(Object.keys(state.moonpay)).toEqual(['a']);
    expect(state.moonpay.a.amountTo).toBe(4.908864);
  });

  it('replaces a saved swap when its status is updated', () => {
    let state = swapCryptoReducer(
      freshState(),
      SwapCryptoActions.successTxMoonpay({moonpaySwapTxData: moonpayTx('a')}),
    );
    state = swapCryptoReducer(
      state,
      SwapCryptoActions.successTxMoonpay({
        moonpaySwapTxData: {
          ...moonpayTx('a'),
          status: MoonpaySwapStatus.completed,
        },
      }),
    );
    expect(Object.keys(state.moonpay)).toEqual(['a']);
    expect(state.moonpay.a.status).toBe(MoonpaySwapStatus.completed);
  });

  it('removes only the requested swap', () => {
    let state = freshState();
    for (const id of ['a', 'b']) {
      state = swapCryptoReducer(
        state,
        SwapCryptoActions.successTxMoonpay({moonpaySwapTxData: moonpayTx(id)}),
      );
    }
    state = swapCryptoReducer(
      state,
      SwapCryptoActions.removeTxMoonpay({txId: 'a'}),
    );
    expect(Object.keys(state.moonpay)).toEqual(['b']);
  });

  it('leaves Changelly and Thorswap history alone', () => {
    const state = swapCryptoReducer(
      freshState(),
      SwapCryptoActions.successTxMoonpay({moonpaySwapTxData: moonpayTx('a')}),
    );
    expect(state.changelly).toEqual({});
    expect(state.thorswap).toEqual({});
  });
});
