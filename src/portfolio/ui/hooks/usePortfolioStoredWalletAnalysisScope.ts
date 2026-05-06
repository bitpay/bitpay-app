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

export const getPortfolioWalletsInputSignature = (
  wallets: Wallet[],
): string => {
  return (wallets || [])
    .map(wallet =>
      [
        wallet?.id,
        wallet?.keyId,
        wallet?.chain,
        wallet?.currencyAbbreviation,
        wallet?.tokenAddress,
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
};

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
  const defaultAltCurrencyIsoCode = useAppSelector(
    ({APP}) => APP.defaultAltCurrency?.isoCode,
  );
  const storeRates = useAppSelector(({RATE}) => RATE.rates);
  const ratesUpdatedAt = useAppSelector(({RATE}) => RATE.ratesUpdatedAt);
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
      wallets: args.wallets,
    });
  }, [
    args.wallets,
    dispatch,
    enabled,
    quoteCurrency,
    rates,
    walletsInputSignature,
  ]);

  return {
    ...walletScope,
    asOfMs,
    committedRevisionToken,
    rates: enabled ? rates : undefined,
  };
}
