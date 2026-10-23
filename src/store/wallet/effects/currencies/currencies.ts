import {Effect} from '../../../index';
import axios from 'axios';
import {MMKV} from 'react-native-mmkv';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetCustomTokenOptions,
  successImport,
} from '../../wallet.actions';
import {
  BitpaySupportedTokens,
  CurrencyOpts,
  SUPPORTED_VM_TOKENS,
} from '../../../../constants/currencies';
import {BASE_BWS_URL, BLOCKCHAIN_EXPLORERS} from '../../../../constants/config';
import {
  addTokenChainSuffix,
  getCurrencyAbbreviation,
  getEVMFeeCurrency,
} from '../../../../utils/helper-methods';
import {GetProtocolPrefix} from '../../utils/currency';
import {AppActions} from '../../../app';
import {buildWalletObj, mapAbbreviationAndName} from '../../utils/wallet';
import {merge} from '../../../../utils/object';
import {tokenManager} from '../../../../managers/TokenManager';
import {logManager} from '../../../../managers/LogManager';

// The 1inch token lists are public data, about 5 MB of JSON across the
// supported chains. They are cached in their own MMKV instance, away from
// persist:root and the wallet vault, so launches don't download and parse
// them every time. A failed fetch never replaces a cached list.
const TOKEN_LISTS_STORAGE_ID = 'bitpay.token-lists.v1';
export const TOKEN_LISTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CachedTokenList = {savedAt: number; tokens: Token[]};

// populateTokenInfo reads these fields; one malformed entry must not be able
// to break every launch once it is cached.
const isUsableToken = (token: any): token is Token =>
  !!token &&
  typeof token.address === 'string' &&
  typeof token.symbol === 'string' &&
  typeof token.name === 'string' &&
  typeof token.decimals === 'number';

let tokenListsStorage: MMKV | undefined;
const getTokenListsStorage = () =>
  (tokenListsStorage ??= new MMKV({id: TOKEN_LISTS_STORAGE_ID}));

const readCachedTokenList = (chain: string): CachedTokenList | undefined => {
  try {
    const raw = getTokenListsStorage().getString(chain);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed?.savedAt !== 'number' || !Array.isArray(parsed.tokens)) {
      return undefined;
    }
    const tokens = parsed.tokens.filter(isUsableToken);
    // An entry that filters down to nothing is as good as missing: using it
    // would leave the chain with no tokens (0 fiat) until the TTL expires.
    if (tokens.length === 0) {
      return undefined;
    }
    return {
      savedAt: parsed.savedAt,
      tokens,
    };
  } catch {
    logManager.warn(
      `[startGetTokenOptions] ignoring unreadable cached token list for ${chain}`,
    );
    return undefined;
  }
};

// requestIdleCallback when the platform has it, else a macrotask — the same
// scheduler accountListCache uses, so a large serialize+write never blocks the
// caller that is awaiting the fetch.
const scheduleIdle = (task: () => void): void => {
  const idleCallback = (global as any).requestIdleCallback;
  if (typeof idleCallback === 'function') {
    idleCallback(task, {timeout: 2000});
    return;
  }
  setTimeout(task, 0);
};

const writeCachedTokenList = (
  chain: string,
  tokens: Token[],
  savedAt: number,
) => {
  try {
    const entry: CachedTokenList = {savedAt, tokens};
    getTokenListsStorage().set(chain, JSON.stringify(entry));
  } catch {
    logManager.warn(
      `[startGetTokenOptions] could not cache token list for ${chain}`,
    );
  }
};

const isTokenListStale = ({savedAt}: CachedTokenList, now: number) =>
  savedAt > now || now - savedAt > TOKEN_LISTS_CACHE_TTL_MS;

