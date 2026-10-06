import {useMemo, useRef} from 'react';
import type {Rates} from '../../../store/rate/rate.models';
import type {Wallet} from '../../../store/wallet/wallet.models';
import type {AppDispatch} from '../../../utils/hooks';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  buildCommittedPortfolioRevisionToken,
  buildCurrentRatesByAssetId,
  getCurrentRatesByAssetIdSignature,
  getStoredWalletRequestSignature,
  mapWalletsToStoredWallets,
  resolveActivePortfolioDisplayQuoteCurrency,
  resolveCurrentRatesAsOfMs,
} from '../common';

const EMPTY_DISABLED_RATES: Rates = {};

export const getPortfolioWalletsInputSignature = (wallets: Wallet[]): string =>
  (wallets || [])
    .map(wallet =>
      [
        wallet?.id,
        wallet?.keyId,
        wallet?.chain,
        wallet?.currencyAbbreviation,
        wallet?.tokenAddress,
        (wallet as any)?.credentials?.token?.decimals,
        wallet?.network,
        wallet?.balance?.crypto,
        wallet?.balance?.sat,
        wallet?.balance?.satConfirmed,
        wallet?.balance?.satConfirmedLocked,
        wallet?.balance?.satPending,
      ]
        .map(value => (value == null ? '' : String(value)))
        .join(':'),
    )
    .sort()
    .join('|');

export function buildPortfolioStoredWalletAnalysisScope(args: {
  dispatch: AppDispatch;
  quoteCurrency: string;
  rates?: Rates;
  wallets: Wallet[];
}) {
  const {eligibleWallets, storedWallets} = mapWalletsToStoredWallets({
    dispatch: args.dispatch,
    wallets: args.wallets,
  });
  const storedWalletRequestSig = getStoredWalletRequestSignature(storedWallets);
  const currentRatesByAssetId = buildCurrentRatesByAssetId({
    storedWallets,
    quoteCurrency: args.quoteCurrency,
    rates: args.rates,
  });

  return {
    currentRatesByAssetId,
    currentRatesSignature: getCurrentRatesByAssetIdSignature(
      currentRatesByAssetId,
    ),
    eligibleWallets,
    quoteCurrency: args.quoteCurrency,
    storedWalletRequestSig,
    storedWallets,
  };
}

export function usePortfolioStoredWalletAnalysisScope(args: {
  enabled?: boolean;
  quoteCurrencyOverride?: string;
  ratesOverride?: Rates;
  wallets: Wallet[];
}) {
  const enabled = args.enabled !== false;
  const dispatch = useAppDispatch();
  const walletsRef = useRef(args.wallets);
  walletsRef.current = args.wallets;
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency?.isoCode,
  );
  const shouldSelectStoreRates =
    enabled && typeof args.ratesOverride === 'undefined';
  const storeRates = useAppSelector(({RATE}) =>
    shouldSelectStoreRates ? RATE.rates : EMPTY_DISABLED_RATES,
  );
  const ratesUpdatedAt = useAppSelector(({RATE}) =>
    shouldSelectStoreRates ? RATE.ratesUpdatedAt : undefined,
  );
  const committedRevisionToken = useAppSelector(({PORTFOLIO}) =>
    enabled
      ? buildCommittedPortfolioRevisionToken({
          lastPopulatedAt: PORTFOLIO.lastPopulatedAt,
        })
      : '',
  );
  const rates = args.ratesOverride ?? storeRates;
  const quoteCurrency = useMemo(
    () =>
      enabled
        ? resolveActivePortfolioDisplayQuoteCurrency({
            quoteCurrency: args.quoteCurrencyOverride,
            defaultAltCurrencyIsoCode,
          })
        : '',
    [args.quoteCurrencyOverride, defaultAltCurrencyIsoCode, enabled],
  );
  const fallbackAsOfMsRef = useRef<number>(Date.now());
  const asOfMs = useMemo(
    () =>
      enabled
        ? resolveCurrentRatesAsOfMs({ratesUpdatedAt, rates}) ??
          fallbackAsOfMsRef.current
        : fallbackAsOfMsRef.current,
    [enabled, rates, ratesUpdatedAt],
  );
  const walletsInputSignature = getPortfolioWalletsInputSignature(args.wallets);
  const stableWalletsInput = useMemo(
    () => ({
      signature: walletsInputSignature,
      wallets: walletsRef.current,
    }),
    [walletsInputSignature],
  );

  const walletScope = useMemo(() => {
    if (!enabled) {
      return {
        currentRatesByAssetId: {},
        currentRatesSignature: '',
        eligibleWallets: [],
        quoteCurrency: '',
        storedWalletRequestSig: '',
        storedWallets: [],
      };
    }

    return buildPortfolioStoredWalletAnalysisScope({
      dispatch,
      quoteCurrency,
      rates,
      wallets: stableWalletsInput.wallets,
    });
  }, [dispatch, enabled, quoteCurrency, rates, stableWalletsInput]);

  return {
    ...walletScope,
    asOfMs,
    committedRevisionToken,
    rates: enabled ? rates : undefined,
  };
}
