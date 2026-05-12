import type {BwsConfig} from '../../core/shared/bws';
import type {Tx} from '../../core/types';
import type {PortfolioRuntimeWalletCredentials} from '../../core/runtimeWalletCredentials';
import type {NitroResponse as NitroFetchResponse} from 'react-native-nitro-fetch';
import {version as bitcoreWalletClientVersion} from '@bitpay-labs/bitcore-wallet-client/package.json';
import {
  buildTokenWalletTxHistoryContextFromCredentials,
  normalizeTokenWalletTxHistoryPage,
} from '../../core/tokenTxHistory';
import {
  DEFAULT_PORTFOLIO_NITRO_FETCH_TIMEOUT_MS,
  getPortfolioNitroFetchClientOnRuntime,
  signBwsGetRequestWithTransferredNitro,
  takeNextPortfolioTransferredSignHandleOnRuntime,
} from './txHistorySigning';

export const PORTFOLIO_BWS_CLIENT_VERSION_HEADER = `bwc-${bitcoreWalletClientVersion}`;
const TXHISTORY_BASE_PATH = '/v1/txhistory/';
const TXHISTORY_CACHE_BUST_PARAM = 'r';

type TxHistoryRequestArgs = {
  credentials: PortfolioRuntimeWalletCredentials;
  skip: number;
  limit: number;
  reverse?: boolean;
};

function getMultisigContractAddressFromCredentials(
  credentials: PortfolioRuntimeWalletCredentials,
): string | undefined {
  'worklet';

  const raw =
    credentials?.multisigEthInfo?.multisigContractAddress ??
    credentials?.multisigContractAddress;
  const multisigContractAddress = String(raw || '').trim();
  return multisigContractAddress || undefined;
}

function getTokenAddressFromCredentials(
  credentials: PortfolioRuntimeWalletCredentials,
): string | undefined {
  'worklet';

  const raw = credentials?.token?.address ?? credentials?.tokenAddress;
  const tokenAddress = String(raw || '').trim();
  return tokenAddress || undefined;
}

export function buildPortfolioTxHistoryRequestPath(
  args: TxHistoryRequestArgs,
): string {
  'worklet';

  const params: string[] = [];

  if (Number.isFinite(args.skip) && args.skip > 0) {
    params.push(`skip=${encodeURIComponent(String(args.skip))}`);
  }
  if (Number.isFinite(args.limit) && args.limit > 0) {
    params.push(`limit=${encodeURIComponent(String(args.limit))}`);
  }
  if (args.reverse) {
    params.push('reverse=1');
  }

  const tokenAddress = getTokenAddressFromCredentials(args.credentials);
  if (tokenAddress) {
    params.push(`tokenAddress=${encodeURIComponent(tokenAddress)}`);
  }

  const multisigContractAddress = getMultisigContractAddressFromCredentials(
    args.credentials,
  );
  if (multisigContractAddress) {
    params.push(
      `multisigContractAddress=${encodeURIComponent(multisigContractAddress)}`,
    );
  }

  return params.length > 0
    ? `${TXHISTORY_BASE_PATH}?${params.join('&')}`
    : TXHISTORY_BASE_PATH;
}

export function appendPortfolioTxHistoryCacheBustParam(
  requestPath: string,
  cacheBustValue?: number,
): string {
  'worklet';

  const normalizedRequestPath = String(requestPath || '').trim();
  if (!normalizedRequestPath) {
    throw new Error(
      'A txhistory request path is required before appending the cache-bust param.',
    );
  }

  const separator = normalizedRequestPath.includes('?') ? '&' : '?';
  const normalizedCacheBustValue = Number.isFinite(cacheBustValue)
    ? Math.round(Number(cacheBustValue))
    : Math.round(Math.random() * 100000);

  return `${normalizedRequestPath}${separator}${TXHISTORY_CACHE_BUST_PARAM}=${normalizedCacheBustValue}`;
}

function getWalletCopayerId(
  credentials: PortfolioRuntimeWalletCredentials,
): string {
  'worklet';

  const copayerId = String(credentials?.copayerId || '').trim();
  if (!copayerId) {
    throw new Error(
      'Wallet credentials are missing copayerId for BWS txhistory requests.',
    );
  }
  return copayerId;
}

function buildSignedHeaders(args: {
  credentials: PortfolioRuntimeWalletCredentials;
  requestPath: string;
}): Array<{key: string; value: string}> {
  'worklet';

  const copayerId = getWalletCopayerId(args.credentials);

  const transferredNitro = takeNextPortfolioTransferredSignHandleOnRuntime();
  if (!transferredNitro) {
    throw new Error(
      'No transferred Nitro SignHandle is available on the portfolio runtime for txhistory signing.',
    );
  }

  const signature = signBwsGetRequestWithTransferredNitro(
    args.requestPath,
    transferredNitro.firstHashHybrid,
    transferredNitro.signHandleHybrid,
    transferredNitro.privateKeyHandle,
  );

  return [
    {key: 'Accept', value: 'application/json'},
    {key: 'Cache-Control', value: 'no-store'},
    {key: 'x-client-version', value: PORTFOLIO_BWS_CLIENT_VERSION_HEADER},
    {key: 'x-identity', value: copayerId},
    {key: 'x-signature', value: signature},
  ];
}

function tryParseJson(text: string): unknown {
  'worklet';

  if (!text) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchPortfolioTxHistoryPageByRequest(args: {
  credentials: PortfolioRuntimeWalletCredentials;
  cfg: BwsConfig;
  skip: number;
  limit: number;
  reverse?: boolean;
}): Promise<Tx[]> {
  'worklet';

  const requestPath = buildPortfolioTxHistoryRequestPath({
    credentials: args.credentials,
    skip: args.skip,
    limit: args.limit,
    reverse: args.reverse,
  });
  const signedRequestPath = appendPortfolioTxHistoryCacheBustParam(requestPath);

  const baseUrl = String(args.cfg?.baseUrl || '').trim();
  if (!baseUrl) {
    throw new Error(
      'BWS baseUrl is required for portfolio txhistory requests.',
    );
  }

  const headers = buildSignedHeaders({
    credentials: args.credentials,
    requestPath: signedRequestPath,
  });

  const nitroFetchClient = getPortfolioNitroFetchClientOnRuntime();
  let response: NitroFetchResponse;
  try {
    response = nitroFetchClient.requestSync({
      url: `${baseUrl}${signedRequestPath}`,
      method: 'GET',
      headers,
      timeoutMs: DEFAULT_PORTFOLIO_NITRO_FETCH_TIMEOUT_MS,
      followRedirects: false,
    });
  } catch {
    throw new Error('Portfolio Nitro Fetch txhistory request failed.');
  }

  const rawResponseText =
    typeof response.bodyString === 'string' ? response.bodyString : '';
  if (!response.ok) {
    throw new Error(
      `BWS txhistory request failed with status ${response.status}.`,
    );
  }

  const parsed = tryParseJson(rawResponseText);
  const txs = Array.isArray(parsed) ? (parsed as Tx[]) : [];
  return normalizeTokenWalletTxHistoryPage({
    txs,
    context: buildTokenWalletTxHistoryContextFromCredentials(args.credentials),
  });
}
