import React from 'react';
import {
  type NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {useCallback, useEffect, useLayoutEffect, useMemo} from 'react';
import styled, {useTheme} from 'styled-components/native';
import HeaderBackButton from '../../../../components/back/HeaderBackButton';
import {HeaderTitle} from '../../../../components/styled/Text';
import {BitpaySupportedCoins} from '../../../../constants/currencies';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {Black, ProgressBlue, White} from '../../../../styles/colors';
import type {RootState} from '../../../../store';
import {
  fetchMarketStats,
  getMarketStatsCacheKey,
} from '../../../../store/market-stats';
import type {WalletGroupParamList} from '../../WalletGroup';
import {buildUIFormattedWallet} from '../../../../store/wallet/utils/wallet';
import type {Wallet} from '../../../../store/wallet/wallet.models';
import {
  formatCurrencyAbbreviation,
  formatFiat,
  formatFiatAmount,
} from '../../../../utils/helper-methods';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {selectShowPortfolioValue} from '../../../../store/app/app.selectors';
import {getAssetTheme} from '../../../../utils/portfolio/assetTheme';
import {resolveCurrentRatesAsOfMs} from '../../../../portfolio/ui/common';
import {
  getAssetCurrentDisplayQuoteRate,
  resolveActivePortfolioDisplayQuoteCurrency,
} from '../../../../utils/portfolio/displayCurrency';
import {
  findSupportedCurrencyOptionForAsset,
  getWalletLiveFiatBalance,
  getWalletsMatchingExchangeRateAsset,
  getVisibleWalletsForKey,
  getVisibleWalletsFromKeys,
} from '../../../../utils/portfolio/assets';
import {normalizeFiatRateSeriesCoin} from '../../../../utils/portfolio/core/pnl/rates';
import {IsSVMChain} from '../../../../store/wallet/utils/currency';
import {
  formatCompactCurrency,
  formatSupply,
  POLYGON_ABOUT_FALLBACK,
} from '../ExchangeRate.utils';

export type ExchangeRateAssetContext = {
  currencyAbbreviation: string;
  chain: string;
  network?: string;
  tokenAddress?: string;
};

export type ExchangeRateWalletWithUi = {
  wallet: Wallet;
  ui: ReturnType<typeof buildUIFormattedWallet>;
};

export type ExchangeRateSharedModel = {
  assetContext: ExchangeRateAssetContext;
  assetTotalFiatBalance: number;
  assetWallets: Wallet[];
  chartLineColor: string;
  currencyAbbreviation: string;
  currencyImageSource: any;
  currencyName: string;
  currentFiatRate: number | undefined;
  asOfMs: number;
  formatDisplayPrice: (value?: number) => string;
  gradientBackgroundColor: string;
  hasValidNormalizedCoin: boolean;
  hasWalletsForAsset: boolean;
  hideAllBalances: boolean;
  showPortfolioValue: boolean;
  historicalRateIdentity: {
    chain?: string;
    tokenAddress?: string;
  };
  isAssetBalanceHistoryMode: boolean;
  keys: RootState['WALLET']['keys'];
  marketCapToDisplay: string;
  marketHigh52wToDisplay: string;
  marketLow52wToDisplay: string;
  marketVolume24hToDisplay: string;
  normalizedCoin: string;
  aboutToDisplay: string;
  rates: RootState['RATE']['rates'];
  resolvedQuoteCurrency: string;
  walletsForAsset: ExchangeRateWalletWithUi[];
  circulatingSupplyToDisplay: string;
};

const HeaderTitleText = styled(HeaderTitle)`
  font-size: 20px;
`;

const useExchangeRateSharedModel = (): ExchangeRateSharedModel => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const homeCarouselConfig = useAppSelector(
    ({APP}: RootState) => APP.homeCarouselConfig,
  );
  const rates = useAppSelector(({RATE}: RootState) => RATE.rates);
  const ratesUpdatedAt = useAppSelector(
    ({RATE}: RootState) => RATE.ratesUpdatedAt,
  );
  const defaultAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
  const hideAllBalances = useAppSelector(
    ({APP}: RootState) => APP.hideAllBalances,
  );
  const showPortfolioValue = useAppSelector(selectShowPortfolioValue);
  const {params} = useRoute<RouteProp<WalletGroupParamList, 'ExchangeRate'>>();
  const isAssetBalanceHistoryMode = params?.chartType === 'assetBalanceHistory';
  const scopeKeyId = params?.keyId;

  const currencyAbbreviation = formatCurrencyAbbreviation(
    params?.currencyAbbreviation || 'BTC',
  );
  const coinKey = (
    params?.chain ||
    params?.currencyAbbreviation ||
    'btc'
  ).toLowerCase();
  const coin = BitpaySupportedCoins[coinKey] ?? BitpaySupportedCoins.btc;
  const currencyName = params?.currencyName || coin.name || 'Bitcoin';

  const assetContext = useMemo<ExchangeRateAssetContext>(() => {
    const chain = (
      params?.chain ||
      params?.currencyAbbreviation ||
      'btc'
    ).toLowerCase();
    const rawTokenAddress = params?.tokenAddress?.trim();

    return {
      currencyAbbreviation: (
        params?.currencyAbbreviation || 'btc'
      ).toLowerCase(),
      chain,
      network: params?.network?.toLowerCase(),
      tokenAddress: rawTokenAddress
        ? IsSVMChain(chain)
          ? rawTokenAddress
          : rawTokenAddress.toLowerCase()
        : undefined,
    };
  }, [
    params?.chain,
    params?.currencyAbbreviation,
    params?.network,
    params?.tokenAddress,
  ]);

  const assetCurrencyOption = useMemo(
    () =>
      findSupportedCurrencyOptionForAsset({
        options: SupportedCurrencyOptions,
        currencyAbbreviation: assetContext.currencyAbbreviation,
        chain: assetContext.chain,
        tokenAddress: assetContext.tokenAddress,
      }),
    [
      assetContext.chain,
      assetContext.currencyAbbreviation,
      assetContext.tokenAddress,
    ],
  );

  const resolvedQuoteCurrency = useMemo(() => {
    return resolveActivePortfolioDisplayQuoteCurrency({
      defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
    }).toUpperCase();
  }, [defaultAltCurrency.isoCode]);

  const normalizedCoin = normalizeFiatRateSeriesCoin(
    assetContext.currencyAbbreviation,
  ).trim();
  const hasValidNormalizedCoin = normalizedCoin.length > 0;

  const historicalRateIdentity = useMemo(
    () => ({
      chain: assetContext.tokenAddress ? assetContext.chain : undefined,
      tokenAddress: assetContext.tokenAddress || undefined,
    }),
    [assetContext.chain, assetContext.tokenAddress],
  );

  const currentFiatRate = useMemo(() => {
    if (
      !rates ||
      !assetContext.currencyAbbreviation ||
      !resolvedQuoteCurrency
    ) {
      return undefined;
    }

    return getAssetCurrentDisplayQuoteRate({
      rates,
      currencyAbbreviation: assetContext.currencyAbbreviation,
      chain: assetContext.chain,
      tokenAddress: assetContext.tokenAddress,
      quoteCurrency: resolvedQuoteCurrency,
    });
  }, [
    assetContext.chain,
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
    resolvedQuoteCurrency,
    rates,
  ]);
  const fallbackAsOfMsRef = React.useRef<number>(Date.now());
  const asOfMs = useMemo(() => {
    return (
      resolveCurrentRatesAsOfMs({
        ratesUpdatedAt,
        rates,
      }) ?? fallbackAsOfMsRef.current
    );
  }, [rates, ratesUpdatedAt]);

  const formatDisplayPrice = useCallback(
    (value?: number) => {
      if (value == null) {
        return '--';
      }

      return formatFiatAmount(value, resolvedQuoteCurrency, {
        customPrecision: 'minimal',
        currencyAbbreviation: assetContext.currencyAbbreviation,
      });
    },
    [assetContext.currencyAbbreviation, resolvedQuoteCurrency],
  );

  const visibleWallets = useMemo(() => {
    if (scopeKeyId) {
      return getVisibleWalletsForKey(keys?.[scopeKeyId]);
    }

    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keys, scopeKeyId]);

  const assetWallets = useMemo(() => {
    // Asset balance history needs the full historical wallet scope so ALL-time
    // PnL matches the asset list even after some wallets reach zero balance.
    return getWalletsMatchingExchangeRateAsset({
      wallets: visibleWallets,
      currencyAbbreviation: assetContext.currencyAbbreviation,
      tokenAddress: assetContext.tokenAddress,
      includeZeroBalance: isAssetBalanceHistoryMode,
    });
  }, [
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
    isAssetBalanceHistoryMode,
    visibleWallets,
  ]);

  const walletsForAssetDisplay = useMemo(() => {
    return getWalletsMatchingExchangeRateAsset({
      wallets: visibleWallets,
      currencyAbbreviation: assetContext.currencyAbbreviation,
      tokenAddress: assetContext.tokenAddress,
    });
  }, [
    assetContext.currencyAbbreviation,
    assetContext.tokenAddress,
    visibleWallets,
  ]);

  const walletsForAsset = useMemo<ExchangeRateWalletWithUi[]>(() => {
    return walletsForAssetDisplay
      .map(wallet => {
        const baseUi = buildUIFormattedWallet(
          wallet,
          resolvedQuoteCurrency,
          rates,
          dispatch,
          'symbol',
        );
        const liveFiatBalance = getWalletLiveFiatBalance({
          wallet,
          rates,
          quoteCurrency: resolvedQuoteCurrency,
        });
        const ui = {
          ...baseUi,
          fiatBalance: liveFiatBalance,
          fiatBalanceFormat: formatFiat({
            fiatAmount: liveFiatBalance,
            defaultAltCurrencyIsoCode: resolvedQuoteCurrency,
            currencyDisplay: 'symbol',
          }),
        };

        return {wallet, ui};
      })
      .sort((a, b) => (b.ui.fiatBalance || 0) - (a.ui.fiatBalance || 0));
  }, [dispatch, rates, resolvedQuoteCurrency, walletsForAssetDisplay]);

  const hasWalletsForAsset = assetWallets.length > 0;

  const assetTotalFiatBalance = useMemo(() => {
    return walletsForAsset.reduce((total, {ui}) => {
      return total + (ui.fiatBalance || 0);
    }, 0);
  }, [walletsForAsset]);

  const marketStatsCacheKey = useMemo(() => {
    return getMarketStatsCacheKey({
      fiatCode: resolvedQuoteCurrency,
      coin: normalizedCoin,
    });
  }, [normalizedCoin, resolvedQuoteCurrency]);

  const marketStats = useAppSelector(
    ({MARKET_STATS}: RootState) => MARKET_STATS.itemsByKey[marketStatsCacheKey],
  );

  useEffect(() => {
    if (!resolvedQuoteCurrency || !normalizedCoin) {
      return;
    }

    dispatch(
      fetchMarketStats({
        fiatCode: resolvedQuoteCurrency,
        coin: normalizedCoin,
        ...historicalRateIdentity,
      }),
    );
  }, [dispatch, historicalRateIdentity, normalizedCoin, resolvedQuoteCurrency]);

  const marketHigh52wToDisplay = useMemo(() => {
    if (marketStats?.high52w == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.high52w, resolvedQuoteCurrency);
  }, [marketStats?.high52w, resolvedQuoteCurrency]);

  const marketLow52wToDisplay = useMemo(() => {
    if (marketStats?.low52w == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.low52w, resolvedQuoteCurrency);
  }, [marketStats?.low52w, resolvedQuoteCurrency]);

  const marketVolume24hToDisplay = useMemo(() => {
    if (marketStats?.volume24h == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.volume24h, resolvedQuoteCurrency);
  }, [marketStats?.volume24h, resolvedQuoteCurrency]);

  const marketCapToDisplay = useMemo(() => {
    if (marketStats?.marketCap == null) {
      return '--';
    }
    return formatCompactCurrency(marketStats.marketCap, resolvedQuoteCurrency);
  }, [marketStats?.marketCap, resolvedQuoteCurrency]);

  const circulatingSupplyToDisplay = useMemo(() => {
    if (marketStats?.circulatingSupply == null) {
      return '--';
    }
    return `${formatSupply(
      marketStats.circulatingSupply,
    )} ${currencyAbbreviation}`;
  }, [currencyAbbreviation, marketStats?.circulatingSupply]);

  const aboutToDisplay = useMemo(() => {
    const about =
      marketStats?.about ||
      (normalizedCoin === 'pol' ? POLYGON_ABOUT_FALLBACK : '');
    return about.replace(/\r\n/g, '\n').trim();
  }, [marketStats?.about, normalizedCoin]);

  const assetTheme = useMemo(
    () =>
      getAssetTheme({
        currencyAbbreviation: params?.currencyAbbreviation,
        chain: params?.chain,
        tokenAddress: params?.tokenAddress,
      }),
    [params?.chain, params?.currencyAbbreviation, params?.tokenAddress],
  );

  const {coinColor: rawCoinColor, gradientBackgroundColor} = assetTheme ??
    coin.theme ?? {
      coinColor: ProgressBlue,
      gradientBackgroundColor: theme.dark ? 'transparent' : White,
    };
  const chartLineColor =
    theme.dark && rawCoinColor === Black ? White : rawCoinColor;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () =>
        React.createElement(HeaderTitleText, null, currencyName),
      headerLeft: () => React.createElement(HeaderBackButton),
    });
  }, [currencyName, navigation]);

  return {
    aboutToDisplay,
    assetContext,
    assetTotalFiatBalance,
    assetWallets,
    asOfMs,
    chartLineColor,
    circulatingSupplyToDisplay,
    currencyAbbreviation,
    currencyImageSource: assetCurrencyOption?.img || coin.img,
    currencyName,
    currentFiatRate,
    formatDisplayPrice,
    gradientBackgroundColor,
    hasValidNormalizedCoin,
    hasWalletsForAsset,
    hideAllBalances,
    showPortfolioValue,
    historicalRateIdentity,
    isAssetBalanceHistoryMode,
    keys,
    marketCapToDisplay,
    marketHigh52wToDisplay,
    marketLow52wToDisplay,
    marketVolume24hToDisplay,
    normalizedCoin,
    rates,
    resolvedQuoteCurrency,
    walletsForAsset,
  };
};

export default useExchangeRateSharedModel;
