import {t} from 'i18next';
import {IsEVMChain} from '../../../../store/wallet/utils/currency';
import {
  MoonpaySwapActionData,
  MoonpaySwapActionRequestData,
  MoonpaySwapDepositTransaction,
  MoonpaySwapEnv,
  MoonpaySwapError,
  MoonpaySwapEvmTransaction,
  MoonpaySwapPaymentData,
  MoonpaySwapQuoteData,
  MoonpaySwapStatus,
} from '../../../../store/swap-crypto/models/moonpay-swap.models';
import {Status} from './thorswap-utils';

export const moonpaySwapEnv: MoonpaySwapEnv = __DEV__
  ? 'sandbox'
  : 'production';

// swaps.xyz identifies every chain (EVM or not) by a numeric id. See getChainList
export const moonpaySwapChainIds: {[chain: string]: number} = {
  btc: 999000313,
  bch: 10000,
  ltc: 999000323,
  doge: 2000,
  xrp: 999000346,
  eth: 1,
  matic: 137,
  arb: 42161,
  base: 8453,
  op: 10,
  sol: 1399811149,
};

export const MOONPAY_SWAP_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';

export const MOONPAY_SWAP_DEFAULT_SLIPPAGE = 1; // 1%

export const moonpaySwapSupportedChains = Object.keys(moonpaySwapChainIds);

const moonpaySwapSupportedTokens = [
  'aave',
  'dai',
  'eurc',
  'link',
  'pyusd',
  'shib',
  'uni',
  'usdc',
  'usdt',
  'wbtc',
  'weth',
];

export const isCoinSupportedByMoonpaySwap = (
  coin: string,
  chain: string,
): boolean => {
  const lowerCoin = coin.toLowerCase();
  if (!chain) {
    return (
      moonpaySwapSupportedChains.includes(lowerCoin) ||
      moonpaySwapSupportedTokens.includes(lowerCoin)
    );
  }
  const lowerChain = chain.toLowerCase();
  if (!moonpaySwapSupportedChains.includes(lowerChain)) {
    return false;
  }
  if (
    lowerCoin === lowerChain ||
    (['arb', 'base', 'op'].includes(lowerChain) && lowerCoin === 'eth') ||
    (lowerChain === 'matic' && lowerCoin === 'pol')
  ) {
    return true;
  }
  return moonpaySwapSupportedTokens.includes(lowerCoin);
};

export const getMoonpaySwapChainId = (chain: string): number | undefined =>
  moonpaySwapChainIds[chain.toLowerCase()];

export const getChainFromMoonpaySwapChainId = (
  chainId: number,
): string | undefined =>
  Object.keys(moonpaySwapChainIds).find(
    chain => moonpaySwapChainIds[chain] === chainId,
  );

export const getMoonpaySwapTokenAddress = (tokenAddress?: string): string =>
  tokenAddress || MOONPAY_SWAP_NATIVE_TOKEN_ADDRESS;

// EVM chains get a ready-to-sign contract call. Every other chain pays into a
// deposit address, which keeps them on the regular send flow
export const isMoonpaySwapDepositFlow = (chain: string): boolean =>
  !IsEVMChain(chain);

export const isMoonpaySwapEvmTx = (
  tx: MoonpaySwapActionData['tx'],
): tx is MoonpaySwapEvmTransaction => !!(tx as MoonpaySwapEvmTransaction).data;

export const isMoonpaySwapDepositTx = (
  tx: MoonpaySwapActionData['tx'],
): tx is MoonpaySwapDepositTransaction =>
  !(tx as MoonpaySwapEvmTransaction).data &&
  !!(tx as MoonpaySwapDepositTransaction).to;

const isSameMoonpaySwapToken = (
  token: Partial<Pick<MoonpaySwapPaymentData, 'chainId' | 'address'>>,
  chainId: number,
  address: string,
): boolean =>
  token?.chainId === chainId &&
  token.address?.toLowerCase() === address.toLowerCase();

// MoonPay quotes its fees in the source token, the only one the total can be
// priced in. Returns undefined if a fee is charged in another token, so the
// total isn't understated
export const getMoonpaySwapSourceTokenFee = (
  data: Pick<
    MoonpaySwapQuoteData,
    'amountIn' | 'applicationFee' | 'protocolFee' | 'bridgeFee'
  >,
): number | undefined => {
  const fees = [data.applicationFee, data.protocolFee, data.bridgeFee].filter(
    fee => fee?.amount && fee.amount !== '0',
  );
  const isSourceToken = (fee: MoonpaySwapPaymentData | undefined) =>
    isSameMoonpaySwapToken(
      fee!,
      data.amountIn.chainId,
      data.amountIn.address ?? '',
    );
  if (!fees.every(isSourceToken)) {
    return undefined;
  }
  return fees.reduce((sum, fee) => sum + moonpaySwapToUnitAmount(fee!), 0);
};

