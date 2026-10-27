import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {useTheme} from '../../../../contexts';
import {Caution, Slate, SlateDark, White} from '../../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, View, ViewProps} from 'react-native';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  useNavigation,
  StackActions,
  useIsFocused,
} from '@react-navigation/native';
import {cloneDeep} from '../../../../utils/object';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {BaseText} from '../../../../components/styled/Text';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {
  GetPrecision,
  IsERCToken,
} from '../../../../store/wallet/utils/currency';
import {SendMaxInfo, Wallet} from '../../../../store/wallet/wallet.models';
import {SwapCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {AppActions} from '../../../../store/app';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import SwapCryptoOfferSelectorModal from './SwapCryptoOfferSelectorModal';
import {getErrorMessage} from '../../utils/external-services-utils';
import {
  calculateSlippageMinAmount,
  isPairSupported,
  SwapCryptoExchangeKey,
  SwapCryptoSupportedExchanges,
} from '../utils/swap-crypto-utils';
import {SwapCryptoLimits} from '../../../../store/swap-crypto/swap-crypto.models';
import {
  ThorswapGetSwapQuoteData,
  ThorswapGetSwapQuoteRequestData,
  ThorswapProvider,
  ThorswapQuoteRoute,
} from '../../../../store/swap-crypto/models/thorswap.models';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import ThorswapLogo from '../../../../components/icons/external-services/thorswap/thorswap-logo';
import {THORSWAP_DEFAULT_SLIPPAGE} from '../constants/ThorswapConstants';
import {
  PreLoadPartnersData,
  SwapCryptoCoin,
  SwapLimits,
} from '../screens/SwapCryptoRoot';
import {
  ChangellyGetRateData,
  ChangellyGetRateRequestData,
} from '../../../../store/swap-crypto/models/changelly.models';
import {
  changellyGetFixRateForAmount,
  getChangellyFixedCurrencyAbbreviation,
} from '../utils/changelly-utils';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import {
  getEstimatedTimeStrFromRoute,
  getProvidersPathFromRoute,
  getThorswapFixedCoin,
  getThorswapRouteBySpenderKey,
  thorswapEnv,
} from '../utils/thorswap-utils';

const styles = StyleSheet.create({
  offerSelectorClickableRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  offerSelectorContainerLeft: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  offerSelectorContainerRight: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  offerSelectorText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 24,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  offerSelectedLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  warnMsgText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    color: Caution,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  activityIndicatorContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  arrowContainer: {
    marginLeft: 10,
  },
});

export const SwapCryptoOfferSelectorContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={style} {...rest} />;

const OfferSelectorClickableRow: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.offerSelectorClickableRow, style]}
    {...rest}
  />
);

export const OfferSelectorContainerLeft: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.offerSelectorContainerLeft, style]} {...rest} />;

export const OfferSelectorContainerRight: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.offerSelectorContainerRight, style]} {...rest} />;

export const OfferSelectorText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.offerSelectorText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferSelectorText.displayName = 'OfferSelectorText';

const OfferSelectedLabel = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.offerSelectedLabel,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferSelectedLabel.displayName = 'OfferSelectedLabel';

const WarnMsgText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.warnMsgText, style]} {...rest} />
));
WarnMsgText.displayName = 'WarnMsgText';

const ArrowContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.arrowContainer, style]} {...rest} />
);

export type SwapCryptoOffer = {
  key: SwapCryptoExchangeKey;
  name: string;
  showOffer: boolean;
  logo: React.JSX.Element;
  expanded: boolean;
  swapClicked: boolean;
  rate: string | undefined;
  rateFiat: string | undefined;
  amountReceiving?: string;
  amountReceivingFiat?: string;
  fee?: number;
  showApprove?: boolean;
  approveConfirming?: boolean;
  amountLimits?: SwapCryptoLimits;
  quoteData?: any; // Changelly | Thorswap
  hasExtraOpts?: boolean;
  selectedSpenderKey?: ThorswapProvider;
  selectedProvidersPath?: string;
  spenderSelectorExpanded?: boolean;
  slippage?: number;
  slippageOpts?: {
    steps: number;
    max: number;
    min: number;
    minLimit: number;
    maxLimit: number;
  };
  estimatedTime?: string;
  estimatedMinAmountReceiving?: string;
  errorMsg?: string;
  outOfLimitMsg?: string;
};

