/**
 * Tests for buy-crypto.reducer.ts
 *
 * Each action handled by buyCryptoReducer is exercised as a pure function:
 *   buyCryptoReducer(state, action) → newState
 *
 * No Redux store or middleware is needed — reducers are pure functions.
 */

import {buyCryptoReducer, BuyCryptoState} from './buy-crypto.reducer';
import {BuyCryptoActionTypes} from './buy-crypto.types';
import {
  BanxaPaymentData,
  MoonpayPaymentData,
  SardinePaymentData,
  SimplexPaymentData,
  TransakPaymentData,
  WyrePaymentData,
} from './buy-crypto.models';
import {RampPaymentData} from './models/ramp.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freshState = (): BuyCryptoState =>
  buyCryptoReducer(undefined, {type: '@@INIT'} as any);

const makeBanxaData = (
  overrides: Partial<BanxaPaymentData> = {},
): BanxaPaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  order_id: 'order-123',
  external_id: 'ext-banxa-1',
  status: 'paymentRequestSent',
  user_id: 'user-abc',
  ...overrides,
});

const makeMoonpayData = (
  overrides: Partial<MoonpayPaymentData> = {},
): MoonpayPaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  external_id: 'ext-moonpay-1',
  status: 'pending',
  user_id: 'user-abc',
  ...overrides,
});

const makeRampData = (
  overrides: Partial<RampPaymentData> = {},
): RampPaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  external_id: 'ext-ramp-1',
  status: 'paymentRequestSent',
  user_id: 'user-abc',
  ...overrides,
});

const makeSardineData = (
  overrides: Partial<SardinePaymentData> = {},
): SardinePaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  external_id: 'ext-sardine-1',
  status: 'pending',
  user_id: 'user-abc',
  ...overrides,
});

const makeSimplexData = (
  overrides: Partial<SimplexPaymentData> = {},
): SimplexPaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  order_id: 'order-simplex-1',
  payment_id: 'pay-simplex-1',
  status: 'paymentRequestSent',
  user_id: 'user-abc',
  ...overrides,
});

const makeTransakData = (
  overrides: Partial<TransakPaymentData> = {},
): TransakPaymentData => ({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf',
  chain: 'btc',
  created_on: 1700000000,
  crypto_amount: 0.001,
  coin: 'BTC',
  env: 'prod',
  fiat_base_amount: 50,
  fiat_total_amount: 55,
  fiat_total_amount_currency: 'USD',
  external_id: 'ext-transak-1',
  status: 'paymentRequestSent',
  user_id: 'user-abc',
  ...overrides,
});

const makeWyreData = (
  overrides: Partial<WyrePaymentData> = {},
): WyrePaymentData => ({
  orderId: 'order-wyre-1',
  env: 'prod',
  created_on: 1700000000,
  status: 'RUNNING_CHECKS',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe('buyCryptoReducer — default state', () => {
  it('returns initialState with empty collections on unknown action', () => {
    const state = freshState();
    expect(state.banxa).toEqual({});
    expect(state.moonpay).toEqual({});
    expect(state.ramp).toEqual({});
    expect(state.sardine).toEqual({});
    expect(state.simplex).toEqual({});
    expect(state.transak).toEqual({});
    expect(state.wyre).toEqual({});
    expect(state.tokens.transak).toEqual({});
    expect(state.opts.selectedPaymentMethod).toBeUndefined();
    expect(state.opts.lastPurchaseData).toBeUndefined();
  });

  it('returns same state reference on unknown action', () => {
    const state = freshState();
    const next = buyCryptoReducer(state, {type: 'UNKNOWN'} as any);
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// UPDATE_OPTS
// ---------------------------------------------------------------------------

describe('UPDATE_OPTS', () => {
  it('merges opts into existing state', () => {
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.UPDATE_OPTS,
      payload: {
        buyCryptoOpts: {
          selectedPaymentMethod: 'debitCard' as any,
          lastPurchaseData: undefined,
        },
      },
    });
    expect(state.opts.selectedPaymentMethod).toBe('debitCard');
  });

  it('merges lastPurchaseData', () => {
    const purchase = {
      coin: 'BTC',
      chain: 'btc',
      fiatAmount: 100,
      fiatCurrency: 'USD',
      date: 1700000000,
      partner: 'banxa',
    };
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.UPDATE_OPTS,
      payload: {
        buyCryptoOpts: {
          selectedPaymentMethod: undefined,
          lastPurchaseData: purchase,
        },
      },
    });
    expect(state.opts.lastPurchaseData).toEqual(purchase);
  });
});

// ---------------------------------------------------------------------------
// BANXA
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_BANXA', () => {
  it('stores the payment data keyed by external_id', () => {
    const data = makeBanxaData({external_id: 'banxa-abc'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_BANXA,
      payload: {banxaPaymentData: data},
    });
    expect(state.banxa['banxa-abc']).toEqual(data);
  });

  it('preserves existing entries when adding a new one', () => {
    const existing = makeBanxaData({external_id: 'banxa-existing'});
    const base: BuyCryptoState = {
      ...freshState(),
      banxa: {'banxa-existing': existing},
    };
    const newData = makeBanxaData({external_id: 'banxa-new'});
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_BANXA,
      payload: {banxaPaymentData: newData},
    });
    expect(Object.keys(state.banxa)).toHaveLength(2);
    expect(state.banxa['banxa-existing']).toEqual(existing);
    expect(state.banxa['banxa-new']).toEqual(newData);
  });
});

