import configureTestStore from '@test/store';
import {createTxProposal} from './send';

const makeTssBchWallet = (overrides: any = {}) =>
  ({
    tssKeyId: 'tss-key-1',
    credentials: {chain: 'bch'},
    createTxProposal: jest.fn((txp: any, cb: any) => cb(null, txp)),
    ...overrides,
  } as any);

describe('createTxProposal', () => {
  it('forces signingMethod ecdsa for a TSS BCH wallet', async () => {
    const store = configureTestStore({});
    const wallet = makeTssBchWallet();

    await store.dispatch(createTxProposal(wallet, {amount: 1}) as any);

    expect(wallet.createTxProposal.mock.calls[0][0]).toEqual({
      amount: 1,
      signingMethod: 'ecdsa',
    });
  });

  it('leaves signingMethod untouched for a non-TSS BCH wallet', async () => {
    const store = configureTestStore({});
    const wallet = makeTssBchWallet({tssKeyId: undefined});

    await store.dispatch(createTxProposal(wallet, {amount: 1}) as any);

    expect(wallet.createTxProposal.mock.calls[0][0]).toEqual({amount: 1});
  });

  it('leaves signingMethod untouched for a TSS wallet on another chain', async () => {
    const store = configureTestStore({});
    const wallet = makeTssBchWallet({credentials: {chain: 'btc'}});

    await store.dispatch(createTxProposal(wallet, {amount: 1}) as any);

    expect(wallet.createTxProposal.mock.calls[0][0]).toEqual({amount: 1});
  });
});