const offersDefault: {
  [key in SwapCryptoExchangeKey]: SwapCryptoOffer;
} = {
  changelly: {
    key: 'changelly',
    name: 'Changelly',
    amountReceiving: undefined,
    showOffer: true,
    logo: <ChangellyLogo iconOnly={true} width={25} height={25} />,
    expanded: false,
    swapClicked: false,
    showApprove: false,
    approveConfirming: false,
    rate: undefined,
    rateFiat: undefined,
    hasExtraOpts: false,
    slippage: undefined,
    estimatedTime: undefined,
    estimatedMinAmountReceiving: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  thorswap: {
    key: 'thorswap',
    name: 'THORSwap',
    amountReceiving: undefined,
    showOffer: true,
    logo: <ThorswapLogo iconOnly={true} widthIcon={25} heightIcon={25} />,
    expanded: false,
    swapClicked: false,
    showApprove: false,
    approveConfirming: false,
    rate: undefined,
    rateFiat: undefined,
    hasExtraOpts: true,
    slippage: THORSWAP_DEFAULT_SLIPPAGE,
    slippageOpts: {
      steps: 0.5,
      max: 10,
      min: 0,
      minLimit: 0.5,
      maxLimit: 10,
    },
    estimatedTime: undefined,
    estimatedMinAmountReceiving: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

interface SwapCryptoOfferSelectorProps {
  amountFrom: number;
  coinFrom: string;
  chainFrom: string;
  coinTo: string;
  chainTo: string;
  selectedWalletFrom: Wallet;
  selectedWalletTo: Wallet;
  swapCryptoConfig: SwapCryptoConfig | undefined;
  country?: string | undefined;
  preSetPartner?: SwapCryptoExchangeKey | undefined;
  preLoadPartnersData?: PreLoadPartnersData;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo | undefined;
  onSelectOffer?: (offer: SwapCryptoOffer | undefined) => void;
  setOffersLoading?: (offersLoading: boolean) => void;
  getWarnMsg?: string;
  swapLimits?: SwapLimits;
}

const SwapCryptoOfferSelector: React.FC<SwapCryptoOfferSelectorProps> = ({
  amountFrom,
  coinFrom,
  chainFrom,
  coinTo,
  chainTo,
  selectedWalletFrom,
  selectedWalletTo,
  swapCryptoConfig,
  country,
  preSetPartner,
  preLoadPartnersData,
  useSendMax: _useSendMax,
  sendMaxInfo: _sendMaxInfo,
  onSelectOffer,
  setOffersLoading,
  getWarnMsg,
  swapLimits,
}) => {
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  useIsFocused();
  const dispatch = useAppDispatch();
  const rates = useAppSelector(({RATE}) => RATE.rates);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  SwapCryptoSupportedExchanges.forEach((exchange: SwapCryptoExchangeKey) => {
    if (offersDefault[exchange]) {
      let supportedCoins: SwapCryptoCoin[] | undefined;
      if (preLoadPartnersData && preLoadPartnersData[exchange]) {
        supportedCoins = preLoadPartnersData[exchange].supportedCoins;

        offersDefault[exchange].amountLimits =
          preLoadPartnersData[exchange].limits;
      }

      if (
        preSetPartner &&
        SwapCryptoSupportedExchanges.includes(preSetPartner)
      ) {
        offersDefault[exchange].showOffer =
          preSetPartner === exchange
            ? isPairSupported(
                preSetPartner,
                coinFrom,
                chainFrom,
                coinTo,
                chainTo,
                supportedCoins,
                country,
              ) &&
              (!swapCryptoConfig?.[preSetPartner] ||
                !swapCryptoConfig?.[preSetPartner]?.removed)
            : false;
      } else {
        offersDefault[exchange].showOffer =
          isPairSupported(
            exchange,
            coinFrom,
            chainFrom,
            coinTo,
            chainTo,
            supportedCoins,
            country,
          ) &&
          (!swapCryptoConfig?.[exchange] ||
            !swapCryptoConfig?.[exchange]?.removed);
      }
    }
    if (exchange === 'thorswap') {
      offersDefault.thorswap.showApprove = IsERCToken(
        selectedWalletFrom.currencyAbbreviation,
        selectedWalletFrom.chain,
      )
        ? true
        : false;
    }
  });

  const theme = useTheme();
  const initialOffers = useMemo(
    () => cloneDeep(offersDefault),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: adding the missing deps would change this effect’s existing behaviour
    [swapCryptoConfig, country, coinFrom, chainFrom, coinTo, chainTo],
  );
  const [offers, setOffers] = useState(cloneDeep(initialOffers));
  const [_switchingThorswapProvider, setSwitchingThorswapProvider] =
    useState(false);
  const [finishedChangelly, setFinishedChangelly] = useState<boolean | null>(
    null,
  );
  const [finishedThorswap, setFinishedThorswap] = useState<boolean | null>(
    null,
  );
  const [updateView, _setUpdateView] = useState<number>(0);
  const [_approveThorswapSpenderKey, _setApproveThorswapSpenderKey] = useState<
    ThorswapProvider | undefined
  >();
  const [offerWarnMsg, setOfferWarnMsg] = useState<string | undefined>(
    getWarnMsg,
  );
  const [selectedOffer, setSelectedOffer] = useState<
    SwapCryptoOffer | undefined
  >();
  const [selectedOfferLoading, setSelectedOfferLoading] =
    useState<boolean>(false);
  const [offerSelectorModalVisible, setOfferSelectorModalVisible] =
    useState(false);

  // Get Swap Quotes

  const getChangellyQuote = async (
    selectedWalletFrom: Wallet,
    selectedWalletTo: Wallet,
  ): Promise<void> => {
    logger.debug('Changelly getting quote');

    if (swapCryptoConfig?.changelly?.disabled) {
      let err = swapCryptoConfig?.changelly?.disabledMessage
        ? swapCryptoConfig?.changelly?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'changellyGetQuote Error. Exchange disabled from config.';
      showChangellyError(err, reason);
      return;
    }

    if (
      (offers.changelly.amountLimits?.min &&
        amountFrom < offers.changelly.amountLimits.min) ||
      (offers.changelly.amountLimits?.max &&
        amountFrom > offers.changelly.amountLimits.max)
    ) {
      offers.changelly.outOfLimitMsg = t(
        'There are no Changelly offers available, as the current swap limits for this exchange must be between and',
        {
          min: offers.changelly.amountLimits.min,
          max: offers.changelly.amountLimits.max,
          coin: coinFrom.toUpperCase(),
        },
      );
      setFinishedChangelly(true);
      return;
    }

    const reqData: ChangellyGetRateRequestData = {
      amountFrom: amountFrom,
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        selectedWalletFrom.currencyAbbreviation.toLowerCase(),
        selectedWalletFrom.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        selectedWalletTo.currencyAbbreviation.toLowerCase(),
        selectedWalletTo.chain,
      ),
    };
    try {
      const changellyQuoteData: ChangellyGetRateData =
        await changellyGetFixRateForAmount(selectedWalletFrom, reqData);

      if (changellyQuoteData.error) {
        const msg =
          t('Changelly getFixRateForAmount Error: ') +
          changellyQuoteData.error.message;
        showChangellyError(msg);
        return;
      }

      if (changellyQuoteData.result?.length === 0) {
        const msg = t(
          'Changelly has temporarily disabled - pair. If you have further questions please reach out to them.',
          {
            fromWalletSelected: `${selectedWalletFrom.currencyAbbreviation.toUpperCase()}(${selectedWalletFrom.chain.toUpperCase()})`,
            toWalletSelected: `${selectedWalletTo.currencyAbbreviation.toUpperCase()}(${selectedWalletTo.chain.toUpperCase()})`,
          },
        );
        showChangellyError(msg);
        return;
      }

      offers.changelly.quoteData = changellyQuoteData.result[0];
      offers.changelly.amountReceiving = changellyQuoteData.result[0].amountTo;
      offers.changelly.rate = Number(changellyQuoteData.result[0].result) // result == rate
        .toFixed(6)
        .replace(/\.?0+$/, '');

      const precisionTo = dispatch(
        GetPrecision(coinTo, chainTo, selectedWalletTo.tokenAddress),
      );
      if (precisionTo) {
        offers.changelly.rateFiat = formatFiatAmount(
          dispatch(
            toFiat(
              Number(changellyQuoteData.result[0].result) *
                precisionTo.unitToSatoshi,
              defaultAltCurrency.isoCode,
              selectedWalletTo.currencyAbbreviation,
              selectedWalletTo.chain,
              rates,
              selectedWalletTo.tokenAddress,
            ),
          ),
          defaultAltCurrency.isoCode,
          {
            currencyDisplay:
              defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
          },
        );

        offers.changelly.amountReceivingFiat = formatFiatAmount(
          dispatch(
            toFiat(
              Number(changellyQuoteData.result[0].amountTo) *
                precisionTo.unitToSatoshi,
              defaultAltCurrency.isoCode,
              selectedWalletTo.currencyAbbreviation,
              selectedWalletTo.chain,
              rates,
              selectedWalletTo.tokenAddress,
            ),
          ),
          defaultAltCurrency.isoCode,
          {
            currencyDisplay:
              defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
          },
        );
      }

      logger.debug('Changelly getting quote: SUCCESS');
      setFinishedChangelly(true);
    } catch (err) {
      logger.error(
        'Changelly getFixRateForAmount Error: ' + JSON.stringify(err),
      );
      const title = t('Changelly Error');
      const msg = t(
        'Changelly is not available at this moment. Please try again later.',
      );
      showChangellyError(msg, title);
    }
  };

  const showChangellyError = (err?: any, reason?: string) => {
    let msg = getErrorMessage(err);
    logger.error('Changelly error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Swap Crypto', {
        exchange: 'changelly',
        context: 'SwapCryptoOffers',
        reason: reason || 'unknown',
        amountFrom: amountFrom,
        amountTo: offers.changelly.amountReceiving || '',
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
      }),
    );

    offers.changelly.errorMsg = msg;
    offers.changelly.amountReceiving = undefined;
    offers.changelly.expanded = false;
    setFinishedChangelly(true);
  };

  const getThorswapQuote = async (
    selectedWalletFrom: Wallet,
    selectedWalletTo: Wallet,
  ): Promise<void> => {
    logger.debug('Thorswap getting quote');

    if (swapCryptoConfig?.thorswap?.disabled) {
      let err = swapCryptoConfig?.thorswap?.disabledMessage
        ? swapCryptoConfig?.thorswap?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'thorswapGetQuote Error. Exchange disabled from config.';
      showThorswapError(err, reason);
      return;
    }

    if (
      (offers.thorswap.amountLimits?.min &&
        amountFrom < offers.thorswap.amountLimits?.min) ||
      (offers.thorswap.amountLimits?.max &&
        amountFrom > offers.thorswap.amountLimits?.max)
    ) {
      offers.thorswap.outOfLimitMsg = t(
        'There are no THORSwap offers available, as the current swap limits for this exchange must be between and',
        {
          min: offers.thorswap.amountLimits.min,
          max: offers.thorswap.amountLimits.max,
          coin: coinFrom.toUpperCase(),
        },
      );
      setFinishedThorswap(true);
      return;
    }

    const requestData: ThorswapGetSwapQuoteRequestData = {
      env: thorswapEnv,
      sellAsset: getThorswapFixedCoin(
        selectedWalletFrom.currencyAbbreviation,
        selectedWalletFrom.chain,
        selectedWalletFrom.tokenAddress,
      ),
      buyAsset: getThorswapFixedCoin(
        selectedWalletTo.currencyAbbreviation,
        selectedWalletTo.chain,
        selectedWalletTo.tokenAddress,
      ),
      sellAmount: amountFrom,
    };

    if (swapCryptoConfig?.thorswap?.config) {
      if (swapCryptoConfig.thorswap.config.affiliateAddress) {
        requestData.affiliateAddress =
          swapCryptoConfig.thorswap.config.affiliateAddress;
        if (swapCryptoConfig.thorswap.config.affiliateBasisPoints) {
          requestData.affiliateBasisPoints =
            swapCryptoConfig.thorswap.config.affiliateBasisPoints ?? 100; // 100 = 1%
          requestData.isAffiliateFeeFlat =
            swapCryptoConfig.thorswap.config.isAffiliateFeeFlat !== undefined
              ? swapCryptoConfig.thorswap.config.isAffiliateFeeFlat
              : true;
        }
      }
    }

    try {
      const THORSWAP_TIMEOUT = 20000; // 20 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(t('THORSwap request timed out'))),
          THORSWAP_TIMEOUT,
        ),
      );
      const requestPromise =
        selectedWalletFrom.thorswapGetSwapQuote(requestData);
      const _data = await Promise.race([requestPromise, timeoutPromise]);
      const thorswapQuoteData: ThorswapGetSwapQuoteData =
        (_data as any)?.body ?? _data;

      // TODO: remove this if(...) when Thorswap team fix the 1inch issue
      // Workaround to prevent an issue from Thorswap in which 1inch v4 is the spender and 1inch v5 is the destination address
      if (
        thorswapQuoteData?.routes &&
        Array.isArray(thorswapQuoteData.routes)
      ) {
        logger.debug('Removing ONEINCH from available Thorswap routes');
        thorswapQuoteData.routes = thorswapQuoteData.routes.filter(
          r => r.providers[0] !== 'ONEINCH',
        );
      }

      if (thorswapQuoteData?.routes && thorswapQuoteData?.routes[0]) {
        let bestRoute: ThorswapQuoteRoute = thorswapQuoteData.routes[0];
        if (
          offers.thorswap.selectedSpenderKey &&
          offers.thorswap.approveConfirming
        ) {
          const confirmingRoute = getThorswapRouteBySpenderKey(
            thorswapQuoteData.routes,
            offers.thorswap.selectedSpenderKey,
          );

          if (!confirmingRoute) {
            logger.debug(
              'Route not present in the new Thorswap quote for the confirming allowance provider',
            );
            return;
          }
          bestRoute = confirmingRoute;
        }

        offers.thorswap.outOfLimitMsg = undefined;
        offers.thorswap.errorMsg = undefined;
        offers.thorswap.selectedSpenderKey = bestRoute.providers[0];
        offers.thorswap.selectedProvidersPath =
          getProvidersPathFromRoute(bestRoute);
        offers.thorswap.quoteData = thorswapQuoteData.routes;

        offers.thorswap.amountReceiving = bestRoute.expectedOutput;

        if (
          bestRoute.fees[chainFrom.toUpperCase()] &&
          bestRoute.fees[chainFrom.toUpperCase()][0]
        ) {
          offers.thorswap.fee = Number(
            bestRoute.fees[chainFrom.toUpperCase()][0].totalFee,
          );
        }

        if (bestRoute.timeEstimates) {
          offers.thorswap.estimatedTime = getEstimatedTimeStrFromRoute(
            bestRoute.timeEstimates,
          );
        }

        if (
          bestRoute.meta?.slippagePercentage &&
          offers.thorswap.slippageOpts
        ) {
          const slippageFromRoute = Number(bestRoute.meta.slippagePercentage);
          if (slippageFromRoute <= 10 && slippageFromRoute >= 0.5) {
            offers.thorswap.slippage = slippageFromRoute;
          } else {
            offers.thorswap.slippage = THORSWAP_DEFAULT_SLIPPAGE;
          }
        }

        if (offers.thorswap.amountReceiving && offers.thorswap.slippage) {
          const newMin = calculateSlippageMinAmount(
            offers.thorswap.amountReceiving,
            offers.thorswap.slippage,
          );
          offers.thorswap.estimatedMinAmountReceiving = newMin
            .toFixed(4)
            .replace(/\.?0+$/, '');
        }

        if (bestRoute.expectedOutput && amountFrom) {
          const newRate = Number(bestRoute.expectedOutput) / amountFrom;
          offers.thorswap.rate = newRate.toFixed(6).replace(/\.?0+$/, '');

          const precisionTo = dispatch(
            GetPrecision(coinTo, chainTo, selectedWalletTo.tokenAddress),
          );
          if (precisionTo) {
            offers.thorswap.rateFiat = formatFiatAmount(
              dispatch(
                toFiat(
                  newRate * precisionTo.unitToSatoshi,
                  defaultAltCurrency.isoCode,
                  selectedWalletTo.currencyAbbreviation,
                  selectedWalletTo.chain,
                  rates,
                  selectedWalletTo.tokenAddress,
                ),
              ),
              defaultAltCurrency.isoCode,
              {
                currencyDisplay:
                  defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
              },
            );
          }
        } else {
          logger.error(
            `Thorswap error: Could not get precision for ${coinFrom}`,
          );
        }

        logger.debug('Thorswap getting quote: SUCCESS');
        setFinishedThorswap(true);
        // }
      } else {
        if (!thorswapQuoteData) {
          logger.error('Thorswap error: No thorswapQuoteData received');
        }
        if (
          thorswapQuoteData.message &&
          typeof thorswapQuoteData.message === 'string'
        ) {
          logger.error('Thorswap error: ' + thorswapQuoteData.message);
        }
        if (
          thorswapQuoteData.error &&
          typeof thorswapQuoteData.error === 'string'
        ) {
          logger.error('Thorswap error: ' + thorswapQuoteData.error);
        }
        if (thorswapQuoteData.errors) {
          logger.error(thorswapQuoteData.errors);
        }
        let err = t("Can't get rates at this moment. Please try again later");
        if (
          thorswapQuoteData.code &&
          thorswapQuoteData.type &&
          thorswapQuoteData.message
        ) {
          err = thorswapQuoteData.message;
        }
        const reason = 'thorswapGetQuote Error. Necessary data not included.';
        showThorswapError(err, reason);
      }
    } catch (err) {
      const reason = 'thorswapGetQuote Error';
      showThorswapError(err, reason);
    }
  };

  const showThorswapError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Thorswap error: ' + msg);

    dispatch(
      Analytics.track('Failed Swap Crypto', {
        exchange: 'thorswap',
        context: 'SwapCryptoOffers',
        reason: reason || 'unknown',
        amountFrom: amountFrom,
        amountTo: offers.thorswap.amountReceiving || '',
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
      }),
    );

    offers.thorswap.errorMsg = msg;
    offers.thorswap.amountReceiving = undefined;
    offers.thorswap.expanded = false;
    setSwitchingThorswapProvider(false);
    setFinishedThorswap(true);
  };

  const showError = (title: string, msg: string) => {
    dispatch(
      AppActions.showBottomNotificationModal({
        title: title ?? t('Error'),
        message: msg,
        type: 'error',
        actions: [
          {
            text: t('OK'),
            action: () => {
              navigation.dispatch(StackActions.popToTop());
            },
          },
        ],
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {
          navigation.dispatch(StackActions.popToTop());
        },
      }),
    );
  };

  const init = (selectedWalletFrom: Wallet, selectedWalletTo: Wallet) => {
    const showedOffersCount = Object.values(cloneDeep(offers)).filter(
      offer => offer.showOffer,
    ).length;
    if (showedOffersCount === 0) {
      const title = t('No offers');
      const msg = t(
        'There are currently no offers that satisfy your request. Please try again later.',
      );

      logger.error(msg);
      showError(title, msg);
    } else {
      // Reset finished states before starting new quotes
      if (offers.changelly.showOffer) {
        setFinishedChangelly(false);
        offers.changelly.swapClicked = false;
        getChangellyQuote(selectedWalletFrom, selectedWalletTo);
      } else {
        setFinishedChangelly(null); // Not participating
      }
      if (offers.thorswap.showOffer) {
        setFinishedThorswap(false);
        offers.thorswap.swapClicked = false;
        getThorswapQuote(selectedWalletFrom, selectedWalletTo);
      } else {
        setFinishedThorswap(null); // Not participating
      }
    }
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!amountFrom || amountFrom === 0 || isNaN(amountFrom)) {
      setOfferWarnMsg(undefined);
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
      setSelectedOfferLoading(false);
      setOffersLoading?.(false);
      setOffers(cloneDeep(initialOffers));
      setFinishedChangelly(null);
      setFinishedThorswap(null);
      return;
    }

    if (
      !(selectedWalletFrom || selectedWalletTo) ||
      !(swapLimits?.minAmount || swapLimits?.maxAmount)
    ) {
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
      setSelectedOfferLoading(false);
      setOffersLoading?.(false);
      setOffers(cloneDeep(initialOffers));
      setFinishedChangelly(null);
      setFinishedThorswap(null);
      return;
    }

    if (swapLimits) {
      const maxWalletAmount = Number(
        // @ts-ignore
        selectedWalletFrom.balance?.cryptoSpendable?.replaceAll(',', ''),
      );
      if (
        (swapLimits.minAmount && amountFrom < swapLimits.minAmount) ||
        (swapLimits.maxAmount && amountFrom > swapLimits.maxAmount) ||
        (maxWalletAmount && amountFrom > maxWalletAmount)
      ) {
        setSelectedOffer(undefined);
        onSelectOffer?.(undefined);
        setSelectedOfferLoading(false);
        setOffersLoading?.(false);
        setOffers(cloneDeep(initialOffers));
        setFinishedChangelly(null);
        setFinishedThorswap(null);
        return;
      }
    }

    setOfferWarnMsg(undefined);
    setSelectedOffer(undefined);
    onSelectOffer?.(undefined);
    setSelectedOfferLoading(true);
    setOffersLoading?.(true);

    // Clean up the previous timeout if the value changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      init(cloneDeep(selectedWalletFrom), cloneDeep(selectedWalletTo));
    }, 100);

    // Clean up the timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: adding the missing deps would change this effect’s existing behaviour
  }, [selectedWalletFrom, selectedWalletTo, amountFrom, swapLimits]);

  useEffect(() => {
    setOffers(offers);

    if (
      !selectedWalletFrom ||
      !selectedWalletTo ||
      !amountFrom ||
      !(swapLimits?.minAmount || swapLimits?.maxAmount)
    ) {
      return;
    }
    const maxWalletAmount = Number(
      // @ts-ignore
      selectedWalletFrom.balance?.cryptoSpendable?.replaceAll(',', ''),
    );
    if (
      (swapLimits.minAmount && amountFrom < swapLimits.minAmount) ||
      (swapLimits.maxAmount && amountFrom > swapLimits.maxAmount) ||
      (maxWalletAmount && amountFrom > maxWalletAmount)
    ) {
      return;
    }

    // Check if all participating exchanges have finished
    // finishedChangelly/finishedThorswap: null = not participating, false = loading, true = finished
    const changellyReady =
      finishedChangelly === null || finishedChangelly === true;
    const thorswapReady =
      finishedThorswap === null || finishedThorswap === true;
    const allExchangesFinished = changellyReady && thorswapReady;

    // At least one exchange must be participating (not null)
    const hasParticipatingExchange =
      finishedChangelly !== null || finishedThorswap !== null;

    if (!allExchangesFinished || !hasParticipatingExchange) {
      return;
    }

    // All exchanges have finished, evaluate offers
    const offersArray = Object.values(offers);
    const filteredOffers = offersArray.filter(
      offer =>
        offer.showOffer &&
        offer.amountReceiving &&
        offer.amountReceiving !== '0',
    );
    if (filteredOffers.length === 0) {
      setOfferWarnMsg(
        t(
          'There are currently no offers that satisfy your request. Please try again later.',
        ),
      );
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
      setSelectedOfferLoading(false);
      setOffersLoading?.(false);
      return;
    }
    const _selectedOffer = [...filteredOffers].reduce((prev, curr) =>
      parseFloat(curr.amountReceiving || '0') >
      parseFloat(prev.amountReceiving || '0')
        ? curr
        : prev,
    );

    const amountReceiving = Number(_selectedOffer.amountReceiving);
    if (amountReceiving !== 0 && !isNaN(amountReceiving)) {
      setSelectedOffer(_selectedOffer);
      onSelectOffer?.(_selectedOffer);
      setOfferWarnMsg(undefined);

      dispatch(
        Analytics.track('Swap - Our Best Offer Loaded', {
          exchange: _selectedOffer?.key || 'unknown',
          fiatAmount: Number(_selectedOffer?.amountReceiving) || '',
          amountFrom: amountFrom,
          amountTo: offers.changelly.amountReceiving || '',
          coinFrom: coinFrom?.toLowerCase() || '',
          chainFrom: chainFrom?.toLowerCase() || '',
          coinTo: coinTo?.toLowerCase() || '',
          chainTo: chainTo?.toLowerCase() || '',
        }),
      );
    } else {
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
    }
    setSelectedOfferLoading(false);
    setOffersLoading?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: adding the missing deps would change this effect’s existing behaviour
  }, [finishedChangelly, finishedThorswap, updateView]);

  useEffect(() => {
    setOfferWarnMsg(getWarnMsg);
  }, [getWarnMsg]);

  useEffect(() => {
    return () => {
      logger.debug('SwapCryptoOfferSelector cleanup on unmount...');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: adding the missing deps would change this effect’s existing behaviour
  }, []);

  const onBackdropPress = () => {
    setOfferSelectorModalVisible(false);
  };

  return (
    <SwapCryptoOfferSelectorContainer>
      <>
        {offerWarnMsg ? (
          <WarnMsgText>{offerWarnMsg}</WarnMsgText>
        ) : (
          <OfferSelectorClickableRow
            onPress={() => {
              if (
                amountFrom === 0 ||
                !amountFrom ||
                isNaN(amountFrom) ||
                !selectedWalletFrom ||
                !selectedWalletTo
              ) {
                return;
              }
              const maxWalletAmount = Number(
                // @ts-ignore
                selectedWalletFrom.balance?.cryptoSpendable?.replaceAll(
                  ',',
                  '',
                ),
              );
              if (
                swapLimits &&
                ((swapLimits.minAmount && amountFrom < swapLimits.minAmount) ||
                  (swapLimits.maxAmount && amountFrom > swapLimits.maxAmount) ||
                  (maxWalletAmount && amountFrom > maxWalletAmount))
              ) {
                return;
              }
              setOfferSelectorModalVisible(true);
              dispatch(
                Analytics.track('Swap Crypto Offers', {
                  fromCoin:
                    selectedWalletFrom.currencyAbbreviation?.toLowerCase(),
                  fromChain: selectedWalletFrom.chain?.toLowerCase(),
                  toCoin: selectedWalletTo.currencyAbbreviation?.toLowerCase(),
                  toChain: selectedWalletTo.chain?.toLowerCase(),
                  amountFrom: amountFrom,
                }),
              );
            }}>
            <OfferSelectorContainerLeft>
              <OfferSelectorText>{t('Partner')}</OfferSelectorText>
            </OfferSelectorContainerLeft>
            <OfferSelectorContainerRight>
              <View style={{marginRight: 5}}>
                {selectedOffer?.logo ? selectedOffer.logo : null}
              </View>
              <OfferSelectedLabel>{selectedOffer?.name}</OfferSelectedLabel>
              <ArrowContainer>
                <SelectorArrowRight
                  {...{
                    width: 14,
                    height: 14,
                    color: selectedWalletFrom
                      ? theme.dark
                        ? Slate
                        : SlateDark
                      : White,
                  }}
                />
              </ArrowContainer>
            </OfferSelectorContainerRight>
          </OfferSelectorClickableRow>
        )}
      </>

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={offerSelectorModalVisible}
        onBackdropPress={onBackdropPress}
        fullscreen>
        <SwapCryptoOfferSelectorModal
          modalTitle={t('Partners')}
          offers={offers}
          selectedWalletFrom={selectedWalletFrom}
          selectedWalletTo={selectedWalletTo}
          amountFrom={amountFrom}
          showOffersLoading={selectedOfferLoading}
          selectedOffer={selectedOffer}
          country={country}
          preSetPartner={preSetPartner}
          offerSelectorOnDismiss={selectedOffer => {
            if (selectedOffer) {
              setSelectedOffer(selectedOffer);
              onSelectOffer?.(selectedOffer);
            }
            setOfferSelectorModalVisible(false);
          }}
        />
      </SheetModal>
    </SwapCryptoOfferSelectorContainer>
  );
};

export default memo(SwapCryptoOfferSelector);