// The transaction is signed as returned, so make sure swaps.xyz built it for
// the request and the source wallet. Returns what didn't match
export const getMoonpaySwapActionMismatch = (
  request: Pick<
    MoonpaySwapActionRequestData,
    'amount' | 'srcChainId' | 'srcToken' | 'dstChainId' | 'dstToken'
  >,
  action: Pick<
    MoonpaySwapActionData,
    'amountIn' | 'amountInMax' | 'amountOut' | 'tx'
  >,
  source: {chain: string; isNative: boolean; decimals: number},
): string | undefined => {
  try {
    const amount = BigInt(request.amount);
    for (const key of ['amountIn', 'amountInMax'] as const) {
      const amountIn = action[key];
      if (BigInt(amountIn?.amount) !== amount) {
        return key;
      }
      // The approval amount is read back with the wallet's decimals
      if (amountIn.decimals !== source.decimals) {
        return key + ' decimals';
      }
      if (
        !isSameMoonpaySwapToken(amountIn, request.srcChainId, request.srcToken)
      ) {
        return key + ' token';
      }
    }
    if (
      !isSameMoonpaySwapToken(
        action.amountOut,
        request.dstChainId,
        request.dstToken,
      )
    ) {
      return 'amountOut token';
    }
    if (
      action.tx?.chainId !== undefined &&
      action.tx.chainId !== request.srcChainId
    ) {
      return 'chainId';
    }
    // Pick the transaction shape from the source chain, not from the response
    if (isMoonpaySwapDepositFlow(source.chain)) {
      if (!isMoonpaySwapDepositTx(action.tx)) {
        return 'tx';
      }
      if (BigInt(action.tx.value) !== amount) {
        return 'value';
      }
    } else {
      if (!isMoonpaySwapEvmTx(action.tx) || !action.tx.to) {
        return 'tx';
      }
      // An ERC20 moves in calldata, so the native value must be zero
      if (
        BigInt(action.tx.value || '0') !==
        (source.isNative ? amount : BigInt(0))
      ) {
        return 'value';
      }
    }
  } catch (err) {
    return 'unreadable amounts';
  }
  return undefined;
};

export const moonpaySwapToUnitAmount = (
  payment: Pick<MoonpaySwapPaymentData, 'amount' | 'decimals'>,
): number => Number(payment.amount) / 10 ** payment.decimals;

// swaps.xyz answers errors with HTTP 4xx/5xx and {success: false, error: {...}}
export const getMoonpaySwapError = (
  data: any,
): MoonpaySwapError | undefined => {
  if (data && data.success === false && data.error) {
    return data.error;
  }
  return undefined;
};

export const getMoonpaySwapErrorMessage = (
  error: MoonpaySwapError,
  coinFrom?: string,
): string => {
  switch (error.code) {
    case 'AMOUNT_TOO_LOW':
      return error.details?.minAmount && coinFrom
        ? t('The minimum amount for this swap is {{min}} {{coin}}.', {
            min: error.details.minAmount,
            coin: coinFrom.toUpperCase(),
          })
        : error.message;
    case 'AMOUNT_TOO_HIGH':
      return error.details?.maxAmount && coinFrom
        ? t('The maximum amount for this swap is {{max}} {{coin}}.', {
            max: error.details.maxAmount,
            coin: coinFrom.toUpperCase(),
          })
        : error.message;
    case 'NO_AVAILABLE_ROUTE':
    case 'INSUFFICIENT_LIQUIDITY':
    case 'UNSUPPORTED_NETWORK':
    case 'UNSUPPORTED_NETWORK_PAIR':
    case 'UNSUPPORTED_NETWORK_TOKEN_PAIR':
      return t('Could not get crypto offer. Please try again later.');
    default:
      return error.message || t('Unknown Error');
  }
};

// Same format as THORSwap's estimated time
export const getEstimatedTimeStrFromSeconds = (
  seconds: number | undefined,
): string | undefined => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return undefined;
  }
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const secs = date.getUTCSeconds();

  return `${hours}h ${minutes}m ${secs}s`;
};

export const moonpaySwapGetStatusDetails = (
  status: MoonpaySwapStatus | undefined,
): Status => {
  let statusDescription, statusTitle;
  switch (status) {
    case MoonpaySwapStatus.notYetCreated:
    case MoonpaySwapStatus.submitted:
      statusTitle = t('Swap order started');
      statusDescription = t(
        'Transaction sent from bitpay wallet. The swap process may take a few minutes, please wait.',
      );
      break;
    case MoonpaySwapStatus.pending:
      statusTitle = t('Processing transaction');
      statusDescription = t(
        'Transaction sent from bitpay wallet. The swap process may take a few minutes, please wait.',
      );
      break;
    case MoonpaySwapStatus.success:
    case MoonpaySwapStatus.completed:
      statusTitle = t('Completed');
      statusDescription = t(
        'The transaction has been successfully completed and confirmed.',
      );
      break;
    case MoonpaySwapStatus.requiresRefund:
      statusTitle = t('Refunding');
      statusDescription = t(
        'The swap could not be completed. Your funds are being refunded.',
      );
      break;
    case MoonpaySwapStatus.refunded:
      statusTitle = t('Refunded');
      statusDescription = t('The transaction amount has been refunded.');
      break;
    case MoonpaySwapStatus.failed:
    case MoonpaySwapStatus.expired:
      statusTitle =
        status === MoonpaySwapStatus.failed ? t('Failed') : t('Expired');
      statusDescription = t(
        'The swap could not be completed. Please contact MoonPay support.',
      );
      break;
    default:
      statusTitle = undefined;
      statusDescription = undefined;
      break;
  }
  return {
    statusTitle,
    statusDescription,
  };
};

export const moonpaySwapGetStatusColor = (
  status: MoonpaySwapStatus | undefined,
): string => {
  switch (status) {
    case MoonpaySwapStatus.success:
    case MoonpaySwapStatus.completed:
      return '#01d1a2';
    case MoonpaySwapStatus.failed:
    case MoonpaySwapStatus.expired:
      return '#df5264';
    case MoonpaySwapStatus.requiresRefund:
    case MoonpaySwapStatus.refunded:
      return '#fdb455';
    default:
      return '#666677';
  }
};
