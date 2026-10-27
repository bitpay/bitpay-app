jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('ethers', () => {
  // test/setup.js stubs BigNumber as a spy; this test needs the real numeric parsing
  const {BigNumber, constants, utils} = jest.requireActual('ethers');

  return {BigNumber, constants, ethers: {BigNumber, constants, utils}, utils};
});

jest.mock('../../../../managers/TokenManager', () => ({
  tokenManager: {getTokenOptions: () => ({tokenOptionsByAddress: {}})},
}));

import configureTestStore from '@test/store';
import {processSwapRequest} from '../../../../utils/helper-methods';
import {buildTransactionProposal, createTxProposal} from './send';
import {ethers} from 'ethers';
import {abiERC20} from '../../../../navigation/wallet-connect/constants/abis/abi-erc20';

const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
const ACCOUNT_B = '0x2222222222222222222222222222222222222222';
const ONE_ETH_WEI = '1000000000000000000';

const dispatch = (action: any): any =>
  typeof action === 'function' ? action(dispatch, () => ({} as any)) : action;

const buildRequest = (swapAmount?: string) =>
  ({
    params: {
      chainId: 'eip155:1',
      request: {
        method: 'eth_sendTransaction',
        params: [
          {
            data: '0x',
            from: ACCOUNT_A,
            gasLimit: '0x5208',
            gasPrice: '0x1',
            to: ACCOUNT_B,
            value: '0xde0b6b3a7640000',
          },
        ],
      },
    },
    swapAmount,
    swapFromChain: 'eth',
    swapFromCurrencyAbbreviation: 'eth',
  } as any);

const buildProposal = (swapAmount?: string) =>
  dispatch(
    buildTransactionProposal({
      chain: 'eth',
      context: 'walletConnect',
      currency: 'eth',
      request: buildRequest(swapAmount),
      toAddress: ACCOUNT_B,
    } as any),
  );

describe('a transaction requested over walletConnect', () => {
  const walletState = () =>
    ({
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      RATE: {rates: {}},
      WALLET: {
        customTokenOptionsByAddress: {},
        keys: {
          'key-1': {
            wallets: [
              {
                chain: 'eth',
                currencyAbbreviation: 'eth',
                network: 'livenet',
                receiveAddress: ACCOUNT_A,
              },
            ],
          },
        },
      },
    } as any);

  const walletDispatch = (action: any): any =>
    typeof action === 'function' ? action(walletDispatch, walletState) : action;

  it('proposes the amount the dapp asked for, not zero', async () => {
    const event = {
      id: 1,
      params: {
        chainId: 'eip155:1',
        request: {
          method: 'eth_sendTransaction',
          params: [
            {
              data: '0x',
              from: ACCOUNT_A,
              gasLimit: '0x5208',
              gasPrice: '0x1',
              to: ACCOUNT_B,
              value: '0xde0b6b3a7640000',
            },
          ],
        },
      },
      topic: 'topic-1',
    } as any;

    const summary = await walletDispatch(processSwapRequest(event));
    const txp: any = await dispatch(
      buildTransactionProposal({
        chain: 'eth',
        context: 'walletConnect',
        currency: 'eth',
        request: {...event, ...summary},
        toAddress: ACCOUNT_B,
      } as any),
    );

    expect(txp.amount).toBe(Number(ONE_ETH_WEI));
  });

  it.each(['approve', 'approveAndCall'])(
    'preserves an unlimited %s summary and the original transaction proposal',
    async functionName => {
      const spender = '0x3333333333333333333333333333333333333333';
      const maxAllowance = ethers.BigNumber.from(
        '0x' + 'f'.repeat(64),
      ).toString();
      const args = [spender, maxAllowance];
      if (functionName === 'approveAndCall') {
        args.push('0x1234');
      }
      const data = new ethers.utils.Interface(abiERC20).encodeFunctionData(
        functionName,
        args,
      );
      const event = {...buildRequest(), id: 1, topic: 'topic-1'};
      event.params.request.params[0].data = data;

      const summary = await walletDispatch(processSwapRequest(event));
      const request = {...event, ...summary};
      const txp: any = await dispatch(
        buildTransactionProposal({
          chain: 'eth',
          context: 'walletConnect',
          currency: 'eth',
          request,
          toAddress: ACCOUNT_B,
        } as any),
      );

      expect(request.tokenApproval).toEqual({
        functionName,
        spender,
        amount: maxAllowance,
        isUnlimited: true,
      });
      expect(summary.swapAmount).toBe(ONE_ETH_WEI);
      expect(txp.amount).toBe(Number(ONE_ETH_WEI));
      expect(txp.outputs).toEqual([
        expect.objectContaining({
          toAddress: ACCOUNT_B,
          amount: Number(ONE_ETH_WEI),
          data,
        }),
      ]);
    },
  );
});

describe('buildTransactionProposal for walletConnect', () => {
  it('carries the request amount into the proposal', async () => {
    const txp: any = await buildProposal(ONE_ETH_WEI);

    expect(txp.amount).toBe(Number(ONE_ETH_WEI));
    expect(txp.outputs[0].amount).toBe(Number(ONE_ETH_WEI));
  });

  it('builds a zero amount proposal when the request carries none', async () => {
    const txp: any = await buildProposal(undefined);

    expect(txp.amount).toBe(0);
    expect(txp.outputs[0].amount).toBe(0);
  });
});

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