// undefined = the request failed or returned something other than a list.
const fetchTokenList = async (chain: string): Promise<Token[] | undefined> => {
  try {
    const {data} = await axios.get<Token[]>(
      `${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain}`,
    );
    if (!Array.isArray(data)) {
      logManager.error(
        `Unexpected response for ${chain} [startGetTokenOptions]: ${data}`,
      );
      return undefined;
    }
    const tokens = data.filter(isUsableToken);
    if (tokens.length !== data.length) {
      logManager.warn(
        `[startGetTokenOptions] dropped ${
          data.length - tokens.length
        } malformed token(s) for ${chain}`,
      );
    }
    // Nothing usable came back. Returning [] here would overwrite a good
    // cached list with an empty one (fresh savedAt) and wipe the chain's
    // tokens for 24h, so report it as a failed fetch and keep the cache.
    if (tokens.length === 0) {
      logManager.warn(
        `[startGetTokenOptions] no usable tokens returned for ${chain}; treating as a failed fetch`,
      );
      return undefined;
    }
    return tokens;
  } catch {
    logManager.info(
      `request: ${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain} failed - continue anyway [startGetTokenOptions]`,
    );
    return undefined;
  }
};

const applyTokenLists = (
  chainResults: Array<{chain: string; tokens: Token[]}>,
) => {
  let tokenOptionsByAddress: {[key in string]: Token} = {};
  let tokenDataByAddress: {[key in string]: CurrencyOpts} = {};
  for (const {chain, tokens} of chainResults) {
    tokens.forEach(token => {
      if (
        BitpaySupportedTokens[getCurrencyAbbreviation(token.address, chain)]
      ) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
        chain,
        token,
        tokenOptionsByAddress,
        tokenDataByAddress,
      });
    });
  }
  tokenManager.setTokenOptions({tokenOptionsByAddress, tokenDataByAddress});
};

// Fetches every chain; a chain whose request fails keeps its cached list.
const fetchTokenLists = async (
  cached: Record<string, CachedTokenList | undefined>,
) => {
  const fetchedAt = Date.now();
  const results = await Promise.all(
    SUPPORTED_VM_TOKENS.map(async chain => {
      const fetched = await fetchTokenList(chain);
      if (fetched) {
        // Serialize + write off the await path so a cold launch doesn't block
        // init on ~5 MB of JSON; savedAt stays the fetch time for staleness.
        scheduleIdle(() => writeCachedTokenList(chain, fetched, fetchedAt));
      }
      return {
        chain,
        fetched: !!fetched,
        tokens: fetched ?? cached[chain]?.tokens ?? [],
      };
    }),
  );
  return {results, anyFetched: results.some(result => result.fetched)};
};

// A cache that can't be applied is discarded so the caller fetches fresh.
const applyCachedTokenLists = (
  cached: Record<string, CachedTokenList | undefined>,
): boolean => {
  try {
    applyTokenLists(
      SUPPORTED_VM_TOKENS.map(chain => ({
        chain,
        tokens: cached[chain]!.tokens,
      })),
    );
    return true;
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    logManager.warn(
      `[startGetTokenOptions] discarding cached token lists: ${errorStr}`,
    );
    for (const chain of SUPPORTED_VM_TOKENS) {
      cached[chain] = undefined;
      try {
        getTokenListsStorage().delete(chain);
      } catch {}
    }
    return false;
  }
};

let backgroundTokenListsRefresh: Promise<void> | undefined;

const refreshTokenListsInBackground = (
  cached: Record<string, CachedTokenList | undefined>,
) => {
  backgroundTokenListsRefresh ??= fetchTokenLists(cached)
    .then(({results, anyFetched}) => {
      if (anyFetched) {
        applyTokenLists(results);
        logManager.info('successful [startGetTokenOptions] background refresh');
      }
    })
    .catch(error => {
      const errorStr = error instanceof Error ? error.message : String(error);
      logManager.error(
        `failed [startGetTokenOptions] background refresh: ${errorStr}`,
      );
    })
    .finally(() => {
      backgroundTokenListsRefresh = undefined;
    });
};

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      logManager.info('starting [startGetTokenOptions]');
      const cached: Record<string, CachedTokenList | undefined> = {};
      for (const chain of SUPPORTED_VM_TOKENS) {
        cached[chain] = readCachedTokenList(chain);
      }

      // Every chain cached: use it now, and refresh in the background when
      // any list is older than the TTL.
      if (
        SUPPORTED_VM_TOKENS.every(chain => cached[chain]) &&
        applyCachedTokenLists(cached)
      ) {
        logManager.info('successful [startGetTokenOptions] (cached)');
        dispatch(AppActions.appTokensDataLoaded());
        const now = Date.now();
        if (
          SUPPORTED_VM_TOKENS.some(chain =>
            isTokenListStale(cached[chain]!, now),
          )
        ) {
          refreshTokenListsInBackground(cached);
        }
        return;
      }

      const {results} = await fetchTokenLists(cached);
      applyTokenLists(results);
      logManager.info('successful [startGetTokenOptions]');
      dispatch(AppActions.appTokensDataLoaded());
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(failedGetTokenOptions());
      logManager.error(`failed [startGetTokenOptions]: ${errorStr}`);
      dispatch(AppActions.appTokensDataLoaded());
    }
  };

