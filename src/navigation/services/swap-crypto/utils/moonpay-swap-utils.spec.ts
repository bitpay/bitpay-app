import {
  getChainFromMoonpaySwapChainId,
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