describe('UPDATE_PAYMENT_REQUEST_BANXA', () => {
  it('updates status when entry exists', () => {
    const data = makeBanxaData({
      external_id: 'banxa-1',
      status: 'paymentRequestSent',
    });
    const base: BuyCryptoState = {...freshState(), banxa: {'banxa-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_BANXA,
      payload: {
        banxaIncomingData: {banxaExternalId: 'banxa-1', status: 'complete'},
      },
    });
    expect(state.banxa['banxa-1'].status).toBe('complete');
  });

  it('updates order_id via banxaOrderId', () => {
    const data = makeBanxaData({external_id: 'banxa-1', order_id: 'old-order'});
    const base: BuyCryptoState = {...freshState(), banxa: {'banxa-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_BANXA,
      payload: {
        banxaIncomingData: {
          banxaExternalId: 'banxa-1',
          banxaOrderId: 'new-order',
        },
      },
    });
    expect(state.banxa['banxa-1'].order_id).toBe('new-order');
  });

  it('returns unchanged state when external_id not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_BANXA,
      payload: {banxaIncomingData: {banxaExternalId: 'nonexistent'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_BANXA', () => {
  it('removes the entry by external_id', () => {
    const data = makeBanxaData({external_id: 'banxa-del'});
    const base: BuyCryptoState = {...freshState(), banxa: {'banxa-del': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_BANXA,
      payload: {banxaExternalId: 'banxa-del'},
    });
    expect(state.banxa['banxa-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// MOONPAY
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_MOONPAY', () => {
  it('stores the payment data keyed by external_id', () => {
    const data = makeMoonpayData({external_id: 'mp-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_MOONPAY,
      payload: {moonpayPaymentData: data},
    });
    expect(state.moonpay['mp-1']).toEqual(data);
  });
});

describe('UPDATE_PAYMENT_REQUEST_MOONPAY', () => {
  it('updates status when entry exists', () => {
    const data = makeMoonpayData({external_id: 'mp-1', status: 'pending'});
    const base: BuyCryptoState = {...freshState(), moonpay: {'mp-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_MOONPAY,
      payload: {moonpayIncomingData: {externalId: 'mp-1', status: 'completed'}},
    });
    expect(state.moonpay['mp-1'].status).toBe('completed');
  });

  it('updates transaction_id when provided', () => {
    const data = makeMoonpayData({external_id: 'mp-1'});
    const base: BuyCryptoState = {...freshState(), moonpay: {'mp-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_MOONPAY,
      payload: {
        moonpayIncomingData: {externalId: 'mp-1', transactionId: 'tx-mp-1'},
      },
    });
    expect(state.moonpay['mp-1'].transaction_id).toBe('tx-mp-1');
  });

  it('returns unchanged state when entry not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_MOONPAY,
      payload: {moonpayIncomingData: {externalId: 'ghost'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_MOONPAY', () => {
  it('removes the entry', () => {
    const data = makeMoonpayData({external_id: 'mp-del'});
    const base: BuyCryptoState = {...freshState(), moonpay: {'mp-del': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_MOONPAY,
      payload: {externalId: 'mp-del'},
    });
    expect(state.moonpay['mp-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RAMP
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_RAMP', () => {
  it('stores the payment data keyed by external_id', () => {
    const data = makeRampData({external_id: 'ramp-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_RAMP,
      payload: {rampPaymentData: data},
    });
    expect(state.ramp['ramp-1']).toEqual(data);
  });
});

describe('UPDATE_PAYMENT_REQUEST_RAMP', () => {
  it('updates status when entry exists', () => {
    const data = makeRampData({
      external_id: 'ramp-1',
      status: 'paymentRequestSent',
    });
    const base: BuyCryptoState = {...freshState(), ramp: {'ramp-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_RAMP,
      payload: {
        rampIncomingData: {rampExternalId: 'ramp-1', status: 'complete'},
      },
    });
    expect(state.ramp['ramp-1'].status).toBe('complete');
  });

  it('returns unchanged state when entry not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_RAMP,
      payload: {rampIncomingData: {rampExternalId: 'ghost'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_RAMP', () => {
  it('removes the entry', () => {
    const data = makeRampData({external_id: 'ramp-del'});
    const base: BuyCryptoState = {...freshState(), ramp: {'ramp-del': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_RAMP,
      payload: {rampExternalId: 'ramp-del'},
    });
    expect(state.ramp['ramp-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SARDINE
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_SARDINE', () => {
  it('stores the payment data keyed by external_id', () => {
    const data = makeSardineData({external_id: 'sardine-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SARDINE,
      payload: {sardinePaymentData: data},
    });
    expect(state.sardine['sardine-1']).toEqual(data);
  });
});

describe('UPDATE_PAYMENT_REQUEST_SARDINE', () => {
  it('updates status when entry exists', () => {
    const data = makeSardineData({external_id: 'sardine-1', status: 'pending'});
    const base: BuyCryptoState = {
      ...freshState(),
      sardine: {'sardine-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
      payload: {
        sardineIncomingData: {
          sardineExternalId: 'sardine-1',
          status: 'complete',
        },
      },
    });
    expect(state.sardine['sardine-1'].status).toBe('complete');
  });

  it('updates order_id when provided', () => {
    const data = makeSardineData({external_id: 'sardine-1'});
    const base: BuyCryptoState = {
      ...freshState(),
      sardine: {'sardine-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
      payload: {
        sardineIncomingData: {
          sardineExternalId: 'sardine-1',
          order_id: 'oid-1',
        },
      },
    });
    expect(state.sardine['sardine-1'].order_id).toBe('oid-1');
  });

  it('updates crypto_amount when provided', () => {
    const data = makeSardineData({
      external_id: 'sardine-1',
      crypto_amount: 0.001,
    });
    const base: BuyCryptoState = {
      ...freshState(),
      sardine: {'sardine-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
      payload: {
        sardineIncomingData: {
          sardineExternalId: 'sardine-1',
          cryptoAmount: 0.005,
        },
      },
    });
    expect(state.sardine['sardine-1'].crypto_amount).toBe(0.005);
  });

  it('updates transaction_id when provided', () => {
    const data = makeSardineData({external_id: 'sardine-1'});
    const base: BuyCryptoState = {
      ...freshState(),
      sardine: {'sardine-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
      payload: {
        sardineIncomingData: {
          sardineExternalId: 'sardine-1',
          transactionId: 'tx-s-1',
        },
      },
    });
    expect(state.sardine['sardine-1'].transaction_id).toBe('tx-s-1');
  });

  it('returns unchanged state when entry not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SARDINE,
      payload: {sardineIncomingData: {sardineExternalId: 'ghost'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_SARDINE', () => {
  it('removes the entry', () => {
    const data = makeSardineData({external_id: 'sardine-del'});
    const base: BuyCryptoState = {
      ...freshState(),
      sardine: {'sardine-del': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SARDINE,
      payload: {sardineExternalId: 'sardine-del'},
    });
    expect(state.sardine['sardine-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SIMPLEX
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_SIMPLEX', () => {
  it('stores the payment data keyed by payment_id', () => {
    const data = makeSimplexData({payment_id: 'pay-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_SIMPLEX,
      payload: {simplexPaymentData: data},
    });
    expect(state.simplex['pay-1']).toEqual(data);
  });
});

describe('UPDATE_PAYMENT_REQUEST_SIMPLEX', () => {
  it('sets status to success when success==="true"', () => {
    const data = makeSimplexData({
      payment_id: 'pay-1',
      status: 'paymentRequestSent',
    });
    const base: BuyCryptoState = {...freshState(), simplex: {'pay-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX,
      payload: {simplexIncomingData: {paymentId: 'pay-1', success: 'true'}},
    });
    expect(state.simplex['pay-1'].status).toBe('success');
  });

  it('sets status to failed when success!=="true"', () => {
    const data = makeSimplexData({
      payment_id: 'pay-1',
      status: 'paymentRequestSent',
    });
    const base: BuyCryptoState = {...freshState(), simplex: {'pay-1': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX,
      payload: {simplexIncomingData: {paymentId: 'pay-1', success: 'false'}},
    });
    expect(state.simplex['pay-1'].status).toBe('failed');
  });

  it('returns unchanged state when entry not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_SIMPLEX,
      payload: {simplexIncomingData: {paymentId: 'ghost'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_SIMPLEX', () => {
  it('removes the entry', () => {
    const data = makeSimplexData({payment_id: 'pay-del'});
    const base: BuyCryptoState = {...freshState(), simplex: {'pay-del': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_SIMPLEX,
      payload: {paymentId: 'pay-del'},
    });
    expect(state.simplex['pay-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TRANSAK
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_TRANSAK', () => {
  it('stores the payment data keyed by external_id', () => {
    const data = makeTransakData({external_id: 'transak-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_TRANSAK,
      payload: {transakPaymentData: data},
    });
    expect(state.transak['transak-1']).toEqual(data);
  });
});

describe('UPDATE_PAYMENT_REQUEST_TRANSAK', () => {
  it('updates status when entry exists', () => {
    const data = makeTransakData({
      external_id: 'transak-1',
      status: 'paymentRequestSent',
    });
    const base: BuyCryptoState = {
      ...freshState(),
      transak: {'transak-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
      payload: {
        transakIncomingData: {
          transakExternalId: 'transak-1',
          status: 'COMPLETED',
        },
      },
    });
    expect(state.transak['transak-1'].status).toBe('COMPLETED');
  });

  it('updates order_id when provided', () => {
    const data = makeTransakData({external_id: 'transak-1'});
    const base: BuyCryptoState = {
      ...freshState(),
      transak: {'transak-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
      payload: {
        transakIncomingData: {
          transakExternalId: 'transak-1',
          order_id: 'oid-t-1',
        },
      },
    });
    expect(state.transak['transak-1'].order_id).toBe('oid-t-1');
  });

  it('updates crypto_amount when provided', () => {
    const data = makeTransakData({
      external_id: 'transak-1',
      crypto_amount: 0.001,
    });
    const base: BuyCryptoState = {
      ...freshState(),
      transak: {'transak-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
      payload: {
        transakIncomingData: {
          transakExternalId: 'transak-1',
          cryptoAmount: 0.01,
        },
      },
    });
    expect(state.transak['transak-1'].crypto_amount).toBe(0.01);
  });

  it('updates transaction_id when provided', () => {
    const data = makeTransakData({external_id: 'transak-1'});
    const base: BuyCryptoState = {
      ...freshState(),
      transak: {'transak-1': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
      payload: {
        transakIncomingData: {
          transakExternalId: 'transak-1',
          transactionId: 'tx-t-1',
        },
      },
    });
    expect(state.transak['transak-1'].transaction_id).toBe('tx-t-1');
  });

  it('returns unchanged state when entry not found', () => {
    const base = freshState();
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.UPDATE_PAYMENT_REQUEST_TRANSAK,
      payload: {transakIncomingData: {transakExternalId: 'ghost'}},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_TRANSAK', () => {
  it('removes the entry', () => {
    const data = makeTransakData({external_id: 'transak-del'});
    const base: BuyCryptoState = {
      ...freshState(),
      transak: {'transak-del': data},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_TRANSAK,
      payload: {transakExternalId: 'transak-del'},
    });
    expect(state.transak['transak-del']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ACCESS_TOKEN_TRANSAK
// ---------------------------------------------------------------------------

describe('ACCESS_TOKEN_TRANSAK', () => {
  it('stores an access token for the sandbox env', () => {
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.ACCESS_TOKEN_TRANSAK,
      payload: {env: 'sandbox', accessToken: 'tok-sandbox', expiresAt: 9999999},
    });
    expect(state.tokens.transak.sandbox?.accessToken).toBe('tok-sandbox');
    expect(state.tokens.transak.sandbox?.expiresAt).toBe(9999999);
  });

  it('stores an access token for the production env', () => {
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.ACCESS_TOKEN_TRANSAK,
      payload: {env: 'production', accessToken: 'tok-prod', expiresAt: 8888888},
    });
    expect(state.tokens.transak.production?.accessToken).toBe('tok-prod');
    expect(state.tokens.transak.production?.expiresAt).toBe(8888888);
  });

  it('does not affect the other env when updating one', () => {
    let state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.ACCESS_TOKEN_TRANSAK,
      payload: {env: 'sandbox', accessToken: 'tok-sandbox', expiresAt: 9999999},
    });
    state = buyCryptoReducer(state, {
      type: BuyCryptoActionTypes.ACCESS_TOKEN_TRANSAK,
      payload: {env: 'production', accessToken: 'tok-prod', expiresAt: 7777777},
    });
    expect(state.tokens.transak.sandbox?.accessToken).toBe('tok-sandbox');
    expect(state.tokens.transak.production?.accessToken).toBe('tok-prod');
  });
});

// ---------------------------------------------------------------------------
// WYRE
// ---------------------------------------------------------------------------

describe('SUCCESS_PAYMENT_REQUEST_WYRE', () => {
  it('stores the payment data keyed by orderId', () => {
    const data = makeWyreData({orderId: 'wyre-1'});
    const state = buyCryptoReducer(freshState(), {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_WYRE,
      payload: {wyrePaymentData: data},
    });
    expect(state.wyre['wyre-1']).toBeDefined();
    expect(state.wyre['wyre-1'].orderId).toBe('wyre-1');
  });

  it('returns unchanged state when orderId is missing', () => {
    const base = freshState();
    const data: WyrePaymentData = {env: 'prod', created_on: 1700000000} as any;
    const next = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.SUCCESS_PAYMENT_REQUEST_WYRE,
      payload: {wyrePaymentData: data},
    });
    expect(next).toBe(base);
  });
});

describe('REMOVE_PAYMENT_REQUEST_WYRE', () => {
  it('removes the entry by orderId', () => {
    const data = makeWyreData({orderId: 'wyre-del'});
    const base: BuyCryptoState = {...freshState(), wyre: {'wyre-del': data}};
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE,
      payload: {orderId: 'wyre-del'},
    });
    expect(state.wyre['wyre-del']).toBeUndefined();
  });

  it('does not affect other wyre entries', () => {
    const keep = makeWyreData({orderId: 'wyre-keep'});
    const del = makeWyreData({orderId: 'wyre-del'});
    const base: BuyCryptoState = {
      ...freshState(),
      wyre: {'wyre-keep': keep, 'wyre-del': del},
    };
    const state = buyCryptoReducer(base, {
      type: BuyCryptoActionTypes.REMOVE_PAYMENT_REQUEST_WYRE,
      payload: {orderId: 'wyre-del'},
    });
    expect(state.wyre['wyre-keep']).toEqual(keep);
    expect(state.wyre['wyre-del']).toBeUndefined();
  });
});
