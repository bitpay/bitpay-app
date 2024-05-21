import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import uuid from 'react-native-uuid';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import styled from 'styled-components/native';
import {
  RouteProp,
  useRoute,
  useNavigation,
  StackActions,
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
  isPairSupported,
  SwapCryptoExchangeKey,
  SwapCryptoSupportedExchanges,
} from '../utils/swap-crypto-utils';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  BitPay,
  LuckySevens,
  LightBlack,
  NeutralSlate,
  Slate30,
  Slate,
} from '../../../../styles/colors';
import {RootState} from '../../../../store';
import {
  GetPrecision,
  IsERCToken,
} from '../../../../store/wallet/utils/currency';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
// import {
//   ChangellyCreateOrderData,
//   ChangellyCreateOrderRequestData,
//   ChangellyGetQuoteRequestData,
//   ChangellyOrderData,
//   ChangellyPaymentData,
//   ChangellyQuoteData,
//   BuyCryptoLimits,
//   ThorswapGetCurrencyLimitsRequestData,
//   ThorswapPaymentData,
// } from '../../../../store/buy-crypto/buy-crypto.models';
import {
  calculateAltFiatToUsd,
  getBuyCryptoFiatLimits,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {SendMaxInfo, Wallet} from '../../../../store/wallet/wallet.models';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME_UPPERCASE,
} from '../../../../constants/config';
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
  getThorswapFixedCoin,
  getThorswapSpenderDataFromRoute,
  thorswapEnv,
} from '../utils/thorswap-utils';
import {
  BuyCryptoConfig,
  SwapCryptoConfig,
} from '../../../../store/external-services/external-services.types';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {AppActions} from '../../../../store/app';
// import {thorswapGetCurrencyLimits} from '../../../../store/buy-crypto/effects/thorswap/thorswap';
import {
  BuyCryptoExpandibleCard,
  ItemDivisor,
} from '../../buy-crypto/styled/BuyCryptoCard';
import {
  TermsContainer,
  TermsText,
} from '../../buy-crypto/styled/BuyCryptoTerms';
import {SatToUnit} from '../../../../store/wallet/effects/amount/amount';
import {
  ChangellyGetRateData,
  ChangellyGetRateRequestData,
  ChangellyRateData,
  ChangellyRateResult,
} from '../../../../store/swap-crypto/models/changelly.models';
import {SwapCryptoLimits} from '../../../../store/swap-crypto/swap-crypto.models';
import {thorswapGetSwapQuote} from '../../../../store/swap-crypto/effects/thorswap/thorswap';
import {
  ThorswapGetSwapQuoteData,
  ThorswapGetSwapQuoteRequestData,
  ThorswapProvider,
  ThorswapProviderEnum,
  thorswapQuoteRoute,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {getERC20TokenAllowance} from '../../../../store/moralis/moralis.effects';
import ApproveErc20Modal from '../../components/ApproveErc20Modal';
import {toFiat} from '../../../../store/wallet/utils/wallet';
import {WIDTH} from '../../../../components/styled/Containers';
import {SelectorArrowContainer} from '../styled/SwapCryptoRoot.styled';
import ArrowDownSvg from '../../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../../assets/img/chevron-up.svg';
import InfoSvg from '../../../../../assets/img/info.svg';
import InfoIcon from '../../../../components/icons/info/Info';
import {PreLoadPartnersData, SwapCryptoCoin} from './SwapCryptoRoot';

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
  fiatAmount: number;
  amountReceiving?: string;

  showApprove?: boolean;
  approveConfirming?: boolean;
  amountLimits?: SwapCryptoLimits;
  quoteData?: any; // Changelly | Thorswap

  hasExtraOpts?: boolean;
  slippage?: number;
  estimatedTime?: string;
  estimatedMinAmountReceiving?: string;

  errorMsg?: string;
  outOfLimitMsg?: string;

  amountCost?: number;
  buyAmount?: number;
  fee?: number;
  fiatMoney?: string; // Rate without fees
  amountReceivingUnit?: string; // Ramp
};

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
  /* align-items: center; */
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

