import React, {memo, useEffect, useRef, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {
  Caution,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {HEIGHT} from '../../../../components/styled/Containers';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  useNavigation,
  StackActions,
  useIsFocused,
} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
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
import _ from 'lodash';
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
import {formatFiatAmount, sleep} from '../../../../utils/helper-methods';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import {
  getEstimatedTimeStrFromRoute,
  getProvidersPathFromRoute,
  getThorswapFixedCoin,
  getThorswapRouteBySpenderKey,
  getThorswapSpenderDataFromRoute,
  thorswapEnv,
} from '../utils/thorswap-utils';
import {SwapCryptoScreens} from '../SwapCryptoGroup';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {getERC20TokenAllowance} from '../../../../store/moralis/moralis.effects';

export const SwapCryptoOfferSelectorContainer = styled.View``;

let unmountView = false;

const OfferSelectorClickableRow = styled(TouchableOpacity)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 48px;
`;

export const OfferSelectorContainerLeft = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

export const OfferSelectorContainerRight = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

export const OfferSelectorText = styled(BaseText)`
  font-size: 13px;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  flex: 1;
  min-width: 0;
  flex-shrink: 1;
  flex-wrap: wrap;
`;

const OfferSelectedLabel = styled(BaseText)`
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const WarnMsgText = styled(BaseText)`
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: ${Caution};
  flex: 1;
  min-width: 0;
  flex-shrink: 1;
  flex-wrap: wrap;
`;

const ActivityIndicatorContainer = styled.View`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

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
  useSendMax,
  sendMaxInfo,
  onSelectOffer,
  setOffersLoading,
  getWarnMsg,
  swapLimits,
}) => {
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const {rates} = useAppSelector(({RATE}) => RATE);
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
  const _isSmallScreen = HEIGHT < 700;
  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [switchingThorswapProvider, setSwitchingThorswapProvider] =
    useState(false);
  const [finishedChangelly, setFinishedChangelly] = useState(false);
  const [finishedThorswap, setFinishedThorswap] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);
  const [approveThorswapSpenderKey, setApproveThorswapSpenderKey] = useState<
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
      setFinishedChangelly(!finishedChangelly);
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
      setFinishedChangelly(!finishedChangelly);
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
    setUpdateView(Math.random());
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
      setFinishedThorswap(!finishedThorswap);
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
      const _data = await selectedWalletFrom.thorswapGetSwapQuote(requestData);
      const thorswapQuoteData: ThorswapGetSwapQuoteData = _data?.body ?? _data;

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
          bestRoute.fees[cloneDeep(chainFrom).toUpperCase()] &&
          bestRoute.fees[cloneDeep(chainFrom).toUpperCase()][0]
        ) {
          offers.thorswap.fee = Number(
            bestRoute.fees[cloneDeep(chainFrom).toUpperCase()][0].totalFee,
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
        setFinishedThorswap(!finishedThorswap);
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

  const setSelectedThorswapRoute = (selectedRoute: ThorswapQuoteRoute) => {
    setSwitchingThorswapProvider(true);
    offers.thorswap.selectedSpenderKey = selectedRoute.providers[0];
    offers.thorswap.selectedProvidersPath =
      getProvidersPathFromRoute(selectedRoute);
    offers.thorswap.spenderSelectorExpanded = false;
    if (selectedRoute.timeEstimates) {
      offers.thorswap.estimatedTime = getEstimatedTimeStrFromRoute(
        selectedRoute.timeEstimates,
      );
    }
    offers.thorswap.amountReceiving = selectedRoute.expectedOutput;

    if (
      selectedRoute.meta?.slippagePercentage &&
      offers.thorswap.slippageOpts
    ) {
      const slippageFromRoute = Number(selectedRoute.meta.slippagePercentage);
      if (slippageFromRoute <= 10 && slippageFromRoute >= 0.5) {
        offers.thorswap.slippage = slippageFromRoute;
      } else {
        offers.thorswap.slippage = THORSWAP_DEFAULT_SLIPPAGE;
      }
    }

    if (offers.thorswap.slippage) {
      onSlippageChange(offers.thorswap.key, offers.thorswap.slippage);
    } else {
      setUpdateView(Math.random());
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
    setUpdateView(Math.random());
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

  const goToApproveErc20 = (offer: SwapCryptoOffer) => {
    let selectedRoute: ThorswapQuoteRoute | undefined;
    if (offer.selectedSpenderKey) {
      logger.debug(
        `Trying to go to Approve ERC20 Screen with spenderKey: ${offer.selectedSpenderKey}`,
      );
      selectedRoute = (offer.quoteData as ThorswapQuoteRoute[]).find(
        route => route.providers[0] === offer.selectedSpenderKey,
      );
    }

    if (!selectedRoute) {
      let err = t(
        'There was an error trying to perform the Approve ERC20 function for the selected provider. Please try again later',
      );
      const reason = 'goToApproveErc20 Error. selectedRoute not found.';
      showThorswapError(err, reason);
      return;
    }

    const spenderData = getThorswapSpenderDataFromRoute(selectedRoute);

    if (!spenderData?.address) {
      let err = t(
        "It was not possible to obtain the provider's address to perform the Approve ERC20 function. Please try again later",
      );
      const reason =
        'goToApproveErc20 Error. spenderData.address not included.';
      showThorswapError(err, reason);
      return;
    }

    setApproveThorswapSpenderKey(spenderData.key);

    navigation.navigate(SwapCryptoScreens.SWAP_CRYPTO_APPROVE, {
      context: 'swapCrypto',
      onDismiss: async (approveTxSent, err) => {
        if (err) {
          await sleep(1000);
          const title = t('Approve method Error');
          showError(title, err);
          return;
        }
        if (approveTxSent?.txid && offer.key) {
          // show waiting confirmation message
          offers[offer.key].approveConfirming = true;
          offers[offer.key].expanded = true;
          setUpdateView(Math.random());
          checkTokenAllowance(true, 3000);
        }
      },
      wallet: selectedWalletFrom,
      spenderData: {
        offerKey: offer.key || '',
        offerName: offer.name || '',
        spenderKey: spenderData.key!,
        address: spenderData.address || '',
        amount: cloneDeep(amountFrom).toString(),
      },
    });
  };

  const getTokenAllowance = async (data: {spenderAddress: string}) => {
    if (!selectedWalletFrom.tokenAddress) {
      const reason = 'contract tokenAddress not present';
      showThorswapError(undefined, reason);
      return;
    }

    let ownerAddress: string = '';
    try {
      ownerAddress = (await dispatch<any>(
        createWalletAddress({wallet: selectedWalletFrom, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showThorswapError(err, reason);
      return;
    }

    let reqData: {
      chain: string;
      ownerAddress: string;
      limit?: number;
      cursor?: string | null;
    } = {
      chain: selectedWalletFrom.chain,
      ownerAddress,
      cursor: null,
    };

    const getApprovalsUntilConditionMet = async (
      cursor: string | null,
    ): Promise<{allowance: string} | undefined> => {
      if (cursor) {
        reqData.cursor = cursor;
      }
      logger.debug(
        'getERC20TokenAllowance with reqData: ' + JSON.stringify(reqData),
      );

      return await dispatch(getERC20TokenAllowance(reqData))
        .then(async approvesData => {
          const spendersList = approvesData.result;
          const nextCursor = approvesData.cursor;
          let spenderData;

          if (Array.isArray(spendersList)) {
            spenderData = spendersList.find(
              s =>
                s.spender?.address?.toLowerCase() ===
                  data?.spenderAddress?.toLowerCase() &&
                s.token?.address?.toLowerCase() ===
                  selectedWalletFrom.tokenAddress?.toLowerCase(),
            );
          }

          if (spenderData) {
            return {
              allowance: spenderData.value ?? '0',
            };
          }

          if (!nextCursor) {
            return {
              allowance: '0',
            };
          }

          // If nextCursor is present, try to fetch the next list of approvals
          return await getApprovalsUntilConditionMet(nextCursor);
        })
        .catch(err => {
          let msg =
            typeof err?.message === 'string'
              ? err.message
              : JSON.stringify(err);
          logger.debug(msg);
          return undefined;
        });
    };

    const approvalData = await getApprovalsUntilConditionMet(null);

    if (approvalData) {
      return approvalData;
    } else {
      logger.debug(
        'Sufficient allowance could not be found for the selected spender. Setting allowance to 0...',
      );
      return {
        allowance: '0',
      };
    }
  };

  const checkTokenAllowance = async (
    waitingApproveTxConfirm?: boolean,
    ms?: number,
  ) => {
    logger.debug('Thorswap: Verifiyng ERC20 token allowances...');
    try {
      let selectedRoute: ThorswapQuoteRoute | undefined;
      if (offers.thorswap.selectedSpenderKey) {
        selectedRoute = (
          offers.thorswap.quoteData as ThorswapQuoteRoute[]
        ).find(
          route => route.providers[0] === offers.thorswap.selectedSpenderKey,
        );
      }

      if (!selectedRoute) {
        let err = t(
          "Can't get ERC20 allowances at this moment. Please try again later",
        );
        const reason = 'checkTokenAllowance Error. selectedRoute not found.';
        showThorswapError(err, reason);
        return;
      }

      const spenderData = getThorswapSpenderDataFromRoute(selectedRoute);
      if (!spenderData?.address) {
        let err = t(
          "Can't get ERC20 allowances at this moment. Please try again later",
        );
        const reason =
          'checkTokenAllowance Error. spenderData.address not included.';
        showThorswapError(err, reason);
        return;
      }
      const tokenAllowance = await getTokenAllowance({
        spenderAddress: spenderData.address,
      });

      if (!tokenAllowance) {
        let err = t(
          "Can't get ERC20 allowances at this moment. Please try again later",
        );
        const reason = 'checkTokenAllowance Error. tokenAllowance is undefined';
        showThorswapError(err, reason);
        return;
      }

      const precision = dispatch(
        GetPrecision(
          selectedWalletFrom.currencyAbbreviation,
          selectedWalletFrom.chain,
          selectedWalletFrom.tokenAddress,
        ),
      );
      const depositSat = BigInt(
        (amountFrom * precision!.unitToSatoshi).toFixed(0),
      );
      const allowance = BigInt(tokenAllowance.allowance);

      logger.debug(
        `Amount to deposit: ${depositSat} | Allowance amount for contract(${spenderData.address}) : ${allowance}`,
      );
      setSwitchingThorswapProvider(false);

      if (allowance < depositSat) {
        if (waitingApproveTxConfirm) {
          if (unmountView) {
            logger.debug('Unmount view. Stop checking allowances.');
            return;
          }
          logger.debug(
            `The wallet does not have enough Allowance to cover the Swap. Waiting approve Tx confirmation. Checking again in ${
              ms || 10000
            }ms...`,
          );
          await sleep(ms || 10000);
          checkTokenAllowance(true);
        } else {
          logger.debug(
            'The wallet does not have enough Allowance to cover the Swap. Showing Approve flow',
          );
          offers.thorswap.showApprove = true;
        }
      } else {
        logger.debug(
          'The wallet has enough Allowance to cover the Swap. Do not show Approve flow',
        );
        offers.thorswap.showApprove = false;
        offers.thorswap.approveConfirming = false;
      }

      setUpdateView(Math.random());
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const log = `checkTokenAllowance Error: ${errStr}`;
      logger.error(log);

      const _err = t(
        "Can't get allowances at this moment. Please try again later",
      );
      const reason =
        'checkTokenAllowance Error. Exception during verification.';
      showThorswapError(_err, reason);
      setSwitchingThorswapProvider(false);
      return;
    }
  };

  const onSlippageChange = (
    exchangeKey: SwapCryptoExchangeKey,
    value: number,
  ) => {
    offers[exchangeKey].slippage = value;

    const newMin = calculateSlippageMinAmount(
      offers[exchangeKey].amountReceiving!,
      value,
    );

    offers[exchangeKey].estimatedMinAmountReceiving = newMin
      .toFixed(4)
      .replace(/\.?0+$/, '');

    setUpdateView(Math.random());
  };

  const showSlippageInfoSheet = () => {
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Slippage Tolerance'),
        message:
          t(
            'Slippage happens when traders have to settle for a different price than what they initially requested due to a movement in price between the time the order enters the market and the execution of a trade.',
          ) +
          '\n' +
          t(
            'Low values increase chances that transaction will fail, high values increase chances of front running.',
          ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => null,
            primary: true,
          },
        ],
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
      if (offers.changelly.showOffer) {
        offers.changelly.swapClicked = false;
        getChangellyQuote(selectedWalletFrom, selectedWalletTo);
      }
      if (offers.thorswap.showOffer) {
        offers.thorswap.swapClicked = false;
        getThorswapQuote(selectedWalletFrom, selectedWalletTo);
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
      setOffers(offersDefault);
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
      setOffers(offersDefault);
      return;
    }

    if (swapLimits) {
      const maxWalletAmount = Number(
        // @ts-ignore
        cloneDeep(selectedWalletFrom.balance?.cryptoSpendable)?.replaceAll(
          ',',
          '',
        ),
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
        setOffers(offersDefault);
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
    }, 2000);

    // Clean up the timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
      cloneDeep(selectedWalletFrom.balance?.cryptoSpendable)?.replaceAll(
        ',',
        '',
      ),
    );
    if (
      (swapLimits.minAmount && amountFrom < swapLimits.minAmount) ||
      (swapLimits.maxAmount && amountFrom > swapLimits.maxAmount) ||
      (maxWalletAmount && amountFrom > maxWalletAmount)
    ) {
      return;
    }

    const offersTimeout = setTimeout(() => {
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
      const _selectedOffer = _.clone(filteredOffers).reduce((prev, curr) =>
        parseFloat(curr.amountReceiving || '0') >
        parseFloat(prev.amountReceiving || '0')
          ? curr
          : prev,
      );

      const amountReceiving = Number(cloneDeep(_selectedOffer.amountReceiving));
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
    }, 3500);

    return () => clearTimeout(offersTimeout);
  }, [finishedChangelly, finishedThorswap, updateView]);

  useEffect(() => {
    setOfferWarnMsg(getWarnMsg);
  }, [getWarnMsg]);

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
                cloneDeep(
                  selectedWalletFrom.balance?.cryptoSpendable,
                  // @ts-ignore
                )?.replaceAll(',', ''),
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
