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
    const SOL = MOONPAY_SWAP_NATIVE_TOKEN_ADDRESS;
    const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    // From the Solana to Base swap run on 2026-11-02
    const solRequest = {
      amount: '53573342',
      srcChainId: 1399811149,
      srcToken: SOL,
      dstChainId: 8453,
      dstToken: BASE_USDC,
    };
    const solSource = {chain: 'sol', isNative: true, decimals: 9};
    const sol = {chainId: 1399811149, address: SOL, decimals: 9};
    const deposit = {
      amountIn: {...sol, amount: '53573342'},
      amountInMax: {...sol, amount: '53573342'},
      amountOut: {chainId: 8453, address: BASE_USDC, decimals: 6},
      tx: {
        to: '3eonEkA9xc7XFmrNMD1iEjo4tGUD1mMjZNXRkk2VF6Wk',
        value: '53573342',
        toExtra: null,
        chainId: 1399811149,
        chainKey: 'solana_mainnet',
      },
    } as any;

    const erc20Request = {
      amount: '1500000',
      srcChainId: 8453,
      srcToken: BASE_USDC,
      dstChainId: 8453,
      dstToken: SOL,
    };
    const erc20Source = {chain: 'base', isNative: false, decimals: 6};
    const usdc = {chainId: 8453, address: BASE_USDC, decimals: 6};
    const erc20 = {
      amountIn: {...usdc, amount: '1500000'},
      amountInMax: {...usdc, amount: '1500000'},
      amountOut: {chainId: 8453, address: SOL, decimals: 18},
      tx: {to: '0xrouter', data: '0x1234', value: '0', chainId: 8453},
    } as any;

    it('accepts an action built for the request', () => {
      expect(
        getMoonpaySwapActionMismatch(solRequest, deposit, solSource),
      ).toBeUndefined();
      expect(
        getMoonpaySwapActionMismatch(erc20Request, erc20, erc20Source),
      ).toBeUndefined();
      // Token addresses are compared without case
      expect(
        getMoonpaySwapActionMismatch(
          {...erc20Request, srcToken: BASE_USDC.toLowerCase()},
          erc20,
          erc20Source,
        ),
      ).toBeUndefined();
    });

    it('rejects a different amount', () => {
      expect(
        getMoonpaySwapActionMismatch(
          solRequest,
          {...deposit, amountIn: {...sol, amount: '60000000'}},
          solSource,
        ),
      ).toBe('amountIn');
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {...erc20, amountInMax: {...usdc, amount: '2000000'}},
          erc20Source,
        ),
      ).toBe('amountInMax');
    });

    it('rejects decimals that differ from the wallet', () => {
      // The approval amount is formatted from these, so 18 decimals on a
      // 6-decimal token would approve far more than the swap
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {...erc20, amountInMax: {...usdc, decimals: 5, amount: '1500000'}},
          erc20Source,
        ),
      ).toBe('amountInMax decimals');
    });

    it('rejects a route for other tokens or chains', () => {
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {
            ...erc20,
            amountIn: {...usdc, address: '0xother', amount: '1500000'},
          },
          erc20Source,
        ),
      ).toBe('amountIn token');
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {...erc20, amountOut: {...erc20.amountOut, chainId: 1}},
          erc20Source,
        ),
      ).toBe('amountOut token');
    });

    it('rejects a deposit for a different value or chain', () => {
      expect(
        getMoonpaySwapActionMismatch(
          solRequest,
          {...deposit, tx: {...deposit.tx, value: '60000000'}},
          solSource,
        ),
      ).toBe('value');
      expect(
        getMoonpaySwapActionMismatch(
          solRequest,
          {...deposit, tx: {...deposit.tx, chainId: 1}},
          solSource,
        ),
      ).toBe('chainId');
    });

    it('requires native value 0 on an ERC20 swap', () => {
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {...erc20, tx: {...erc20.tx, value: '1000000000000000'}},
          erc20Source,
        ),
      ).toBe('value');
    });

    it('requires the native value of a native EVM swap to be the amount', () => {
      const ethRequest = {...erc20Request, srcToken: SOL, dstToken: BASE_USDC};
      const eth = {chainId: 8453, address: SOL, decimals: 18};
      const ethAction = {
        amountIn: {...eth, amount: '1500000'},
        amountInMax: {...eth, amount: '1500000'},
        amountOut: {...usdc},
        tx: {to: '0xrouter', data: '0x1234', value: '1500000', chainId: 8453},
      } as any;
      const ethSource = {chain: 'base', isNative: true, decimals: 18};
      expect(
        getMoonpaySwapActionMismatch(ethRequest, ethAction, ethSource),
      ).toBeUndefined();
      expect(
        getMoonpaySwapActionMismatch(
          ethRequest,
          {...ethAction, tx: {...ethAction.tx, value: '0'}},
          ethSource,
        ),
      ).toBe('value');
    });

    it('picks the transaction shape from the source chain', () => {
      // An EVM source without calldata would otherwise be sent as a plain transfer
      expect(
        getMoonpaySwapActionMismatch(
          erc20Request,
          {...erc20, tx: {to: '0xrouter', value: '0', chainId: 8453}},
          erc20Source,
        ),
      ).toBe('tx');
      expect(
        getMoonpaySwapActionMismatch(
          solRequest,
          {...deposit, tx: {...deposit.tx, data: '0x1234'}},
          solSource,
        ),
      ).toBe('tx');
    });

    it('rejects amounts it cannot read', () => {
      expect(
        getMoonpaySwapActionMismatch(
          solRequest,
          {...deposit, amountIn: {...sol, amount: '1.5'}},
          solSource,
        ),
      ).toBe('unreadable amounts');
    });
  });

  describe('getMoonpaySwapSourceTokenFee', () => {
    const usdc = {
      chainId: 8453,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    };
    const fees = {
      amountIn: {...usdc, amount: '5000000'},
      applicationFee: {...usdc, amount: '50000'},
      protocolFee: {
        ...usdc,
        address: usdc.address.toLowerCase(),
        amount: '20000',
      },
      bridgeFee: {
        chainId: 8453,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        amount: '0',
      },
    } as any;

    it('adds up the fees charged in the source token', () => {
      expect(getMoonpaySwapSourceTokenFee(fees)).toBeCloseTo(0.07);
      expect(
        getMoonpaySwapSourceTokenFee({...fees, bridgeFee: undefined}),
      ).toBeCloseTo(0.07);
    });

    it('gives no total when a fee is charged in another token', () => {
      // Dropping it would understate the fee
      expect(
        getMoonpaySwapSourceTokenFee({
          ...fees,
          bridgeFee: {...fees.bridgeFee, amount: '1000000000000000'},
        }),
      ).toBeUndefined();
    });
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