const OfferDataWarningContainer = styled.View`
  max-width: 85%;
  margin-top: 20px;
`;

const OfferDataWarningMsg = styled(BaseText)`
  color: #df5264;
  margin-right: 10px;
  font-size: 12px;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSub = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const OfferDataInfoTotal = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: bold;
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
    // fiatCurrency: 'USD',
    rate: undefined,
    rateFiat: undefined,
    fiatAmount: 0,
    fiatMoney: undefined,
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
    showApprove: true,
    approveConfirming: false,
    // fiatCurrency: 'USD',
    rate: undefined,
    rateFiat: undefined,
    fiatAmount: 0,
    fiatMoney: undefined,
    hasExtraOpts: true,
    slippage: 3,
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
  const dispatch = useAppDispatch();
  const {rates} = useAppSelector(({RATE}) => RATE);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  SwapCryptoSupportedExchanges.forEach((exchange: SwapCryptoExchangeKey) => {
    if (offersDefault[exchange]) {
      let supportedCoins: SwapCryptoCoin[] | undefined;
      if (preLoadPartnersData && preLoadPartnersData[exchange]) {
        supportedCoins = preLoadPartnersData[exchange].supportedCoins;
      }

      if (
        preSetPartner &&
        SwapCryptoSupportedExchanges.includes(preSetPartner)
      ) {
        offersDefault[exchange].showOffer = // TODO: this showOffer should be setted based on supported pairs
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
  });

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [finishedChangelly, setFinishedChangelly] = useState(false);
  const [finishedThorswap, setFinishedThorswap] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);
  const [approveErc20ModalData, setApproveErc20ModalData] = useState<{
    visible: boolean;
    approveErc20ModalOpts: {
      offerKey?: SwapCryptoExchangeKey;
      offerName?: string;
      spenderKey?: ThorswapProvider;
      spenderName?: string;
      spenderAddress?: string;
    };
  }>({visible: false, approveErc20ModalOpts: {}});

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
        offers.changelly.fiatAmount < offers.changelly.amountLimits.min) ||
      (offers.changelly.amountLimits?.max &&
        offers.changelly.fiatAmount > offers.changelly.amountLimits.max)
    ) {
      offers.changelly.outOfLimitMsg = t(
        'There are no changelly offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.changelly.amountLimits.min,
          max: offers.changelly.amountLimits.max,
          fiatCurrency: coinFrom.toUpperCase(),
        },
      );
      setFinishedChangelly(!finishedChangelly);
      return;
    }

    if (selectedWalletFrom.balance?.satSpendable) {
      // TODO: move this if to SwapCryptoRoot ??
      const spendableAmount = dispatch(
        SatToUnit(
          selectedWalletFrom.balance.satSpendable,
          selectedWalletFrom.currencyAbbreviation,
          selectedWalletFrom.chain,
          selectedWalletFrom.tokenAddress,
        ),
      );

      if (!!spendableAmount && spendableAmount < amountFrom) {
        const msg = t(
          'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.',
        );
        offers.changelly.outOfLimitMsg = msg;
        return;
      }
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
      console.log('=========== changellyQuoteData: ', changellyQuoteData);
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

      // const newRateData: ChangellyRateData = {
      //   fixedRateId: changellyQuoteData.result[0].id,
      //   amountTo: Number(changellyQuoteData.result[0].amountTo),
      //   rate: Number(changellyQuoteData.result[0].result), // result == rate
      // };

      offers.changelly.quoteData = changellyQuoteData.result[0];
      offers.changelly.amountReceiving = changellyQuoteData.result[0].amountTo;
      offers.changelly.rate = Number(changellyQuoteData.result[0].result)
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

    // const requestData: ChangellyGetQuoteRequestData = {
    //   env: changellyEnv,
    //   source: offers.changelly.fiatCurrency,
    //   target: getChangellyCoinFormat(coin),
    //   source_amount: offers.changelly.fiatAmount,
    //   account_reference: user?.eid ?? selectedWallet.id,
    //   blockchain: getChangellyChainFormat(selectedWallet.chain),
    // };

    // selectedWallet
    //   .changellyGetQuote(requestData)
    //   .then((quoteData: ChangellyQuoteData) => {
    //     if (quoteData?.data?.prices?.[0]?.coin_amount) {
    //       const data = quoteData.data.prices[0];

    //       offers.changelly.outOfLimitMsg = undefined;
    //       offers.changelly.errorMsg = undefined;
    //       offers.changelly.quoteData = data;
    //       offers.changelly.amountCost = Number(data.fiat_amount);
    //       offers.changelly.fee =
    //         Number(data.fee_amount) + Number(data.network_fee);
    //       offers.changelly.buyAmount = offers.changelly.amountCost - offers.changelly.fee;

    //       const precision = dispatch(
    //         GetPrecision(coin, chain, selectedWallet.tokenAddress),
    //       );
    //       if (offers.changelly.buyAmount && coin && precision) {
    //         offers.changelly.fiatMoney = Number(
    //           offers.changelly.buyAmount / Number(data.coin_amount),
    //         ).toFixed(precision!.unitDecimals);
    //       } else {
    //         logger.error(`Changelly error: Could not get precision for ${coin}`);
    //       }
    //       offers.changelly.amountReceiving = Number(data.coin_amount).toString();
    //       logger.debug('Changelly getting quote: SUCCESS');
    //       setFinishedChangelly(!finishedChangelly);
    //     } else {
    //       if (quoteData.message && typeof quoteData.message === 'string') {
    //         logger.error('Changelly error: ' + quoteData.message);
    //       }
    //       if (quoteData.error && typeof quoteData.error === 'string') {
    //         logger.error('Changelly error: ' + quoteData.error);
    //       }
    //       if (quoteData.errors) {
    //         logger.error(JSON.stringify(quoteData.errors));
    //       }
    //       let err = t(
    //         "Can't get rates at this moment. Please try again later",
    //       );
    //       const reason = 'changellyGetQuote Error. "coin_amount" not included.';
    //       showChangellyError(err, reason);
    //     }
    //   })
    //   .catch((err: any) => {
    //     const reason = 'changellyGetQuote Error';
    //     showChangellyError(err, reason);
    //   });
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
        // amountTo: offers.changelly.amountTo, // TODO: finish this Analytics
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
        // fiatCurrency: offers.changelly.fiatCurrency || '',
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

    // const currencyLimitsrequestData: ThorswapGetCurrencyLimitsRequestData = {
    //   currencyAbbreviation: getThorswapFixedCurrencyAbbreviation(
    //     coin.toLowerCase(),
    //     selectedWallet.chain,
    //   ),
    //   baseCurrencyCode: offers.thorswap.fiatCurrency.toLowerCase(),
    //   areFeesIncluded: true,
    //   env: thorswapEnv,
    // };

    // try {
    // const thorswapCurrencyLimitsData = await thorswapGetCurrencyLimits(
    //   currencyLimitsrequestData,
    // );
    // offers.thorswap.amountLimits = {
    //   min: thorswapCurrencyLimitsData.baseCurrency.minBuyAmount,
    //   max: thorswapCurrencyLimitsData.baseCurrency.maxBuyAmount,
    // };

    if (
      (offers.thorswap.amountLimits?.min &&
        offers.thorswap.fiatAmount < offers.thorswap.amountLimits?.min) ||
      (offers.thorswap.amountLimits?.max &&
        offers.thorswap.fiatAmount > offers.thorswap.amountLimits?.max)
    ) {
      offers.thorswap.outOfLimitMsg = t(
        'There are no Thorswap offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.thorswap.amountLimits.min,
          max: offers.thorswap.amountLimits.max,
          fiatCurrency: coinFrom.toUpperCase(),
        },
      );
      setFinishedThorswap(!finishedThorswap);
      return;
    }
    // } catch (err) {
    //   logger.warn(
    //     `It was not possible to get currency limits for Thorswap with the following values: ${JSON.stringify(
    //       currencyLimitsrequestData,
    //     )}`,
    //   );
    // }

    // let senderAddress: string = '';
    // let recipientAddress: string = '';
    // try {
    //   senderAddress = (await dispatch<any>(
    //     createWalletAddress({wallet: selectedWalletFrom, newAddress: false}),
    //   )) as string;
    // } catch (err) {
    //   console.error(err);
    //   const reason = 'createWalletAddress(senderAddress) Error';
    //   showChangellyError(err, reason);
    // }
    // try {
    //   recipientAddress = (await dispatch<any>(
    //     createWalletAddress({wallet: selectedWalletTo, newAddress: false}),
    //   )) as string;
    // } catch (err) {
    //   console.error(err);
    //   const reason = 'createWalletAddress(recipientAddress) Error';
    //   showChangellyError(err, reason);
    // }

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
      // providers: [ThorswapProviderEnum.UNISWAPV2], // TODO: review this
      // senderAddress, // TODO: make a getQuote in thorswapCheckout and add senderAddress there ???
      // recipientAddress, // TODO: make a getQuote in thorswapCheckout and add recipientAddress there ???
    };

    try {
      console.log('============ thorswapQuoteData enviada: ', requestData);
      const thorswapQuoteData: ThorswapGetSwapQuoteData =
        await thorswapGetSwapQuote(requestData);
      console.log(
        '============ thorswapQuoteData recibida: ',
        thorswapQuoteData,
      );
      if (thorswapQuoteData?.routes[0]) {
        // ?.baseCurrencyAmount
        // offers.thorswap.amountLimits = {
        //   min: thorswapQuoteData.baseCurrency.minBuyAmount,
        //   max: thorswapQuoteData.baseCurrency.maxBuyAmount,
        // };

        // if (
        //   (offers.thorswap.amountLimits.min &&
        //     offers.thorswap.fiatAmount < offers.thorswap.amountLimits.min) ||
        //   (offers.thorswap.amountLimits.max &&
        //     offers.thorswap.fiatAmount > offers.thorswap.amountLimits.max)
        // ) {
        //   offers.thorswap.outOfLimitMsg = t(
        //     'There are no Thorswap offers available, as the current purchase limits for this exchange must be between and',
        //     {
        //       min: offers.thorswap.amountLimits.min,
        //       max: offers.thorswap.amountLimits.max,
        //       fiatCurrency: coinFrom.toUpperCase(),
        //     },
        //   );
        //   setFinishedThorswap(!finishedThorswap);
        //   return;
        // } else {
        offers.thorswap.outOfLimitMsg = undefined;
        offers.thorswap.errorMsg = undefined;
        offers.thorswap.quoteData = thorswapQuoteData.routes; // TODO: .map with useful data

        offers.thorswap.amountReceiving =
          thorswapQuoteData.routes[0].expectedOutput;

        if (
          thorswapQuoteData.routes[0].fees[
            cloneDeep(chainFrom).toUpperCase()
          ] &&
          thorswapQuoteData.routes[0].fees[
            cloneDeep(chainFrom).toUpperCase()
          ][0]
        ) {
          offers.thorswap.fee = Number(
            thorswapQuoteData.routes[0].fees[
              cloneDeep(chainFrom).toUpperCase()
            ][0].totalFee,
          );
        }

        if (thorswapQuoteData.routes[0].timeEstimates) {
          let totalTime: number = 0;
          if (thorswapQuoteData.routes[0].timeEstimates.inboundMs) {
            totalTime += thorswapQuoteData.routes[0].timeEstimates.inboundMs;
          }
          if (thorswapQuoteData.routes[0].timeEstimates.outboundMs) {
            totalTime += thorswapQuoteData.routes[0].timeEstimates.outboundMs;
          }
          if (thorswapQuoteData.routes[0].timeEstimates.streamingMs) {
            totalTime += thorswapQuoteData.routes[0].timeEstimates.streamingMs;
          }
          if (thorswapQuoteData.routes[0].timeEstimates.swapMs) {
            totalTime += thorswapQuoteData.routes[0].timeEstimates.swapMs;
          }

          const date = new Date(totalTime);
          const hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          const seconds = date.getUTCSeconds();

          offers.thorswap.estimatedTime = `${hours}h ${minutes}m ${seconds}s`;
        }

        if (
          thorswapQuoteData.routes[0].expectedOutputMaxSlippage &&
          thorswapQuoteData.routes[0].expectedOutputMaxSlippage !== ''
        ) {
          offers.thorswap.estimatedMinAmountReceiving = Number(
            thorswapQuoteData.routes[0].expectedOutputMaxSlippage,
          )
            .toFixed(4)
            .replace(/\.?0+$/, '');
        }

        if (thorswapQuoteData.routes[0].expectedOutput && amountFrom) {
          const newRate =
            Number(thorswapQuoteData.routes[0].expectedOutput) / amountFrom;
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
        // if (thorswapQuoteData.message && typeof thorswapQuoteData.message === 'string') {
        //   logger.error('Thorswap error: ' + thorswapQuoteData.message);
        // }
        // if (thorswapQuoteData.error && typeof thorswapQuoteData.error === 'string') {
        //   logger.error('Thorswap error: ' + thorswapQuoteData.error);
        // }
        // if (thorswapQuoteData.errors) {
        //   logger.error(thorswapQuoteData.errors);
        // }
        let err = t("Can't get rates at this moment. Please try again later");
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
        // amountTo: offers.changelly.amountTo, // TODO: finish this Analytics
        coinFrom: coinFrom?.toLowerCase() || '',
        chainFrom: chainFrom?.toLowerCase() || '',
        coinTo: coinTo?.toLowerCase() || '',
        chainTo: chainTo?.toLowerCase() || '',
        // fiatCurrency: offers.changelly.fiatCurrency || '',
      }),
    );

    offers.thorswap.errorMsg = msg;
    offers.thorswap.amountReceiving = undefined;
    offers.thorswap.expanded = false;
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
    // TODO: review analytics
    // dispatch(
    //   Analytics.track('Requested Swap Crypto', {
    //     exchange: 'changelly',
    //     fiatAmount: offers.changelly.fiatAmount,
    //     coin: selectedWalletFrom.currencyAbbreviation.toLowerCase(),
    //     chain:  selectedWalletFrom.chain?.toLowerCase(),
    //   }),
    // );

    const fixedRateId = (offers.changelly.quoteData as ChangellyRateResult)?.id;

    navigation.navigate('ChangellyCheckout', {
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
    // TODO: review analytics
    // dispatch(
    //   Analytics.track('Requested Swap Crypto', {
    //     exchange: 'thorswap',
    //     fiatAmount: offers.thorswap.fiatAmount,
    //     coin: selectedWalletFrom.currencyAbbreviation.toLowerCase(),
    //     chain:  selectedWalletFrom.chain?.toLowerCase(),
    //   }),
    // );

    navigation.navigate('ThorswapCheckout', {
      fromWalletSelected: selectedWalletFrom!,
      toWalletSelected: selectedWalletTo!,
      amountFrom: amountFrom,
      spenderKey:
        approveErc20ModalData?.approveErc20ModalOpts?.spenderKey ??
        (offers.thorswap.quoteData as thorswapQuoteRoute[])[0].providers[0],
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

  const showApproveErc20Modal = (offer: SwapCryptoOffer) => {
    const spenderData = getThorswapSpenderDataFromRoute(offer.quoteData[0]);
    if (!spenderData?.address) {
      let err = t("Can't get rates at this moment. Please try again later");
      const reason =
        'checkTokenAllowance Error. spenderData.address not included.';
      showThorswapError(err, reason);
      return;
    }

    setApproveErc20ModalData({
      visible: true,
      approveErc20ModalOpts: {
        offerKey: offer.key,
        offerName: offer.name,
        spenderKey: spenderData.key,
        spenderName: spenderData.key,
        spenderAddress: spenderData.address,
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
      spenderAddress: data.spenderAddress, // 1inch v3: '0x11111112542d85b3ef69ae05771c2dccff4faa26'
    };
    console.log(
      '======= Making getERC20TokenAllowance request with reqData: ' +
        JSON.stringify(reqData),
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
      const spenderData = getThorswapSpenderDataFromRoute(
        offers.thorswap.quoteData[0],
      );
      if (!spenderData?.address) {
        let err = t("Can't get rates at this moment. Please try again later");
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
      console.log('===============getTokenAllowance SUCCESS: ', tokenAllowance); // TODO: handle this

      logger.debug(
        `Amount to deposit: ${depositSat} | Allowance amount for contract(${spenderData.address}) : ${allowance}`,
      );
      if (allowance < depositSat) {
        if (waitingApproveTxConfirm) {
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
      console.log('===============getTokenAllowance ERR: ', err); // TODO: handle this
    }
  };

  const onSlippageChange = (
    exchangeKey: SwapCryptoExchangeKey,
    value: number,
  ) => {
    offers[exchangeKey].slippage = value;

    const newMin =
      Number(offers[exchangeKey].amountReceiving) / (1 + value * 0.01);

    offers[exchangeKey].estimatedMinAmountReceiving = newMin
      .toFixed(4)
      .replace(/\.?0+$/, '');
    console.log(
      `==== onSlippageChange(${exchangeKey}) value: ${value} | newMin: ${newMin}`,
    );
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

  useEffect(() => {
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
        getChangellyQuote();
      }
      if (offers.thorswap.showOffer) {
        getThorswapQuote();
      }
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedChangelly, finishedThorswap, updateView]);

  useEffect(() => {
    if (!offers.thorswap.amountReceiving) {
      return;
    }
    console.log(
      '$$$$$$$$$$$$$$$$$$$ useEffect offers.thorswap.amountReceiving UPDATED: ',
      offers.thorswap,
    );

    const fromIsErc20Token = IsERCToken(
      selectedWalletFrom.currencyAbbreviation,
      selectedWalletFrom.chain,
    );

    if (fromIsErc20Token) {
      checkTokenAllowance();
      console.log(
        '================================================== checkTokenAllowance finished',
      );
    } else {
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
              <SummaryData>
                {/* TODO: think how to show amountFrom for big numbers like SHIB */}
                {amountFrom + ' ' + coinFrom.toUpperCase()}
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
                            {t('Provided By')}
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
                              openingBrowser ||
                              offer.showApprove ||
                              offer.approveConfirming
                            }
                            onPress={() => {
                              offer.swapClicked = true;
                              setOpeningBrowser(true);
                              goTo(offer.key);
                            }}
                            onPressDisabled={() => {
                              expandCard(offer);
                            }}>
                            {offer.swapClicked ? (
                              <ActivityIndicator
                                style={{marginBottom: -5}}
                                color={White}
                              />
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

                      {offer.showApprove ? (
                        offer.approveConfirming ? (
                          <>
                            <TermsText>
                              {
                                'Waiting for confirmation of Approve transaction'
                              }
                            </TermsText>
                            <SpinnerContainer>
                              <ActivityIndicator color={ProgressBlue} />
                            </SpinnerContainer>
                          </>
                        ) : (
                          <>
                            <TermsText>
                              {`To complete the swap, you will need to allow the exchange (${
                                offer.key
                              }) to spend your ${selectedWalletFrom.currencyAbbreviation.toUpperCase()}.` +
                                '\n' +
                                `By granting this permission, ${
                                  offer.key
                                } will be able to withdraw your ${selectedWalletFrom.currencyAbbreviation.toUpperCase()} and complete transactions for you.`}
                            </TermsText>
                            <Button
                              action={true}
                              buttonType={'pill'}
                              disabled={openingBrowser}
                              onPress={() => {
                                haptic('impactLight');
                                showApproveErc20Modal(offer);
                              }}>
                              {
                                // offer.swapClicked ? (
                                //   <ActivityIndicator
                                //     style={{marginBottom: -5}}
                                //     color={White}
                                //   />
                                // ) :
                                `Approve ${selectedWalletFrom.currencyAbbreviation.toUpperCase()}`
                              }
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          {/* <OfferExpandibleItem>
                        <OfferDataInfoLabel>{t('Buy Amount')}</OfferDataInfoLabel>
                        <OfferDataRightContainer>
                          <OfferDataInfoText>
                            {formatFiatAmount(
                              Number(offer.buyAmount),
                              offer.fiatCurrency,
                            )}
                          </OfferDataInfoText>
                          <OfferDataInfoTextSec>
                            {Number(offer.amountReceiving).toFixed(6)}{' '}
                            {coinTo.toUpperCase()}
                          </OfferDataInfoTextSec>
                        </OfferDataRightContainer>
                      </OfferExpandibleItem>
                      <ItemDivisor /> */}

                          {offer.hasExtraOpts ? (
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
                                {/* TODO: set initial slippage value based on the quote suggestions */}
                                <Slider
                                  style={{
                                    alignSelf: 'center',
                                    width: WIDTH - 64,
                                  }}
                                  minimumValue={0}
                                  lowerLimit={0.5}
                                  maximumValue={10}
                                  step={0.5}
                                  value={3}
                                  minimumTrackTintColor={'#6B71D6'}
                                  // maximumTrackTintColor={'#6B71D6'}
                                  // ;
                                  onValueChange={value =>
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
                          {/* <ItemDivisor />
                      <OfferExpandibleItem>
                        <OfferDataInfoTotal>{t('TOTAL')}</OfferDataInfoTotal>
                        <OfferDataInfoTotal>
                          {formatFiatAmount(
                            Number(offer.amountCost),
                            offer.fiatCurrency,
                            {customPrecision: 'minimal'},
                          )}
                        </OfferDataInfoTotal>
                      </OfferExpandibleItem> */}
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
            {/* <TermsText>{t('Additional third-party fees may apply.')}</TermsText> */}
          </TermsContainer>
        </ScrollView>
      </SwapCryptoOffersContainer>

      {/* isVisible: boolean;
  modalTitle?: string;
  onDismiss: () => void;
  modalContext?: string;
  wallet: Wallet;
  spenderData: {
    name: string;
    address: string;
  }
  onHelpPress?: () => void; */}
      <ApproveErc20Modal
        isVisible={approveErc20ModalData.visible}
        modalContext={'swapCrypto'}
        modalTitle={t('Swap To')}
        onDismiss={approveTxSent => {
          setApproveErc20ModalData({
            visible: false,
            approveErc20ModalOpts: approveErc20ModalData.approveErc20ModalOpts,
          });
          if (
            approveTxSent?.txid &&
            approveErc20ModalData?.approveErc20ModalOpts?.offerKey
          ) {
            // show waiting confirmation message
            offers[
              approveErc20ModalData.approveErc20ModalOpts.offerKey
            ].approveConfirming = true;
            offers[
              approveErc20ModalData.approveErc20ModalOpts.offerKey
            ].expanded = true;
            // Handle this: hide approveButon ? ask for allowances in loop ?
            checkTokenAllowance(true, 3000);
          }
        }}
        wallet={selectedWalletFrom}
        spenderData={{
          offerKey: approveErc20ModalData.approveErc20ModalOpts.offerKey || '',
          offerName:
            approveErc20ModalData.approveErc20ModalOpts.offerName || '',
          spenderKey:
            approveErc20ModalData.approveErc20ModalOpts.spenderKey || '',
          spenderName:
            approveErc20ModalData.approveErc20ModalOpts.spenderName || '',
          address:
            approveErc20ModalData.approveErc20ModalOpts.spenderAddress || '',
          amount: amountFrom.toString(),
        }}
      />
    </>
  );
};

export default SwapCryptoOffers;
