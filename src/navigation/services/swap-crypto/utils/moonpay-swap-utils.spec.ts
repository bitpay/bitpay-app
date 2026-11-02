import {
  getChainFromMoonpaySwapChainId,
  getMoonpaySwapActionMismatch,
  getMoonpaySwapSourceTokenFee,
  getEstimatedTimeStrFromSeconds,
  getMoonpaySwapChainId,
  getMoonpaySwapError,
  getMoonpaySwapErrorMessage,
  getMoonpaySwapTokenAddress,
  isCoinSupportedByMoonpaySwap,
  isMoonpaySwapDepositFlow,
  isMoonpaySwapDepositTx,
  isMoonpaySwapEvmTx,
  MOONPAY_SWAP_NATIVE_TOKEN_ADDRESS,
  moonpaySwapGetStatusColor,
  moonpaySwapGetStatusDetails,
  moonpaySwapToUnitAmount,
} from './moonpay-swap-utils';
import {MoonpaySwapStatus} from '../../../../store/swap-crypto/models/moonpay-swap.models';

describe('moonpay-swap-utils', () => {
  describe('isCoinSupportedByMoonpaySwap', () => {
    it('supports native coins on their own chain', () => {
      expect(isCoinSupportedByMoonpaySwap('btc', 'btc')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('SOL', 'SOL')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('pol', 'matic')).toBe(true);
    });

    it('supports ETH as the gas token of L2s', () => {
      expect(isCoinSupportedByMoonpaySwap('eth', 'base')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('eth', 'arb')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('eth', 'op')).toBe(true);
    });

    it('supports listed tokens and rejects the rest', () => {
      expect(isCoinSupportedByMoonpaySwap('usdc', 'base')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('foo', 'eth')).toBe(false);
      expect(isCoinSupportedByMoonpaySwap('trx', 'trx')).toBe(false);
    });

    it('matches by coin when no chain is given', () => {
      expect(isCoinSupportedByMoonpaySwap('btc', '')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('usdt', '')).toBe(true);
      expect(isCoinSupportedByMoonpaySwap('foo', '')).toBe(false);
    });
  });

  it('maps chains to swaps.xyz chain ids and back', () => {
    expect(getMoonpaySwapChainId('SOL')).toBe(1399811149);
    expect(getMoonpaySwapChainId('base')).toBe(8453);
    expect(getMoonpaySwapChainId('trx')).toBeUndefined();
    expect(getChainFromMoonpaySwapChainId(999000313)).toBe('btc');
    expect(getChainFromMoonpaySwapChainId(1)).toBe('eth');
    expect(getChainFromMoonpaySwapChainId(12345)).toBeUndefined();
  });

  it('uses the zero address for native tokens', () => {
    expect(getMoonpaySwapTokenAddress(undefined)).toBe(
      MOONPAY_SWAP_NATIVE_TOKEN_ADDRESS,
    );
    expect(getMoonpaySwapTokenAddress('0xabc')).toBe('0xabc');
  });

  it('uses the deposit flow for every non-EVM source', () => {
    expect(isMoonpaySwapDepositFlow('btc')).toBe(true);
    expect(isMoonpaySwapDepositFlow('sol')).toBe(true);
    expect(isMoonpaySwapDepositFlow('xrp')).toBe(true);
    expect(isMoonpaySwapDepositFlow('eth')).toBe(false);
    expect(isMoonpaySwapDepositFlow('base')).toBe(false);
  });

  it('tells contract calls from deposit transactions', () => {
    const evmTx = {to: '0xrouter', data: '0x1234', value: '0'};
    const depositTx = {
      to: 'HPwTt55NmJEmhzf92RiRfC5eWZVzeXBHva45qXPVyLti',
      value: '21411000',
      toExtra: null,
      chainId: 1399811149,
      chainKey: 'solana_mainnet',
    };
    expect(isMoonpaySwapEvmTx(evmTx)).toBe(true);
    expect(isMoonpaySwapDepositTx(evmTx)).toBe(false);
    expect(isMoonpaySwapEvmTx(depositTx)).toBe(false);
    expect(isMoonpaySwapDepositTx(depositTx)).toBe(true);
  });

  describe('getMoonpaySwapActionMismatch', () => {
    const request = {amount: '53573342', srcChainId: 1399811149};
    // From the Solana to Base swap run on 2026-11-02
    const deposit = {
      amountIn: {amount: '53573342'},
      amountInMax: {amount: '53573342'},
      tx: {
        to: '3eonEkA9xc7XFmrNMD1iEjo4tGUD1mMjZNXRkk2VF6Wk',
        value: '53573342',
        toExtra: null,
        chainId: 1399811149,
        chainKey: 'solana_mainnet',
      },
    } as any;
    const erc20 = {
      amountIn: {amount: '1500000'},
      amountInMax: {amount: '1500000'},
      tx: {to: '0xrouter', data: '0x1234', value: '0', chainId: 8453},
    } as any;

    it('accepts an action built for the request', () => {
      expect(getMoonpaySwapActionMismatch(request, deposit, true)).toBe(
        undefined,
      );
      expect(
        getMoonpaySwapActionMismatch(
          {amount: '1500000', srcChainId: 8453},
          erc20,
          false,
        ),
      ).toBe(undefined);
    });

    it('rejects a different amount', () => {
      expect(
        getMoonpaySwapActionMismatch(
          request,
          {...deposit, amountIn: {amount: '60000000'}},
          true,
        ),
      ).toBe('amountIn');
      expect(
        getMoonpaySwapActionMismatch(
          {amount: '1500000', srcChainId: 8453},
          {...erc20, amountInMax: {amount: '2000000'}},
          false,
        ),
      ).toBe('amountInMax');
    });

    it('rejects a deposit for a different value or chain', () => {
      expect(
        getMoonpaySwapActionMismatch(
          request,
          {...deposit, tx: {...deposit.tx, value: '60000000'}},
          true,
        ),
      ).toBe('value');
      expect(
        getMoonpaySwapActionMismatch(
          request,
          {...deposit, tx: {...deposit.tx, chainId: 1}},
          true,
        ),
      ).toBe('chainId');
    });

    it('rejects amounts it cannot read', () => {
      expect(
        getMoonpaySwapActionMismatch(
          request,
          {...deposit, amountIn: {amount: '1.5'}},
          true,
        ),
      ).toBe('unreadable amounts');
    });
  });

  it('adds up only the fees charged in the source token', () => {
    const usdc = {
      chainId: 8453,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    };
    const fees = {
      amountIn: {...usdc, amount: '5000000'},
      applicationFee: {...usdc, amount: '50000'},
      protocolFee: {...usdc, address: usdc.address.toLowerCase(), amount: '0'},
      bridgeFee: {
        chainId: 8453,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        amount: '1000000000000000',
      },
    } as any;
    expect(getMoonpaySwapSourceTokenFee(fees)).toBeCloseTo(0.05);
    expect(
      getMoonpaySwapSourceTokenFee({...fees, bridgeFee: undefined}),
    ).toBeCloseTo(0.05);
  });

  it('converts base units to unit amounts', () => {
    expect(moonpaySwapToUnitAmount({amount: '142580', decimals: 8})).toBe(
      0.0014258,
    );
    expect(moonpaySwapToUnitAmount({amount: '1970330', decimals: 6})).toBe(
      1.97033,
    );
  });

  describe('errors', () => {
    const tooLow = {
      success: false,
      error: {
        code: 'AMOUNT_TOO_LOW',
        message: 'The specified amount is too low.',
        details: {minAmount: 0.00002232},
      },
    };

    it('reads the swaps.xyz error envelope', () => {
      expect(getMoonpaySwapError(tooLow)).toEqual(tooLow.error);
      expect(getMoonpaySwapError({amountOut: {}})).toBeUndefined();
      expect(getMoonpaySwapError(undefined)).toBeUndefined();
    });

    it('names the minimum when swaps.xyz gives one', () => {
      expect(getMoonpaySwapErrorMessage(tooLow.error, 'btc')).toBe(
        'The minimum amount for this swap is {{min}} {{coin}}.',
      );
    });

    it('falls back to the swaps.xyz message without a minimum', () => {
      expect(
        getMoonpaySwapErrorMessage({...tooLow.error, details: {}}, 'btc'),
      ).toBe('The specified amount is too low.');
    });

    it('shows a generic message for missing routes', () => {
      expect(
        getMoonpaySwapErrorMessage({
          code: 'NO_AVAILABLE_ROUTE',
          message: 'No route',
        }),
      ).toBe('Could not get crypto offer. Please try again later.');
    });
  });

  it('formats estimated time like THORSwap', () => {
    expect(getEstimatedTimeStrFromSeconds(25)).toBe('0h 0m 25s');
    expect(getEstimatedTimeStrFromSeconds(3725)).toBe('1h 2m 5s');
    expect(getEstimatedTimeStrFromSeconds(undefined)).toBeUndefined();
  });

  it('describes and colors each status', () => {
    expect(
      moonpaySwapGetStatusDetails(MoonpaySwapStatus.completed).statusTitle,
    ).toBe('Completed');
    expect(
      moonpaySwapGetStatusDetails(MoonpaySwapStatus.requiresRefund).statusTitle,
    ).toBe('Refunding');
    expect(moonpaySwapGetStatusDetails(undefined).statusTitle).toBeUndefined();
    expect(moonpaySwapGetStatusColor(MoonpaySwapStatus.success)).toBe(
      '#01d1a2',
    );
    expect(moonpaySwapGetStatusColor(MoonpaySwapStatus.failed)).toBe('#df5264');
    expect(moonpaySwapGetStatusColor(MoonpaySwapStatus.pending)).toBe(
      '#666677',
    );
  });
});