export const addCustomTokenOption =
  (token: Token, chain: string): Effect =>
  async dispatch => {
    try {
      const customTokenOptionsByAddress: {[key in string]: Token} = {};
      const customTokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      if (
        BitpaySupportedTokens[getCurrencyAbbreviation(token.address, chain)]
      ) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
        chain,
        token,
        tokenOptionsByAddress: customTokenOptionsByAddress,
        tokenDataByAddress: customTokenDataByAddress,
      });
      dispatch(
        successGetCustomTokenOptions({
          customTokenOptionsByAddress,
          customTokenDataByAddress,
        }),
      );
    } catch (e) {
      const errString = e instanceof Error ? e.message : JSON.stringify(e);
      logManager.error(`Add custom options: ${errString}`);
      dispatch(failedGetTokenOptions());
    }
  };

const populateTokenInfo = ({
  chain,
  token,
  tokenOptionsByAddress,
  tokenDataByAddress,
}: {
  chain: string;
  token: Token;
  tokenOptionsByAddress: {[key in string]: Token};
  tokenDataByAddress: {[key in string]: CurrencyOpts};
}) => {
  const tokenAddressWithSuffix = addTokenChainSuffix(token.address, chain);
  const tokenData = {
    name: token.name.replace('(PoS)', '').trim(),
    chain,
    coin: token.symbol.toLowerCase(),
    feeCurrency: getEVMFeeCurrency(chain),
    logoURI: token.logoURI,
    address: token.address,
    unitInfo: {
      unitName: token.symbol.toUpperCase(),
      unitToSatoshi: 10 ** token.decimals,
      unitDecimals: token.decimals,
      unitCode: token.symbol,
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {
        livenet: GetProtocolPrefix('livenet', chain),
        testnet: GetProtocolPrefix('testnet', chain),
        regtest: GetProtocolPrefix('regtest', chain),
      },
      ratesApi: '',
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS[chain].livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS[chain].testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
  };
  tokenOptionsByAddress[tokenAddressWithSuffix] = token;
  tokenDataByAddress[tokenAddressWithSuffix] = tokenData;
};

export const startCustomTokensMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      logManager.info('[startCustomTokensMigration] - starting...');
      const {customTokenOptions, customTokenData} = getState().WALLET;
      Object.values(customTokenOptions || {}).forEach(token => {
        logManager.info(`Migrating: ${JSON.stringify(token)}`);
        const chain =
          customTokenData[token.symbol.toLowerCase()]?.chain || 'eth';
        let customToken: Token = {
          name: token.name,
          symbol: token.symbol?.toLowerCase(),
          decimals: Number(token.decimals),
          address: token.address?.toLowerCase(),
        };
        addCustomTokenOption(customToken, chain);
      });
      logManager.info('success [startCustomTokensMigration]}');
      return resolve();
    });
  };

export const startPolMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      logManager.info('[startPolMigration] - starting...');
      const {keys} = getState().WALLET;

      Object.values(keys).forEach(key => {
        key.wallets = key.wallets.map(wallet => {
          const {currencyAbbreviation, currencyName} = dispatch(
            mapAbbreviationAndName(
              wallet.credentials.coin,
              wallet.credentials.chain,
              wallet.credentials?.token?.address,
            ),
          );
          return merge(
            wallet,
            buildWalletObj({
              ...wallet.credentials,
              ...wallet,
              currencyAbbreviation,
              currencyName,
            }),
          );
        });
        dispatch(
          successImport({
            key,
          }),
        );
      });
      logManager.info('success [startPolMigration]}');
      return resolve();
    });
  };
