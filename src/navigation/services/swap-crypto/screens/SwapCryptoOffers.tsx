import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import styled from 'styled-components/native';
import {
  RouteProp,
  useRoute,
  useNavigation,
  StackActions,
  useIsFocused,
} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Button from '../../../../components/button/Button';
import haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText, H5, H7, Small} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useLogger} from '../../../../utils/hooks/useLogger';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import ThorswapLogo from '../../../../components/icons/external-services/thorswap/thorswap-logo';
import {
  calculateSlippageMinAmount,
  isPairSupported,
  SwapCryptoExchangeKey,
  SwapCryptoSupportedExchanges,
} from '../utils/swap-crypto-utils';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  LuckySevens,
  LightBlack,
  NeutralSlate,
  Slate30,
  Slate,
} from '../../../../styles/colors';
import {
  GetPrecision,
  IsERCToken,
} from '../../../../store/wallet/utils/currency';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {SendMaxInfo, Wallet} from '../../../../store/wallet/wallet.models';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {
  changellyGetFixRateForAmount,
  getChangellyFixedCurrencyAbbreviation,
} from '../utils/changelly-utils';
import {
  getEstimatedTimeStrFromRoute,
  getProvidersPathFromRoute,
  getThorswapFixedCoin,
  getThorswapRouteBySpenderKey,
  getThorswapSpenderDataFromRoute,
  thorswapEnv,
} from '../utils/thorswap-utils';
import {SwapCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {AppActions} from '../../../../store/app';
import {
  BuyCryptoExpandibleCard,
  ItemDivisor,
} from '../../buy-crypto/styled/BuyCryptoCard';
import {
  ExchangeTermsContainer,
  ExchangeTermsText,
  TermsContainer,
  TermsText,
} from '../../buy-crypto/styled/BuyCryptoTerms';
import {
  ChangellyGetRateData,
  ChangellyGetRateRequestData,
  ChangellyRateResult,
} from '../../../../store/swap-crypto/models/changelly.models';
import {SwapCryptoLimits} from '../../../../store/swap-crypto/swap-crypto.models';
import {
  ThorswapGetSwapQuoteData,
  ThorswapGetSwapQuoteRequestData,
  ThorswapProvider,
  ThorswapProviderNames,
  ThorswapQuoteRoute,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {getERC20TokenAllowance} from '../../../../store/moralis/moralis.effects';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import {WIDTH} from '../../../../components/styled/Containers';
import {SelectorArrowContainer} from '../styled/SwapCryptoRoot.styled';
import ArrowDownSvg from '../../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../../assets/img/chevron-up.svg';
import InfoIcon from '../../../../components/icons/info/Info';
import {PreLoadPartnersData, SwapCryptoCoin} from './SwapCryptoRoot';
import {THORSWAP_DEFAULT_SLIPPAGE} from '../constants/ThorswapConstants';
import throttle from 'lodash.throttle';
import {SwapCryptoScreens} from '../SwapCryptoGroup';
import Checkbox from '../../../../components/checkbox/Checkbox';

const ThumbImage = require('../../../../../assets/img/services/swap-crypto/slider-thumb.png');

export type SwapCryptoOffersScreenParams = {
  amountFrom: number;
  coinFrom: string;
  chainFrom: string;
  coinTo: string;
  chainTo: string;
  country?: string | undefined;
  selectedWalletFrom: Wallet;
  selectedWalletTo: Wallet;
  swapCryptoConfig: SwapCryptoConfig | undefined;
  preSetPartner?: SwapCryptoExchangeKey | undefined;
  preLoadPartnersData?: PreLoadPartnersData;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo | undefined;
};

export type SwapCryptoOffer = {
  key: SwapCryptoExchangeKey;
  name: string;
  showOffer: boolean;
  logo: JSX.Element;
  expanded: boolean;
  swapClicked: boolean;
  rate: string | undefined;
  rateFiat: string | undefined;
  amountReceiving?: string;
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

let unmountView = false;

const SwapCryptoOffersContainer = styled.SafeAreaView`
  flex: 1;
`;

const SummaryRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin-top: 20px;
  padding: 0px 14px;
`;

const SummaryItemContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 50px;
`;

const SummaryTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-bottom: 5px;
`;

const SummaryData = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 500;
  font-size: 16px;
`;

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const CoinContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const CoinIconContainer = styled.View`
  width: 20px;
  height: 20px;
  margin-right: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SummaryCtaContainer = styled.View`
  margin: 4px 0px;
`;

const OfferColumn = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const OfferRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const OfferDataContainer = styled.View`
  display: flex;
  flex-direction: column;
`;

const BestOfferTagContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 5px;
`;
const BestOfferTag = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? '#2FCFA4' : '#cbf3e8')};
  border-radius: 50px;
  height: 25px;
  padding: 5px 10px;
`;

const BestOfferTagText = styled(Small)`
  color: ${Black};
`;

const OfferDataCryptoAmount = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const OfferDataInfoContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 10px;
`;

const OfferDataInfoLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

const OfferDataEstimatedValues = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 12px;
`;

const OfferExtraOptsContainer = styled.View<{expanded: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-top-width: 1px;
  border-bottom-width: ${({expanded}) => (expanded ? 1 : 0)}px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  padding: 5px 17px 5px 15px;
  margin: 16px 0px -18px -14px;
  border-bottom-left-radius: ${({expanded}) => (expanded ? 0 : 8)}px;
  border-bottom-right-radius: ${({expanded}) => (expanded ? 0 : 8)}px;
  width: ${WIDTH - 32}px;
  z-index: -1;
`;

const OfferExtraOptsProvidersContainer = styled.TouchableOpacity`
  border-bottom-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  padding: 5px 17px 5px 15px;
  margin: 0px 0px 0px -14px;
  width: ${WIDTH - 32}px;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSub = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const OfferDataSlidesOpts = styled.View`
  padding: 6px 0;
  border-bottom-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
`;

const OfferDataInfoTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 14px;
  font-weight: 500;
`;

const OfferExpandibleItem = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const OfferDataRightContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const OfferDataLeftContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const offersDefault: {
  changelly: SwapCryptoOffer;
  thorswap: SwapCryptoOffer;
} = {
  changelly: {
    key: 'changelly',
    name: 'Changelly',
    amountReceiving: undefined,
    showOffer: true,
    logo: <ChangellyLogo width={70} height={20} />,
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
    logo: (
      <ThorswapLogo
        widthIcon={20}
        heightIcon={20}
        widthLogo={66}
        heightLogo={20}
      />
    ),
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

const SwapCryptoOffers: React.FC = () => {
  const {
    params: {
      amountFrom,
      coinFrom,
      chainFrom,
      coinTo,
      chainTo,
      country,
      selectedWalletFrom,
      selectedWalletTo,
      swapCryptoConfig,
      preSetPartner,
      preLoadPartnersData,
      useSendMax,
      sendMaxInfo,
    },
  }: {params: SwapCryptoOffersScreenParams} =
    useRoute<RouteProp<{params: SwapCryptoOffersScreenParams}>>();
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

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [switchingThorswapProvider, setSwitchingThorswapProvider] =
    useState(false);
  const [finishedChangelly, setFinishedChangelly] = useState(false);
  const [finishedThorswap, setFinishedThorswap] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);
  const [approveThorswapSpenderKey, setApproveThorswapSpenderKey] = useState<
    ThorswapProvider | undefined
  >();

  const getChangellyQuote = async (): Promise<void> => {
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

    logger.error('Changelly error: ' + msg);

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

  const getThorswapQuote = async (): Promise<void> => {
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
      const thorswapQuoteData: ThorswapGetSwapQuoteData =
        await selectedWalletFrom.thorswapGetSwapQuote(requestData);

      if (thorswapQuoteData?.routes && thorswapQuoteData?.routes[0]) {
        let bestRoute: ThorswapQuoteRoute = thorswapQuoteData.routes[0];
        if (
          offers.thorswap.selectedSpenderKey &&
          offers.thorswap.approveConfirming
        ) {
          const confirmingRoute = getThorswapRouteBySpenderKey(
            thorswapQuoteData.routes,
            offers.thorswap.selectedSpenderKey);

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

  const goTo = (key: string): void => {
    switch (key) {
      case 'changelly':
        goToChangellyConfirmPage();
        break;

      case 'thorswap':
        goToThorswapConfirmPage();
        break;
    }
  };

  const goToChangellyConfirmPage = () => {
    if (offers.changelly.errorMsg || offers.changelly.outOfLimitMsg) {
      return;
    }
    continueToChangelly();
  };

  const continueToChangelly = async () => {
    dispatch(
      Analytics.track('Requested Swap Crypto', {
        exchange: 'changelly',
        amountFrom: amountFrom,
        amountTo: offers.changelly.amountReceiving || '',
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
      }),
    );

    const fixedRateId = (offers.changelly.quoteData as ChangellyRateResult)?.id;

    navigation.navigate(SwapCryptoScreens.CHANGELLY_CHECKOUT, {
      fromWalletSelected: selectedWalletFrom!,
      toWalletSelected: selectedWalletTo!,
      fixedRateId: fixedRateId,
      amountFrom: amountFrom,
      useSendMax: IsERCToken(
        selectedWalletFrom!.currencyAbbreviation,
        selectedWalletFrom!.chain,
      )
        ? false
        : useSendMax,
      sendMaxInfo: sendMaxInfo,
    });
  };

  const goToThorswapConfirmPage = async () => {
    if (offers.thorswap.errorMsg || offers.thorswap.outOfLimitMsg) {
      return;
    }
    continueToThorswap();
  };

  const continueToThorswap = async () => {
    dispatch(
      Analytics.track('Requested Swap Crypto', {
        exchange: 'thorswap',
        amountFrom: amountFrom,
        amountTo: offers.thorswap.amountReceiving || '',
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
      }),
    );

    navigation.navigate(SwapCryptoScreens.THORSWAP_CHECKOUT, {
      fromWalletSelected: selectedWalletFrom!,
      toWalletSelected: selectedWalletTo!,
      amountFrom: amountFrom,
      spenderKey:
        approveThorswapSpenderKey ?? offers.thorswap.selectedSpenderKey,
      slippage: offers.thorswap.slippage,
      thorswapConfig: swapCryptoConfig?.thorswap,
      useSendMax: IsERCToken(
        selectedWalletFrom!.currencyAbbreviation,
        selectedWalletFrom!.chain,
      )
        ? false
        : useSendMax,
      sendMaxInfo: sendMaxInfo,
    });
  };

  const expandCard = (offer: SwapCryptoOffer) => {
    const key = offer.key;
    if (!offer.amountReceiving) {
      return;
    }
    if (offers[key]) {
      offers[key].expanded = offers[key].expanded ? false : true;
    }
    setUpdateView(Math.random());
  };

  const expandProviderSelector = (offer: SwapCryptoOffer) => {
    const key = offer.key;

    if (offers[key]) {
      offers[key].spenderSelectorExpanded = offers[key].spenderSelectorExpanded
        ? false
        : true;
    }
    setUpdateView(Math.random());
  };

  const showError = (title: string, msg: string, goBack?: boolean) => {
    dispatch(
      AppActions.showBottomNotificationModal({
        title: title ?? t('Error'),
        message: msg,
        type: 'error',
        actions: [
          {
            text: t('OK'),
            action: () => {
              if (goBack) {
                navigation.dispatch(StackActions.popToTop());
              }
            },
          },
        ],
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {
          if (goBack) {
            navigation.dispatch(StackActions.popToTop());
          }
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
          showError(title, err, true);
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
    const reqData = {
      address: selectedWalletFrom.tokenAddress, // ERC20 token contract address
      chain: selectedWalletFrom.chain,
      ownerAddress,
      spenderAddress: data.spenderAddress,
    };
    logger.debug(
      'getERC20TokenAllowance with reqData: ' + JSON.stringify(reqData),
    );
    const allowanceData = await dispatch(getERC20TokenAllowance(reqData));
    return allowanceData;
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
      const tokenAllowance: {allowance: string} = await getTokenAllowance({
        spenderAddress: spenderData.address,
      });

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

  const init = () => {
    const showedOffersCount = Object.values(cloneDeep(offers)).filter(
      offer => offer.showOffer,
    ).length;
    if (showedOffersCount === 0) {
      const title = t('No offers');
      const msg = t(
        'There are currently no offers that satisfy your request. Please try again later.',
      );

      logger.error(msg);
      showError(title, msg, true);
    } else {
      if (offers.changelly.showOffer) {
        offers.changelly.swapClicked = false;
        getChangellyQuote();
      }
      if (offers.thorswap.showOffer) {
        offers.thorswap.swapClicked = false;
        getThorswapQuote();
      }
    }
  };

  useEffect(() => {
    return () => {
      logger.debug('Cleanup on unmount...');
      unmountView = true;
    };
  }, []);

  useEffect(() => {
    const initThrottle = throttle(
      () => {
        return init();
      },
      5000,
      {leading: true, trailing: false},
    );
    if (isFocused) {
      initThrottle();
    }
  }, [isFocused]);

  useEffect(() => {
    setOffers(offers);
  }, [finishedChangelly, finishedThorswap, updateView]);

  useEffect(() => {
    if (!offers.thorswap.amountReceiving || offers.thorswap.approveConfirming) {
      return;
    }

    const fromIsErc20Token = IsERCToken(
      selectedWalletFrom.currencyAbbreviation,
      selectedWalletFrom.chain,
    );

    if (fromIsErc20Token) {
      checkTokenAllowance();
    } else {
      setSwitchingThorswapProvider(false);
      offers.thorswap.showApprove = false;
      offers.thorswap.approveConfirming = false;
    }
  }, [offers.thorswap.amountReceiving]);

  return (
    <>
      <SwapCryptoOffersContainer>
        <ScrollView>
          <SummaryRow>
            <SummaryItemContainer>
              <SummaryTitle>{t('From')}</SummaryTitle>
              <CoinContainer>
                <CoinIconContainer>
                  <CurrencyImage
                    img={selectedWalletFrom.img}
                    badgeUri={getBadgeImg(
                      getCurrencyAbbreviation(
                        selectedWalletFrom.currencyAbbreviation,
                        selectedWalletFrom.chain,
                      ),
                      selectedWalletFrom.chain,
                    )}
                    size={20}
                  />
                </CoinIconContainer>
                <SummaryData>{coinFrom.toUpperCase()}</SummaryData>
              </CoinContainer>
            </SummaryItemContainer>
            <SummaryItemContainer>
              <SummaryTitle>{t('Amount')}</SummaryTitle>
              <SummaryData style={{maxWidth: WIDTH / 2.5}}>
                {cloneDeep(amountFrom)
                  .toFixed(6)
                  .replace(/\.?0+$/, '') +
                  ' ' +
                  coinFrom.toUpperCase()}
              </SummaryData>
            </SummaryItemContainer>
            <SummaryItemContainer>
              <SummaryTitle>{t('To')}</SummaryTitle>
              <CoinContainer>
                <CoinIconContainer>
                  <CurrencyImage
                    img={selectedWalletTo.img}
                    badgeUri={getBadgeImg(
                      getCurrencyAbbreviation(
                        selectedWalletTo.currencyAbbreviation,
                        selectedWalletTo.chain,
                      ),
                      selectedWalletTo.chain,
                    )}
                    size={20}
                  />
                </CoinIconContainer>
                <SummaryData>{coinTo.toUpperCase()}</SummaryData>
              </CoinContainer>
            </SummaryItemContainer>
            <SummaryCtaContainer>
              <Button
                buttonStyle={'secondary'}
                buttonType={'pill'}
                buttonOutline={true}
                onPress={() => {
                  navigation.goBack();
                }}>
                Edit
              </Button>
            </SummaryCtaContainer>
          </SummaryRow>

          {Object.values(offers)
            .sort(
              (a, b) =>
                parseFloat(b.amountReceiving || '0') -
                parseFloat(a.amountReceiving || '0'),
            )
            .map((offer: SwapCryptoOffer, index: number) => {
              return offer.showOffer ? (
                <BuyCryptoExpandibleCard
                  key={offer.key}
                  onPress={() => {
                    expandCard(offer);
                  }}>
                  {!offer.amountReceiving &&
                  !offer.errorMsg &&
                  !offer.outOfLimitMsg ? (
                    <SpinnerContainer>
                      <ActivityIndicator color={ProgressBlue} />
                    </SpinnerContainer>
                  ) : null}
                  {!offer.amountReceiving && offer.outOfLimitMsg ? (
                    <OfferDataContainer>
                      <OfferDataInfoLabel>
                        {offer.outOfLimitMsg}
                      </OfferDataInfoLabel>
                    </OfferDataContainer>
                  ) : null}
                  {!offer.amountReceiving && offer.errorMsg ? (
                    <OfferDataContainer>
                      <OfferDataInfoLabel>
                        {t('Error: ') + offer.errorMsg}
                      </OfferDataInfoLabel>
                    </OfferDataContainer>
                  ) : null}
                  <OfferColumn>
                    <OfferRow>
                      <OfferDataContainer>
                        {offer.amountReceiving &&
                        !offer.errorMsg &&
                        !offer.outOfLimitMsg ? (
                          <>
                            {index === 0 ? (
                              <BestOfferTagContainer>
                                <BestOfferTag>
                                  <BestOfferTagText>
                                    {t('Best Offer')}
                                  </BestOfferTagText>
                                </BestOfferTag>
                              </BestOfferTagContainer>
                            ) : null}
                            <OfferDataCryptoAmount>
                              {Number(offer.amountReceiving)
                                .toFixed(8)
                                .replace(/\.?0+$/, '')}{' '}
                              {coinTo.toUpperCase()}
                            </OfferDataCryptoAmount>
                          </>
                        ) : null}
                        <OfferDataInfoContainer>
                          <OfferDataInfoLabel>
                            {t('Powered By')}
                          </OfferDataInfoLabel>
                          {offer.logo}
                        </OfferDataInfoContainer>
                      </OfferDataContainer>
                      {offer.amountReceiving ? (
                        <SummaryCtaContainer>
                          <Button
                            action={true}
                            buttonType={'pill'}
                            disabled={
                              offer.key === 'thorswap' &&
                              switchingThorswapProvider
                            }
                            onPress={() => {
                              if (offer.showApprove) {
                                if (
                                  offer.expanded &&
                                  !offer.approveConfirming
                                ) {
                                  haptic('impactLight');
                                  goToApproveErc20(offer);
                                } else {
                                  expandCard(offer);
                                }
                              } else {
                                offer.swapClicked = true;
                                goTo(offer.key);
                              }
                            }}
                            onPressDisabled={() => {
                              expandCard(offer);
                            }}>
                            {offer.swapClicked || offer.approveConfirming ? (
                              <ActivityIndicator
                                style={{marginBottom: -5}}
                                color={White}
                              />
                            ) : offer.showApprove &&
                              !offer.approveConfirming ? (
                              t('Approve')
                            ) : (
                              t('Swap')
                            )}
                          </Button>
                        </SummaryCtaContainer>
                      ) : null}
                    </OfferRow>
                    {offer.hasExtraOpts ? (
                      <OfferExtraOptsContainer expanded={offer.expanded}>
                        <OfferExpandibleItem>
                          <OfferDataInfoLabel>
                            {t('Swap Options')}
                          </OfferDataInfoLabel>
                          <SelectorArrowContainer>
                            {offer.expanded ? (
                              <ArrowUpSvg {...{width: 13, height: 13}} />
                            ) : (
                              <ArrowDownSvg {...{width: 13, height: 13}} />
                            )}
                          </SelectorArrowContainer>
                        </OfferExpandibleItem>
                      </OfferExtraOptsContainer>
                    ) : null}
                  </OfferColumn>

                  {offer.expanded ? (
                    <>
                      {offer.hasExtraOpts ? (
                        <View style={{marginTop: 20}} />
                      ) : (
                        <ItemDivisor style={{marginTop: 20}} />
                      )}

                      {offer.hasExtraOpts && !offer.approveConfirming ? (
                        <>
                          <OfferExtraOptsProvidersContainer
                            onPress={() => {
                              if (
                                (offer.quoteData as ThorswapQuoteRoute[]) &&
                                Array.isArray(offer.quoteData) &&
                                offer.quoteData.length > 1
                              ) {
                                expandProviderSelector(offer);
                              }
                            }}>
                            <OfferExpandibleItem>
                              <OfferDataInfoTitle>
                                {t('Provider')}
                              </OfferDataInfoTitle>
                              <OfferRow>
                                {offer.selectedProvidersPath ? (
                                  <OfferDataInfoText
                                    style={{maxWidth: 220}}
                                    numberOfLines={1}
                                    ellipsizeMode="tail">
                                    {offer.selectedProvidersPath}
                                  </OfferDataInfoText>
                                ) : null}
                                {(offer.quoteData as ThorswapQuoteRoute[]) &&
                                Array.isArray(offer.quoteData) &&
                                offer.quoteData.length > 1 ? (
                                  <SelectorArrowContainer>
                                    {offer.spenderSelectorExpanded ? (
                                      <ArrowUpSvg
                                        {...{width: 13, height: 13}}
                                      />
                                    ) : (
                                      <ArrowDownSvg
                                        {...{width: 13, height: 13}}
                                      />
                                    )}
                                  </SelectorArrowContainer>
                                ) : null}
                              </OfferRow>
                            </OfferExpandibleItem>

                            {offer.spenderSelectorExpanded ? (
                              <>
                                {offer.key === 'thorswap'
                                  ? Object.values(
                                      offer.quoteData as ThorswapQuoteRoute[],
                                    ).map(
                                      (
                                        route: ThorswapQuoteRoute,
                                        index: number,
                                      ) => {
                                        return (
                                          <TouchableOpacity
                                            key={getProvidersPathFromRoute(
                                              route,
                                            )}
                                            style={{marginBottom: 10}}
                                            onPress={() => {
                                              setSelectedThorswapRoute(route);
                                            }}>
                                            <OfferRow>
                                              <OfferColumn
                                                style={{
                                                  alignItems: 'flex-start',
                                                }}>
                                                <>
                                                  <OfferDataInfoText
                                                    style={{maxWidth: 270}}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail">
                                                    {getProvidersPathFromRoute(
                                                      route,
                                                    )}
                                                  </OfferDataInfoText>
                                                  {route.expectedOutput ? (
                                                    <OfferDataEstimatedValues>
                                                      {Number(
                                                        route.expectedOutput,
                                                      )
                                                        .toFixed(8)
                                                        .replace(
                                                          /\.?0+$/,
                                                          '',
                                                        )}{' '}
                                                      {coinTo.toUpperCase()}
                                                    </OfferDataEstimatedValues>
                                                  ) : null}
                                                  {route.timeEstimates ? (
                                                    <OfferDataEstimatedValues>
                                                      {getEstimatedTimeStrFromRoute(
                                                        route.timeEstimates,
                                                      )}
                                                    </OfferDataEstimatedValues>
                                                  ) : null}
                                                </>
                                              </OfferColumn>
                                              <OfferColumn
                                                style={{
                                                  alignItems: 'flex-end',
                                                }}>
                                                <Checkbox
                                                  radio={true}
                                                  onPress={() =>
                                                    setSelectedThorswapRoute(
                                                      route,
                                                    )
                                                  }
                                                  checked={
                                                    !!offer.selectedProvidersPath &&
                                                    offer.selectedProvidersPath ===
                                                      getProvidersPathFromRoute(
                                                        route,
                                                      )
                                                  }
                                                />
                                              </OfferColumn>
                                            </OfferRow>
                                          </TouchableOpacity>
                                        );
                                      },
                                    )
                                  : null}
                              </>
                            ) : null}
                          </OfferExtraOptsProvidersContainer>
                        </>
                      ) : null}

                      {offer.showApprove ? (
                        offer.approveConfirming ? (
                          <ExchangeTermsContainer style={{marginTop: 16}}>
                            <TermsText>
                              {
                                'Your Approve transaction is pending confirmation. This may take a few mimnutes, please wait...'
                              }
                            </TermsText>
                            <SpinnerContainer>
                              <ActivityIndicator color={ProgressBlue} />
                            </SpinnerContainer>
                          </ExchangeTermsContainer>
                        ) : (
                          <>
                            <ExchangeTermsContainer style={{marginTop: 16}}>
                              <ExchangeTermsText>
                                {`To complete the swap, you will need to allow the exchange (${
                                  offer.selectedSpenderKey &&
                                  ThorswapProviderNames[
                                    offer.selectedSpenderKey
                                  ]
                                    ? ThorswapProviderNames[
                                        offer.selectedSpenderKey
                                      ]
                                    : offer.selectedSpenderKey
                                }) to spend your ${selectedWalletFrom.currencyAbbreviation.toUpperCase()}.` +
                                  '\n' +
                                  `By granting this permission, ${
                                    offer.selectedSpenderKey &&
                                    ThorswapProviderNames[
                                      offer.selectedSpenderKey
                                    ]
                                      ? ThorswapProviderNames[
                                          offer.selectedSpenderKey
                                        ]
                                      : offer.selectedSpenderKey
                                  } will be able to withdraw your ${selectedWalletFrom.currencyAbbreviation.toUpperCase()} and complete transactions for you.`}
                              </ExchangeTermsText>
                            </ExchangeTermsContainer>
                            <Button
                              action={true}
                              buttonType={'pill'}
                              disabled={
                                offer.key === 'thorswap' &&
                                switchingThorswapProvider
                              }
                              onPress={() => {
                                haptic('impactLight');
                                goToApproveErc20(offer);
                              }}>
                              {`Approve ${selectedWalletFrom.currencyAbbreviation.toUpperCase()}`}
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          {offer.hasExtraOpts && offer.slippageOpts ? (
                            <OfferDataSlidesOpts>
                              <OfferRow>
                                <OfferDataInfoContainer>
                                  <OfferDataInfoTitle>
                                    {t('Slippage Options')}
                                  </OfferDataInfoTitle>
                                  <TouchableOpacity
                                    onPress={() => {
                                      showSlippageInfoSheet();
                                    }}
                                    style={{marginLeft: 5}}>
                                    <InfoIcon bgColor={Slate} size={20} />
                                  </TouchableOpacity>
                                </OfferDataInfoContainer>
                                {offer.slippage ? (
                                  <OfferDataInfoText style={{marginTop: 10}}>
                                    {offer.slippage.toFixed(1) + '%'}
                                  </OfferDataInfoText>
                                ) : null}
                              </OfferRow>

                              <OfferExpandibleItem>
                                <Slider
                                  style={{
                                    alignSelf: 'center',
                                    width: WIDTH - 64,
                                  }}
                                  thumbImage={ThumbImage}
                                  minimumValue={offer.slippageOpts.min}
                                  lowerLimit={offer.slippageOpts.minLimit}
                                  maximumValue={offer.slippageOpts.max}
                                  step={offer.slippageOpts.steps}
                                  value={offer.slippage}
                                  minimumTrackTintColor={'#6B71D6'}
                                  onValueChange={(value: number) =>
                                    onSlippageChange(offer.key, value)
                                  }
                                  inverted={true}
                                  // iOS
                                  tapToSeek={true}
                                />
                              </OfferExpandibleItem>
                            </OfferDataSlidesOpts>
                          ) : null}

                          <OfferDataInfoContainer style={{marginTop: 16}}>
                            <OfferDataInfoTitle>
                              {t('Swap Rate Details')}
                            </OfferDataInfoTitle>
                          </OfferDataInfoContainer>

                          {offer.hasExtraOpts &&
                          (offer.estimatedMinAmountReceiving ||
                            offer.estimatedTime) ? (
                            <OfferRow style={{marginTop: 16}}>
                              {offer.estimatedMinAmountReceiving ? (
                                <OfferDataLeftContainer>
                                  <OfferDataInfoLabel>
                                    {t('Minimum')}
                                  </OfferDataInfoLabel>
                                  <OfferDataEstimatedValues>
                                    {offer.estimatedMinAmountReceiving +
                                      ' ' +
                                      selectedWalletTo.currencyAbbreviation.toUpperCase()}
                                  </OfferDataEstimatedValues>
                                </OfferDataLeftContainer>
                              ) : null}
                              {offer.amountReceiving ? (
                                <OfferDataLeftContainer>
                                  <OfferDataInfoLabel>
                                    {t('Estimated')}
                                  </OfferDataInfoLabel>
                                  <OfferDataEstimatedValues>
                                    {Number(offer.amountReceiving)
                                      .toFixed(4)
                                      .replace(/\.?0+$/, '') +
                                      ' ' +
                                      selectedWalletTo.currencyAbbreviation.toUpperCase()}
                                  </OfferDataEstimatedValues>
                                </OfferDataLeftContainer>
                              ) : null}
                              {offer.estimatedTime ? (
                                <OfferDataLeftContainer>
                                  <OfferDataInfoLabel>
                                    {t('Time')}
                                  </OfferDataInfoLabel>
                                  <OfferDataEstimatedValues>
                                    {offer.estimatedTime}
                                  </OfferDataEstimatedValues>
                                </OfferDataLeftContainer>
                              ) : null}
                            </OfferRow>
                          ) : null}

                          <OfferExpandibleItem>
                            <OfferDataInfoLabel>
                              {t('Estimated\nExchange Rate')}
                            </OfferDataInfoLabel>
                            <OfferDataRightContainer>
                              <OfferDataInfoText>
                                {'1 ' +
                                  selectedWalletFrom.currencyAbbreviation.toUpperCase() +
                                  ' ~ ' +
                                  offer.rate +
                                  ' ' +
                                  selectedWalletTo.currencyAbbreviation.toUpperCase()}
                              </OfferDataInfoText>
                              {offer.rateFiat ? (
                                <OfferDataInfoTextSub>
                                  {'~ ' + offer.rateFiat}
                                </OfferDataInfoTextSub>
                              ) : null}
                            </OfferDataRightContainer>
                          </OfferExpandibleItem>
                        </>
                      )}
                    </>
                  ) : null}
                </BuyCryptoExpandibleCard>
              ) : null;
            })}

          <TermsContainer>
            <TermsText>
              {t(
                'The final crypto amount you receive when the transaction is complete may differ because it is based on the exchange rates of the providers.',
              )}
            </TermsText>
          </TermsContainer>
        </ScrollView>
      </SwapCryptoOffersContainer>
    </>
  );
};

export default SwapCryptoOffers;
