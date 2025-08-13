import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, ScrollView, Text, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import uuid from 'react-native-uuid';
import styled from 'styled-components/native';
import {
  RouteProp,
  useRoute,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
import InfoSvg from '../../../../../assets/img/info.svg';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Button from '../../../../components/button/Button';
import haptic from '../../../../components/haptic-feedback/haptic';
import {BaseText, H5, H7, Small} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useLogger} from '../../../../utils/hooks/useLogger';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import {
  SellCryptoExpandibleCard,
  ItemDivisor,
  SellBalanceContainer,
} from '../styled/SellCryptoCard';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  BitPay,
  LuckySevens,
} from '../../../../styles/colors';
import {
  GetPrecision,
  IsERCToken,
} from '../../../../store/wallet/utils/currency';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {SellCryptoActions} from '../../../../store/sell-crypto';
import {SellCryptoLimits} from '../../../../store/sell-crypto/sell-crypto.models';
import {
  MoonpayGetSellQuoteRequestData,
  MoonpayGetSellSignedPaymentUrlData,
  MoonpayGetSellSignedPaymentUrlRequestData,
  MoonpaySellOrderData,
} from '../../../../store/sell-crypto/models/moonpay-sell.models';
import {calculateAnyFiatToAltFiat} from '../../../../store/buy-crypto/buy-crypto.effects';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {SendMaxInfo, Wallet} from '../../../../store/wallet/wallet.models';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME_UPPERCASE,
} from '../../../../constants/config';
import {
  SellCryptoExchangeKey,
  SellCryptoSupportedExchanges,
  getAvailableSellCryptoFiatCurrencies,
  getBaseSellCryptoFiatCurrencies,
  isWithdrawalMethodSupported,
} from '../utils/sell-crypto-utils';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {WithdrawalMethod} from '../constants/SellCryptoConstants';
import {useTranslation} from 'react-i18next';
import {
  TermsContainer,
  TermsContainerOffer,
  TermsText,
} from '../../buy-crypto/styled/BuyCryptoTerms';
import {SellCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {AppActions} from '../../../../store/app';
import {
  adjustMoonpaySellAmount,
  getMoonpaySellFixedCurrencyAbbreviation,
  getMoonpaySellPayoutMethodFormat,
  moonpaySellEnv,
} from '../utils/moonpay-sell-utils';
import {PreLoadPartnersData} from './SellCryptoRoot';
import {GetProtocolPrefixAddress} from '../../../../store/wallet/utils/wallet';
import {useTheme} from 'styled-components/native';
import {
  getSimplexBaseAmountFormat,
  getSimplexCoinFormat,
  getSimplexCountryFormat,
  getSimplexSellReturnURL,
  simplexSellEnv,
} from '../utils/simplex-sell-utils';
import {
  SimplexGetSellQuoteData,
  SimplexGetSellQuoteRequestData,
  SimplexPayoutMethodType,
  SimplexSellPaymentRequestData,
  SimplexSellPaymentRequestReqData,
} from '../../../../store/sell-crypto/models/simplex-sell.models';
import {SellCryptoScreens} from '../SellCryptoGroup';
import ArchaxFooter from '../../../../components/archax/archax-footer';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import {
  getChainFromRampChainFormat,
  getCoinFromRampCoinFormat,
  getPayoutMethodKeyFromRampType,
  getRampChainFormat,
  getRampSellCoinFormat,
  rampSellEnv,
} from '../utils/ramp-sell-utils';
import {
  RampGetSellQuoteData,
  RampGetSellQuoteRequestData,
  RampOfframpSaleCreatedEvent,
  RampSellCreatedEventPayload,
  RampSellIncomingData,
  RampSellOrderData,
  RampSellQuoteResultForPayoutMethod,
  RampSellSendCryptoPayload,
} from '../../../../store/sell-crypto/models/ramp-sell.models';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import Modal from 'react-native-modal';
import {HEIGHT, WIDTH} from '../../../../components/styled/Containers';
import {
  RampGetSellSignedPaymentUrlData,
  RampPaymentUrlConfigParams,
} from '../../../../store/buy-crypto/models/ramp.models';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export type SellCryptoOffersScreenParams = {
  amount: number;
  fiatCurrency: string;
  coin: string;
  chain: string;
  country: string;
  selectedWallet: Wallet;
  paymentMethod: WithdrawalMethod;
  sellCryptoConfig: SellCryptoConfig | undefined;
  preSetPartner?: SellCryptoExchangeKey | undefined;
  preLoadPartnersData?: PreLoadPartnersData;
  useSendMax?: boolean;
  sendMaxInfo?: SendMaxInfo | undefined;
};

export type CryptoOffer = {
  key: SellCryptoExchangeKey;
  showOffer: boolean;
  logo: JSX.Element;
  expanded: boolean;
  sellClicked: boolean;
  fiatCurrency: string;
  cryptoAmount: number;
  sellAmount?: number;
  fee?: number;
  precision?: number; // Moonpay to calculate adjusted amount
  decimals?: number; // Decimals used for coin/token
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountReceivingAltFiatCurrency?: string;
  amountReceivingUnit?: string; // Ramp
  amountLimits?: SellCryptoLimits;
  errorMsg?: string;
  quoteData?: any; // Moonpay | Ramp | Simplex
  externalId?: string; // Ramp
  outOfLimitMsg?: string;
};

const SellCryptoOffersContainer = styled.SafeAreaView`
  flex: 1;
  margin-bottom: 40px;
`;

const SummaryRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin-top: 20px;
  padding: 0 14px;
`;

const SummaryNote = styled.View`
  margin-top: 5px;
  padding: 0 14px;
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

const OfferDataAmount = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const OfferDataAmountUsd = styled(BaseText)`
  font-size: 12px;
  color: ${LuckySevens};
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

const OfferDataFeeLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataWarningContainer = styled.View`
  max-width: 85%;
  margin-top: 10px;
`;

const OfferDataWarningMsg = styled(BaseText)`
  color: #df5264;
  margin-right: 10px;
  font-size: 12;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSec = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 10px;
`;

const OfferDataInfoTotal = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: bold;
`;

const OfferExpandibleItem = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const OfferDataRightContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const offersDefault: {
  moonpay: CryptoOffer;
  ramp: CryptoOffer;
  simplex: CryptoOffer;
} = {
  moonpay: {
    key: 'moonpay',
    amountReceiving: '0', // Fiat amount
    amountReceivingAltFiatCurrency: '0', // Fiat amount in alt fiat currency
    showOffer: true,
    logo: <MoonpayLogo widthIcon={25} heightIcon={25} />,
    expanded: false,
    sellClicked: false,
    fiatCurrency: 'USD',
    cryptoAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  ramp: {
    key: 'ramp',
    amountReceiving: '0', // Fiat amount
    amountReceivingAltFiatCurrency: '0', // Fiat amount in alt fiat currency
    showOffer: true,
    logo: <RampLogo width={70} height={20} />,
    expanded: false,
    sellClicked: false,
    fiatCurrency: 'EUR',
    cryptoAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  simplex: {
    key: 'simplex',
    amountReceiving: '0', // Fiat amount
    amountReceivingAltFiatCurrency: '0', // Fiat amount in alt fiat currency
    showOffer: true,
    logo: (
      <SimplexLogo
        widthIcon={25}
        heightIcon={25}
        widthLogo={60}
        heightLogo={30}
      />
    ),
    expanded: false,
    sellClicked: false,
    fiatCurrency: 'EUR',
    cryptoAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

const SellCryptoOffers: React.FC = () => {
  const {
    params: {
      amount,
      fiatCurrency,
      coin,
      chain,
      country,
      selectedWallet,
      paymentMethod,
      sellCryptoConfig,
      preSetPartner,
      preLoadPartnersData,
      useSendMax,
      sendMaxInfo,
    },
  }: {params: SellCryptoOffersScreenParams} =
    useRoute<RouteProp<{params: SellCryptoOffersScreenParams}>>();
  const {t} = useTranslation();
  const theme = useTheme();
  const logger = useLogger();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  SellCryptoSupportedExchanges.forEach((exchange: SellCryptoExchangeKey) => {
    if (offersDefault[exchange]) {
      if (preLoadPartnersData && preLoadPartnersData[exchange]) {
        offersDefault[exchange].amountLimits =
          preLoadPartnersData[exchange].limits;

        if (exchange === 'moonpay') {
          offersDefault.moonpay.precision =
            preLoadPartnersData.moonpay.precision;
          const adjustedSellAmount = adjustMoonpaySellAmount(
            amount,
            preLoadPartnersData?.moonpay?.precision,
          );
          offersDefault.moonpay.sellAmount = adjustedSellAmount;
        }
      }

      offersDefault[exchange].fiatCurrency =
        getAvailableSellCryptoFiatCurrencies(
          exchange,
          paymentMethod.method,
        ).includes(fiatCurrency)
          ? fiatCurrency
          : getBaseSellCryptoFiatCurrencies(exchange, paymentMethod.method);

      if (
        preSetPartner &&
        SellCryptoSupportedExchanges.includes(preSetPartner)
      ) {
        offersDefault[exchange].showOffer =
          preSetPartner === exchange
            ? isWithdrawalMethodSupported(
                preSetPartner,
                paymentMethod,
                coin,
                chain,
                offersDefault[preSetPartner].fiatCurrency,
                country,
                user?.country,
              ) &&
              (!sellCryptoConfig?.[preSetPartner] ||
                !sellCryptoConfig?.[preSetPartner]?.removed)
            : false;
      } else {
        offersDefault[exchange].showOffer =
          isWithdrawalMethodSupported(
            exchange,
            paymentMethod,
            coin,
            chain,
            offersDefault[exchange].fiatCurrency,
            country,
            user?.country,
          ) &&
          (!sellCryptoConfig?.[exchange] ||
            !sellCryptoConfig?.[exchange]?.removed);
      }
    }
  });

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [finishedMoonpay, setFinishedMoonpay] = useState(false);
  const [finishedRamp, setFinishedRamp] = useState(false);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);
  const [sellModalVisible, setSellModalVisible] = useState<{
    open: boolean;
    url: string | undefined;
  }>({open: false, url: undefined});

  const getMoonpaySellQuote = async (): Promise<void> => {
    logger.debug('Moonpay getting sell quote');

    if (sellCryptoConfig?.moonpay?.disabled) {
      let err = sellCryptoConfig?.moonpay?.disabledMessage
        ? sellCryptoConfig?.moonpay?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason =
        'moonpayGetSellQuote Error. Exchange disabled from config.';
      showMoonpayError(err, reason);
      return;
    }

    offers.moonpay.cryptoAmount = amount;

    const requestData: MoonpayGetSellQuoteRequestData = {
      env: moonpaySellEnv,
      currencyAbbreviation: getMoonpaySellFixedCurrencyAbbreviation(
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
      ),
      quoteCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      baseCurrencyAmount: offers.moonpay.sellAmount || amount,
      payoutMethod: getMoonpaySellPayoutMethodFormat(paymentMethod.method),
    };

    selectedWallet
      .moonpayGetSellQuote(requestData)
      .then(data => {
        if (data?.baseCurrencyAmount) {
          offers.moonpay.amountLimits = {
            min: data.baseCurrency.minsellAmount,
            max: data.baseCurrency.maxsellAmount,
          };

          if (
            (offers.moonpay.amountLimits.min &&
              Number(offers.moonpay.sellAmount) <
                offers.moonpay.amountLimits.min) ||
            (offers.moonpay.amountLimits.max &&
              Number(offers.moonpay.sellAmount) >
                offers.moonpay.amountLimits.max)
          ) {
            offers.moonpay.outOfLimitMsg = t(
              'There are no Moonpay offers available, as the current sell limits for this exchange must be between and',
              {
                min: offers.moonpay.amountLimits.min,
                max: offers.moonpay.amountLimits.max,
                fiatCurrency: offers.moonpay.fiatCurrency,
              },
            );
            setFinishedMoonpay(!finishedMoonpay);
            return;
          } else {
            offers.moonpay.outOfLimitMsg = undefined;
            offers.moonpay.errorMsg = undefined;
            offers.moonpay.quoteData = data;
            offers.moonpay.sellAmount = data.baseCurrencyAmount;
            offers.moonpay.fee =
              Number(data.extraFeeAmount) + Number(data.feeAmount);

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.moonpay.sellAmount && coin && precision) {
              offers.moonpay.fiatMoney = Number(
                offers.moonpay.sellAmount / data.quoteCurrencyAmount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Moonpay error: Could not get precision for ${coin}`,
              );
            }
            const adjustedFiatAmount: number =
              offers.moonpay.fiatCurrency === fiatCurrency
                ? Number(data.quoteCurrencyAmount)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(data.quoteCurrencyAmount),
                      offers.moonpay.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(data.quoteCurrencyAmount);

            offers.moonpay.amountReceiving = Number(
              data.quoteCurrencyAmount,
            ).toFixed(2);
            offers.moonpay.amountReceivingAltFiatCurrency =
              adjustedFiatAmount.toFixed(2);

            logger.debug('Moonpay getting sell quote: SUCCESS');
            setFinishedMoonpay(!finishedMoonpay);
          }
        } else {
          if (!data) {
            logger.error('Moonpay error: No data received');
          }
          if (data.message && typeof data.message === 'string') {
            logger.error('Moonpay error: ' + data.message);
          }
          if (data.error && typeof data.error === 'string') {
            logger.error('Moonpay error: ' + data.error);
          }
          if (data.errors) {
            logger.error(data.errors);
          }
          let err = t("Can't get rates at this moment. Please try again later");
          const reason =
            'moonpayGetSellQuote Error. Necessary data not included.';
          showMoonpayError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'moonpayGetSellQuote Error';
        showMoonpayError(err, reason);
      });
  };

  const showMoonpayError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.error && !err.message) {
          if (typeof err.error === 'string') {
            msg = err.error;
          } else if (err.error.message) {
            msg = err.error.message;
          }
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Moonpay error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'moonpay',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(offers.moonpay.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.moonpay.fiatCurrency || '',
      }),
    );

    offers.moonpay.errorMsg = msg;
    offers.moonpay.fiatMoney = undefined;
    offers.moonpay.expanded = false;
    setUpdateView(Math.random());
  };

  const getRampSellQuote = async (): Promise<void> => {
    logger.debug('Ramp getting sell quote');

    if (sellCryptoConfig?.ramp?.disabled) {
      let err = sellCryptoConfig?.ramp?.disabledMessage
        ? sellCryptoConfig?.ramp?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'rampGetSellQuote Error. Exchange disabled from config.';
      showRampError(err, reason);
      return;
    }

    offers.ramp.cryptoAmount = amount;

    const requestData: RampGetSellQuoteRequestData = {
      env: rampSellEnv,
      cryptoAssetSymbol: getRampSellCoinFormat(
        selectedWallet.currencyAbbreviation,
        getRampChainFormat(selectedWallet.chain),
      ),
      fiatCurrency: offers.ramp.fiatCurrency.toUpperCase(),
    };

    const precision = dispatch(
      GetPrecision(coin, chain, selectedWallet.tokenAddress),
    );
    if (precision) {
      requestData.cryptoAmount = BigInt(
        (amount * precision.unitToSatoshi).toFixed(0),
      ).toString();
    } else {
      logger.error(`Ramp error: Could not get precision for ${coin}`);
      const msg = t('An error occurred while calculating the quote.');
      const reason = 'rampGetSellQuote Error. Could not get precision';
      showRampError(msg, reason);
      return;
    }

    selectedWallet
      .rampGetSellQuote(requestData)
      .then((data: RampGetSellQuoteData) => {
        let paymentMethodData: RampSellQuoteResultForPayoutMethod | undefined;
        if (data?.asset) {
          switch (paymentMethod.method) {
            case 'ach':
              if (data.AMERICAN_BANK_TRANSFER) {
                paymentMethodData = data.AMERICAN_BANK_TRANSFER;
              } else if (data.AUTO_BANK_TRANSFER) {
                paymentMethodData = data.AUTO_BANK_TRANSFER;
              }
              break;
            case 'sepaBankTransfer':
              if (data.SEPA) {
                paymentMethodData = data.SEPA;
              } else if (data.MANUAL_BANK_TRANSFER) {
                paymentMethodData = data.MANUAL_BANK_TRANSFER;
              } else if (data.AUTO_BANK_TRANSFER) {
                paymentMethodData = data.AUTO_BANK_TRANSFER;
              }
              break;
            case 'debitCard':
            case 'creditCard':
              if (data.CARD) {
                paymentMethodData = data.CARD;
              } else if (data.CARD_PAYMENT) {
                paymentMethodData = data.CARD_PAYMENT;
              }
              break;
            default:
              paymentMethodData = data.CARD_PAYMENT ?? data.CARD;
          }

          if (!paymentMethodData?.fiatValue) {
            logger.error(
              'rampGetSellQuote Error: No fiat value provided from Ramp',
            );
            const reason =
              'rampGetSellQuote Error. No fiat value provided from Ramp';
            showRampError(undefined, reason);
            return;
          }

          offers.ramp.amountLimits = {
            min:
              data.asset.minPurchaseAmount < 0
                ? undefined
                : data.asset.minPurchaseAmount,
            max:
              data.asset.maxPurchaseAmount < 0
                ? undefined
                : data.asset.maxPurchaseAmount,
          };

          if (
            (offers.ramp.amountLimits.min &&
              Number(offers.ramp.sellAmount) < offers.ramp.amountLimits.min) ||
            (offers.ramp.amountLimits.max &&
              Number(offers.ramp.sellAmount) > offers.ramp.amountLimits.max)
          ) {
            offers.ramp.outOfLimitMsg = t(
              'There are no Ramp Network offers available, as the current sell limits for this exchange must be between and',
              {
                min: offers.ramp.amountLimits.min,
                max: offers.ramp.amountLimits.max,
                fiatCurrency: offers.ramp.fiatCurrency,
              },
            );
            setFinishedRamp(!finishedRamp);
            return;
          } else {
            offers.ramp.outOfLimitMsg = undefined;
            offers.ramp.errorMsg = undefined;
            offers.ramp.quoteData = data;
            offers.ramp.sellAmount = cloneDeep(amount); // paymentMethodData.fiatValue;
            offers.ramp.fee =
              Number(paymentMethodData.baseRampFee ?? 0) +
              Number(paymentMethodData.appliedFee);

            offers.ramp.externalId = uuid.v4().toString();

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            let decimals: number | undefined;

            if (data.asset.decimals && data.asset.decimals > 0) {
              decimals = data.asset.decimals;
            } else if (precision?.unitDecimals) {
              decimals = precision.unitDecimals;
            }
            offers.ramp.decimals = decimals;

            if (offers.ramp.sellAmount && coin && decimals) {
              offers.ramp.fiatMoney = Number(
                offers.ramp.sellAmount / Number(paymentMethodData.fiatValue),
              ).toFixed(decimals);
            } else {
              logger.error(`Ramp error: Could not get precision for ${coin}`);

              const reason = 'rampGetSellQuote Error. Could not get decimals';
              showRampError(undefined, reason);
              return;
            }

            const adjustedFiatAmount: number =
              offers.ramp.fiatCurrency === fiatCurrency
                ? Number(paymentMethodData.fiatValue)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(paymentMethodData.fiatValue),
                      offers.ramp.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(paymentMethodData.fiatValue);

            offers.ramp.amountReceiving = Number(
              paymentMethodData.fiatValue,
            ).toFixed(2);
            offers.ramp.amountReceivingAltFiatCurrency =
              adjustedFiatAmount.toFixed(2);
            // const amountReceivingNum =
            //   Number(paymentMethodData.cryptoAmount) / 10 ** decimals;
            // offers.ramp.amountReceiving = amountReceivingNum.toFixed(8);

            // if (
            //   offers.ramp.sellAmount &&
            //   Number(paymentMethodData.fiatValue) > 0 &&
            //   coin &&
            //   precision
            // ) {
            //   offers.ramp.fiatMoney = Number(
            //     offers.ramp.sellAmount / paymentMethodData.fiatValue,
            //   ).toFixed(precision.unitDecimals);
            // } else {
            //   logger.error(`Ramp error: Could not get precision for ${coin}`);
            // }

            logger.debug('Ramp getting quote: SUCCESS');
            setFinishedRamp(!finishedRamp);
          }
        } else {
          if (!data) {
            logger.error('Ramp error: No data received');
          }
          if (data.message && typeof data.message === 'string') {
            logger.error('Ramp error: ' + data.message);
          }
          if (data.error && typeof data.error === 'string') {
            logger.error('Ramp error: ' + data.error);
          }
          if (data.errors) {
            logger.error(data.errors);
          }

          let err = t("Can't get rates at this moment. Please try again later");
          const reason = 'rampGetSellQuote Error. Necessary data not included.';
          showRampError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'rampGetSellQuote Error';
        showRampError(err, reason);
      });
  };

  const showRampError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.error && !err.message) {
          if (typeof err.error === 'string') {
            msg = err.error;
          } else if (err.error.message) {
            msg = err.error.message;
          }
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Ramp error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'ramp',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(offers.ramp.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.ramp.fiatCurrency || '',
      }),
    );

    offers.ramp.errorMsg = msg;
    offers.ramp.fiatMoney = undefined;
    offers.ramp.expanded = false;
    setUpdateView(Math.random());
  };

  const getSimplexSellQuote = (): void => {
    logger.debug('Simplex getting sell quote');

    if (sellCryptoConfig?.simplex?.disabled) {
      let err = sellCryptoConfig?.simplex?.disabledMessage
        ? sellCryptoConfig?.simplex?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason =
        'simplexGetSellQuote Error. Exchange disabled from config.';
      showSimplexError(err, reason);
      return;
    }

    offers.simplex.cryptoAmount = amount;

    if (
      (offers.simplex.amountLimits?.min &&
        Number(offers.simplex.sellAmount) < offers.simplex.amountLimits.min) ||
      (offers.simplex.amountLimits?.max &&
        Number(offers.simplex.sellAmount) > offers.simplex.amountLimits.max)
    ) {
      offers.simplex.outOfLimitMsg = t(
        'There are no Simplex offers available, as the current sell limits for this exchange must be between and',
        {
          min: offers.simplex.amountLimits.min,
          max: offers.simplex.amountLimits.max,
          fiatCurrency: offers.simplex.fiatCurrency,
        },
      );
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      let simplexPaymentMethod: SimplexPayoutMethodType | undefined;
      switch (paymentMethod.method) {
        case 'sepaBankTransfer':
          simplexPaymentMethod = 'sepa';
          break;
        case 'debitCard':
        case 'creditCard':
          simplexPaymentMethod = 'card';
          break;
      }

      if (!simplexPaymentMethod) {
        const msg = t("Can't get rates at this moment. Please try again later");
        const reason =
          'No valid simplexPaymentMethod selected for Simplex offer.';
        showSimplexError(msg, reason);
        return;
      }
      const userCountry = getSimplexCountryFormat(country, user?.country);

      const requestData: SimplexGetSellQuoteRequestData = {
        env: simplexSellEnv,
        userCountry: __DEV__ ? 'LT' : userCountry || 'US',
        base_currency: getSimplexCoinFormat(coin, selectedWallet.chain),
        base_amount: getSimplexBaseAmountFormat(amount), // base_amount should be integer, which counts millionths of a whole currency unit.
        quote_currency: offers.simplex.fiatCurrency.toUpperCase(),
        pp_payment_method: 'sepa', // pp_payment_method = "sepa" (this does not impact user payment method but is needed to get a quote, no impact on price) | TODO: use simplexPaymentMethod,
      };

      selectedWallet
        .simplexGetSellQuote(requestData)
        .then((data: SimplexGetSellQuoteData) => {
          if (data && data.fiat_amount) {
            offers.simplex.outOfLimitMsg = undefined;
            offers.simplex.errorMsg = undefined;
            offers.simplex.quoteData = data;
            offers.simplex.sellAmount = cloneDeep(amount);
            offers.simplex.fee = Number(data.fiat_amount) * 0.05;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.simplex.sellAmount && coin && precision) {
              offers.simplex.fiatMoney = Number(
                offers.simplex.sellAmount / Number(data.fiat_amount),
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Simplex error: Could not get precision for ${coin}`,
              );
            }

            const adjustedFiatAmount: number =
              offers.simplex.fiatCurrency === fiatCurrency
                ? Number(data.fiat_amount)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(data.fiat_amount),
                      offers.simplex.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(data.fiat_amount);

            offers.simplex.amountReceiving = Number(data.fiat_amount).toFixed(
              2,
            );
            offers.simplex.amountReceivingAltFiatCurrency =
              adjustedFiatAmount.toFixed(2);

            logger.debug('Simplex getting sell quote: SUCCESS');
            setFinishedSimplex(!finishedSimplex);
          } else {
            if (data.message && typeof data.message === 'string') {
              logger.error('Simplex error: ' + data.message);
            }
            if (data.error && typeof data.error === 'string') {
              logger.error('Simplex error: ' + data.error);
            }
            if (data.errors) {
              logger.error(data.errors);
            }
            let err = t(
              "Can't get rates at this moment. Please try again later",
            );
            const reason =
              'simplexGetSellQuote Error. Necessary data not included.';
            showSimplexError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'simplexGetSellQuote Error';
          showSimplexError(err, reason);
        });
    }
  };

  const showSimplexError = (err?: any, reason?: string) => {
    let msg = t('Could not get crypto offer. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.error && !err.message) {
          if (typeof err.error === 'string') {
            msg = err.error;
          } else if (err.error.message) {
            msg = err.error.message;
          }
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Simplex error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'simplex',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(offers.simplex.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.simplex.fiatCurrency || '',
      }),
    );

    offers.simplex.errorMsg = msg;
    offers.simplex.fiatMoney = undefined;
    offers.simplex.expanded = false;
    setUpdateView(Math.random());
  };

  const goTo = (key: string): void => {
    switch (key) {
      case 'moonpay':
        goToMoonpaySellPage();
        break;
      case 'ramp':
        goToRampSellPage();
        break;
      case 'simplex':
        goToSimplexSellPage();
        break;
    }
  };

  const goToMoonpaySellPage = () => {
    if (offers.moonpay.errorMsg || offers.moonpay.outOfLimitMsg) {
      return;
    }
    continueToMoonpay();
  };

  const continueToMoonpay = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const msg = t('Error when trying to generate wallet address.');
      const reason = 'createWalletAddress Error';
      showMoonpayError(msg, reason);
      return;
    }

    if (
      selectedWallet.currencyAbbreviation.toLowerCase() === 'bch' &&
      selectedWallet.chain.toLowerCase() === 'bch'
    ) {
      address = dispatch(
        GetProtocolPrefixAddress(
          selectedWallet.currencyAbbreviation,
          selectedWallet.network,
          address,
          selectedWallet.chain,
        ),
      );
    }

    const newId = uuid.v4().toString();
    const externalTransactionId = `${selectedWallet.id}-${newId}`;

    const requestData: MoonpayGetSellSignedPaymentUrlRequestData = {
      env: moonpaySellEnv,
      baseCurrencyCode: getMoonpaySellFixedCurrencyAbbreviation(
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
      ),
      baseCurrencyAmount: offers.moonpay.sellAmount || amount,
      externalTransactionId: externalTransactionId,
      paymentMethod: getMoonpaySellPayoutMethodFormat(paymentMethod!.method),
      externalCustomerId: user?.eid ?? selectedWallet.id,
      redirectURL:
        APP_DEEPLINK_PREFIX +
        `moonpay?flow=sell&externalId=${externalTransactionId}` +
        `${useSendMax ? '&sendMax=true' : ''}`,
      refundWalletAddress: address,
      lockAmount: true,
      colorCode: BitPay,
      theme: theme.dark ? 'dark' : 'light',
      quoteCurrencyCode: cloneDeep(offers.moonpay.fiatCurrency)?.toLowerCase(),
      showWalletAddressForm: false,
    };

    let data: MoonpayGetSellSignedPaymentUrlData;
    try {
      data = await selectedWallet.moonpayGetSellSignedPaymentUrl(requestData);
      if (!data?.urlWithSignature) {
        const msg = t(
          'Our partner Moonpay is not currently available. Please try again later.',
        );
        const reason =
          'moonpayGetSignedPaymentUrl Error. urlWithSignature not present.';
        showMoonpayError(msg, reason);
        return;
      }
    } catch (err) {
      const msg = t(
        'Our partner Moonpay is not currently available. Please try again later.',
      );
      const reason = 'moonpayGetSignedPaymentUrl Error.';
      showMoonpayError(msg, reason);
      return;
    }

    const newData: MoonpaySellOrderData = {
      env: __DEV__ ? 'dev' : 'prod',
      wallet_id: selectedWallet.id,
      coin: cloneDeep(selectedWallet.currencyAbbreviation).toUpperCase(),
      chain: cloneDeep(selectedWallet.chain).toLowerCase(),
      external_id: externalTransactionId,
      created_on: Date.now(),
      crypto_amount: offers.moonpay.sellAmount || amount,
      refund_address: address,
      fiat_currency: offers.moonpay.quoteData?.quoteCurrency?.code
        ? cloneDeep(offers.moonpay.quoteData.quoteCurrency.code).toUpperCase()
        : fiatCurrency,
      payment_method: paymentMethod!.method,
      fiat_fee_amount: Number(offers.moonpay.fee),
      fiat_receiving_amount: Number(offers.moonpay.amountReceiving),
      status: 'createdOrder',
      send_max: useSendMax,
    };

    dispatch(
      SellCryptoActions.successSellOrderMoonpay({
        moonpaySellOrderData: newData,
      }),
    );

    await sleep(300);
    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.dispatch(StackActions.popToTop());
  };

  const goToRampSellPage = () => {
    if (offers.ramp.errorMsg || offers.ramp.outOfLimitMsg) {
      return;
    }
    continueToRamp();
  };

  const continueToRamp = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const msg = t('Error when trying to generate wallet address.');
      const reason = 'createWalletAddress Error';
      showRampError(msg, reason);
      return;
    }

    if (
      selectedWallet.currencyAbbreviation.toLowerCase() === 'bch' &&
      selectedWallet.chain.toLowerCase() === 'bch'
    ) {
      address = dispatch(
        GetProtocolPrefixAddress(
          selectedWallet.currencyAbbreviation,
          selectedWallet.network,
          address,
          selectedWallet.chain,
        ),
      );
    }

    const externalTransactionId = uuid.v4().toString();
    const rampAsset = getRampSellCoinFormat(
      selectedWallet.currencyAbbreviation,
      getRampChainFormat(selectedWallet.chain),
    );

    const requestData: RampPaymentUrlConfigParams = {
      env: rampSellEnv,
      flow: 'sell',
      userAddress: address, // TODO: ask Ramp team about this for UTXO coins
      hostLogoUrl: 'https://bitpay.com/_nuxt/img/bitpay-logo-blue.1c0494b.svg',
      hostAppName: APP_NAME_UPPERCASE,
      offrampAsset: rampAsset,
      swapAsset: rampAsset,
      swapAmount: offers.ramp.decimals
        ? Number(offers.ramp.sellAmount) * 10 ** offers.ramp.decimals
        : undefined,
      fiatCurrency: offers.ramp.fiatCurrency,
      enabledFlows: 'OFFRAMP',
      defaultFlow: 'OFFRAMP',
      selectedCountryCode: country,
      defaultAsset: rampAsset,
      variant: 'webview-mobile',
      useSendCryptoCallback: true,
      useSendCryptoCallbackVersion: 1,
      hideExitButton: false,
    };

    let data: RampGetSellSignedPaymentUrlData;
    try {
      data = await selectedWallet.rampGetSignedPaymentUrl(requestData);
      if (!data?.urlWithSignature) {
        const msg = t(
          'Our partner Ramp Network is not currently available. Please try again later.',
        );
        const reason =
          'rampGetSignedPaymentUrl Error. urlWithSignature not present.';
        showRampError(msg, reason);
        return;
      }
    } catch (err) {
      const msg = t(
        'Our partner Ramp Network is not currently available. Please try again later.',
      );
      const reason = 'rampGetSignedPaymentUrl Error.';
      showRampError(msg, reason);
      return;
    }

    try {
      const RampWebView = (url: string) => {
        setSellModalVisible({open: true, url: url});
      };

      RampWebView(data.urlWithSignature);
    } catch (err) {
      const msg = t(
        'The Ramp Network checkout page could not be opened. Please try again later.',
      );
      const reason =
        'rampGetSignedPaymentUrl Error. The checkout page could not be opened.';
      showRampError(msg, reason);
      return;
    }
  };

  const handleRampCheckoutMessage = async (event: WebViewMessageEvent) => {
    if (event?.nativeEvent?.data) {
      let parsedEventData: RampOfframpSaleCreatedEvent;
      try {
        logger.debug('Trying to parse event JSON: ' + event.nativeEvent.data);
        parsedEventData = JSON.parse(
          event.nativeEvent.data,
        ) as RampOfframpSaleCreatedEvent;
        logger.debug('Successfully parsed!');
      } catch (error) {
        logger.error(
          'Error trying to parse event JSON: ' + JSON.stringify(error),
        );
        return;
      }

      if (parsedEventData.type) {
        switch (parsedEventData.type) {
          case 'WIDGET_CONFIG_DONE': // Wdiget successfully opened
            logger.debug('Ramp checkout event: WIDGET_CONFIG_DONE');
            return;

          case 'OFFRAMP_SALE_CREATED': // Quote accepted in checkout page and continue clicked
            logger.debug('Ramp checkout event: OFFRAMP_SALE_CREATED');
            const orderData =
              parsedEventData.payload as RampSellCreatedEventPayload;

            const newData: RampSellOrderData = {
              env: __DEV__ ? 'dev' : 'prod',
              wallet_id: selectedWallet.id,
              address_to: '',
              coin: cloneDeep(
                selectedWallet.currencyAbbreviation,
              ).toUpperCase(),
              chain: cloneDeep(selectedWallet.chain).toLowerCase(),
              created_on: Date.now(),
              crypto_amount: offers.ramp.sellAmount || amount,
              fiat_receiving_amount: Number(offers.ramp.amountReceiving),
              fiat_fee_amount: Number(offers.ramp.fee),
              fiat_currency: offers.ramp.quoteData?.quoteCurrency?.code
                ? cloneDeep(
                    offers.ramp.quoteData.quoteCurrency.code,
                  ).toUpperCase()
                : fiatCurrency,
              payment_method: paymentMethod!.method,
              external_id: cloneDeep(offers.ramp.externalId)!,
              sale_view_token: orderData.saleViewToken,
              quote_id: orderData.sale?.id,
              status: 'createdOrder',
              send_max: useSendMax,
            };

            if (
              IsERCToken(
                cloneDeep(selectedWallet.currencyAbbreviation),
                cloneDeep(selectedWallet.chain),
              )
            ) {
              if (
                orderData.sale?.crypto?.assetInfo?.address &&
                selectedWallet.tokenAddress
              ) {
                const contractAddressFromRamp = cloneDeep(
                  orderData.sale.crypto.assetInfo.address,
                ).toLowerCase();
                const contractAddress = cloneDeep(
                  selectedWallet.tokenAddress,
                ).toLowerCase();
                if (contractAddress !== contractAddressFromRamp) {
                  logger.warn(
                    `The contract address from Ramp: ${contractAddressFromRamp} is different from the selected wallet: ${contractAddress}. The sale process is going to be cancelled.`,
                  );

                  const errMsg = t(
                    'There was an error trying to create the sale transaction. Please try again later.',
                  );

                  setSellModalVisible({
                    open: false,
                    url: sellModalVisible?.url,
                  });
                  await sleep(1500);
                  showError(undefined, errMsg);
                }
              }
            } else {
              if (
                orderData.sale?.crypto?.assetInfo?.symbol &&
                orderData.sale?.crypto?.assetInfo?.chain
              ) {
                const orderCoin = getCoinFromRampCoinFormat(
                  cloneDeep(
                    orderData.sale.crypto.assetInfo.symbol,
                  ).toLowerCase(),
                );
                const orderChain = getChainFromRampChainFormat(
                  cloneDeep(
                    orderData.sale.crypto.assetInfo.chain,
                  ).toLowerCase(),
                );
                if (
                  orderCoin !==
                    selectedWallet.currencyAbbreviation.toLowerCase() ||
                  orderChain !== selectedWallet.chain.toLowerCase()
                ) {
                  logger.warn(
                    `The order coin-cain: ${orderCoin}-${orderChain} is different from the selected wallet: ${selectedWallet.currencyAbbreviation.toLowerCase()}-${selectedWallet.chain.toLowerCase()}. The sale process is going to be cancelled.`,
                  );

                  const errMsg = t(
                    'There was an error trying to create the sale transaction. Please try again later.',
                  );

                  setSellModalVisible({
                    open: false,
                    url: sellModalVisible?.url,
                  });
                  await sleep(1500);
                  showError(undefined, errMsg);
                }
              }
            }

            if (
              orderData.sale?.fiat?.payoutMethod &&
              getPayoutMethodKeyFromRampType(
                orderData.sale.fiat.payoutMethod,
              ) !== paymentMethod.method
            ) {
              logger.debug(
                `Payout Method changed on the checkout page. Updating payment_method from: ${paymentMethod.method} to: ${orderData.sale.fiat.payoutMethod}`,
              );
              newData.payment_method = getPayoutMethodKeyFromRampType(
                orderData.sale.fiat.payoutMethod,
              );
            }

            if (
              orderData.sale?.crypto?.amount &&
              Number(orderData.sale.crypto.amount) &&
              offers.ramp.decimals
            ) {
              const orderAmount =
                Number(orderData.sale.crypto.amount) /
                10 ** offers.ramp.decimals;
              if (orderAmount !== newData.crypto_amount) {
                // TODO: review the send max case here. Set it to undefined when the amount changed
                logger.debug(
                  `Amount changed on the checkout page. Updating crypto_amount from: ${newData.crypto_amount} to: ${orderAmount}`,
                );
                newData.crypto_amount = orderAmount;
                offers.ramp.sellAmount = orderAmount;
              }
            }

            if (
              orderData.sale?.fiat?.amount &&
              Number(orderData.sale.fiat.amount) &&
              Number(orderData.sale.fiat.amount) !==
                newData.fiat_receiving_amount
            ) {
              logger.debug(
                `Receiving Amount changed on the checkout page. Updating fiat_receiving_amount from: ${newData.fiat_receiving_amount} to: ${orderData.sale.fiat.amount}`,
              );
              newData.fiat_receiving_amount = Number(
                orderData.sale.fiat.amount,
              );
            }

            if (
              orderData.sale?.fiat?.currencySymbol &&
              orderData.sale.fiat.currencySymbol !== newData.fiat_currency
            ) {
              logger.debug(
                `Fiat Currency changed on the checkout page. Updating fiat_currency from: ${newData.fiat_currency} to: ${orderData.sale.fiat.amount}`,
              );
              newData.fiat_currency = orderData.sale.fiat.amount;
            }

            if (
              orderData.sale?.fees?.amount &&
              Number(orderData.sale.fees.amount) &&
              Number(orderData.sale.fees.amount) !== newData.fiat_fee_amount
            ) {
              logger.debug(
                `Fees Amount changed on the checkout page. Updating fiat_fee_amount from: ${newData.fiat_fee_amount} to: ${orderData.sale.fees.amount}`,
              );
              newData.fiat_fee_amount = Number(orderData.sale.fees.amount);
            }

            dispatch(
              SellCryptoActions.successSellOrderRamp({
                rampSellOrderData: newData,
              }),
            );
            return;
          case 'SEND_CRYPTO': // Pay in wallet clicked in checkout page
            logger.debug('Ramp checkout event: SEND_CRYPTO');

            const sendCryptoPayload =
              parsedEventData.payload as RampSellSendCryptoPayload;

            const dataToUpdate: RampSellIncomingData = {
              rampExternalId: cloneDeep(offers.ramp.externalId)!,
              depositWalletAddress: sendCryptoPayload?.address,
            };

            dispatch(
              SellCryptoActions.updateSellOrderRamp({
                rampSellIncomingData: dataToUpdate,
              }),
            );

            setSellModalVisible({open: false, url: sellModalVisible?.url});
            await sleep(1500);
            navigation.goBack();
            navigation.navigate(SellCryptoScreens.RAMP_SELL_CHECKOUT, {
              rampQuoteOffer: offers.ramp,
              wallet: selectedWallet,
              toAddress: sendCryptoPayload?.address,
              amount: offers.ramp.sellAmount!,
              showNewQuoteInfo: !!(offers.ramp.sellAmount !== amount),
              sellCryptoExternalId: cloneDeep(offers.ramp.externalId)!,
              paymentMethod: paymentMethod.method,
              useSendMax: IsERCToken(
                selectedWallet!.currencyAbbreviation,
                selectedWallet!.chain,
              )
                ? false
                : useSendMax,
              sendMaxInfo: sendMaxInfo,
            });
            return;

          default:
            logger.debug('Event not handled: ' + parsedEventData.type);
            return;
        }
      }
    }
  };

  const goToSimplexSellPage = () => {
    if (offers.simplex.errorMsg || offers.simplex.outOfLimitMsg) {
      return;
    }
    continueToSimplex();
  };

  const continueToSimplex = async () => {
    if (!offers.simplex.quoteData?.quote_id) {
      const msg =
        'There was an error while trying to reach the checkout page. Please try again later';
      const reason = 'quote_id not included in Simplex quote data.';
      showSimplexError(msg, reason);
    }

    const externalTransactionId = uuid.v4().toString();

    const return_url = getSimplexSellReturnURL(
      externalTransactionId,
      useSendMax,
    );

    const userCountry = getSimplexCountryFormat(country, user?.country);

    const quoteData: SimplexSellPaymentRequestReqData = {
      env: simplexSellEnv,
      userCountry: __DEV__ ? 'LT' : userCountry || 'US',
      referer_url: 'https://bitpay.com/',
      return_url: return_url,
      txn_details: {quote_id: offers.simplex.quoteData.quote_id},
    };

    selectedWallet
      .simplexSellPaymentRequest(quoteData)
      .then(async (data: SimplexSellPaymentRequestData) => {
        if (data?.error) {
          const reason = 'simplexSellPaymentRequest Error';
          showSimplexError(data.error, reason);
          setOpeningBrowser(false);
          return;
        }

        if (!data?.txn_url) {
          const msg =
            'There was an error. Simplex did not provide the URL to continue with the sales process.';
          const reason = 'simplexSellPaymentRequest Error: No txn_url present.';
          showSimplexError(msg, reason);
          setOpeningBrowser(false);
          return;
        }

        logger.debug('Simplex creating sell payment request: SUCCESS');

        const destinationChain = selectedWallet.chain;

        dispatch(
          Analytics.track('Sell Crypto Order Created', {
            exchange: 'simplex',
            cryptoAmount: offers.simplex.sellAmount,
            fiatAmount: offers.simplex.quoteData?.fiat_amount
              ? Number(offers.simplex.quoteData.fiat_amount)
              : '',
            fiatCurrency: offers.simplex.fiatCurrency || '',
            coin: selectedWallet.currencyAbbreviation.toLowerCase(),
            chain: destinationChain?.toLowerCase(),
          }),
        );

        const ref = data.app_sell_ref_id ?? 'bitpay';
        const paymentUrl = `${data.txn_url}?ref=${ref}`;

        // This offer is opened in an external browser as Simplex does not provide the deposit address in advance.
        // The user would have to go back and forth between the web and the app.
        await Linking.openURL(paymentUrl);
        await sleep(500);

        navigation.goBack();
        navigation.navigate(SellCryptoScreens.SIMPLEX_SELL_CHECKOUT, {
          simplexQuoteOffer: offers.simplex,
          wallet: selectedWallet,
          amount: amount,
          externalId: externalTransactionId,
          paymentMethod: paymentMethod.method,
          simplexTxId: data.txn_id,
          useSendMax: IsERCToken(
            selectedWallet!.currencyAbbreviation,
            selectedWallet!.chain,
          )
            ? false
            : useSendMax,
          sendMaxInfo: sendMaxInfo,
        });
      })
      .catch(err => {
        const reason = 'simplexSellPaymentRequest Error';
        showSimplexError(err, reason);
        setOpeningBrowser(false);
      });
  };

  const expandCard = (offer: CryptoOffer) => {
    const key = offer.key;
    if (!offer.fiatMoney) {
      return;
    }
    if (offers[key]) {
      offers[key].expanded = offers[key].expanded ? false : true;
    }
    setUpdateView(Math.random());
  };

  const showError = (title: string | undefined, msg: string) => {
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
      if (offers.moonpay.showOffer) {
        getMoonpaySellQuote();
      }
      if (offers.ramp.showOffer) {
        getRampSellQuote();
      }
      if (offers.simplex.showOffer) {
        getSimplexSellQuote();
      }
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedMoonpay, finishedRamp, finishedSimplex, updateView]);

  return (
    <SellCryptoOffersContainer>
      <ScrollView>
        <SummaryRow>
          <SummaryItemContainer>
            <SummaryTitle>{t('Amount')}</SummaryTitle>
            <SummaryData>
              {cloneDeep(amount)
                .toFixed(6)
                .replace(/\.?0+$/, '')}
            </SummaryData>
          </SummaryItemContainer>
          <SummaryItemContainer>
            <SummaryTitle>{t('Crypto')}</SummaryTitle>
            <CoinContainer>
              <CoinIconContainer>
                <CurrencyImage
                  img={selectedWallet.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      selectedWallet.currencyAbbreviation,
                      selectedWallet.chain,
                    ),
                    selectedWallet.chain,
                  )}
                  size={20}
                />
              </CoinIconContainer>
              <SummaryData>{coin.toUpperCase()}</SummaryData>
            </CoinContainer>
          </SummaryItemContainer>
          <SummaryItemContainer>
            <SummaryTitle>{t('Withdrawing Method')}</SummaryTitle>
            <SummaryData>{paymentMethod.label}</SummaryData>
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
        {showArchaxBanner && (
          <SummaryNote>
            <SummaryTitle>Additional third-party fees may apply</SummaryTitle>
          </SummaryNote>
        )}

        {Object.values(offers)
          .sort(
            (a, b) =>
              parseFloat(b.amountReceivingAltFiatCurrency || '0') -
              parseFloat(a.amountReceivingAltFiatCurrency || '0'),
          )
          .map((offer: CryptoOffer, index: number) => {
            return offer.showOffer ? (
              <SellCryptoExpandibleCard
                key={offer.key}
                onPress={() => {
                  expandCard(offer);
                }}>
                {!offer.fiatMoney && !offer.errorMsg && !offer.outOfLimitMsg ? (
                  <SpinnerContainer>
                    <ActivityIndicator color={ProgressBlue} />
                  </SpinnerContainer>
                ) : null}
                {!offer.fiatMoney && offer.outOfLimitMsg ? (
                  <OfferDataContainer>
                    <OfferDataInfoLabel>
                      {offer.outOfLimitMsg}
                    </OfferDataInfoLabel>
                  </OfferDataContainer>
                ) : null}
                {!offer.fiatMoney && offer.errorMsg ? (
                  <OfferDataContainer>
                    <OfferDataInfoLabel>
                      {t('Error: ') + offer.errorMsg}
                    </OfferDataInfoLabel>
                  </OfferDataContainer>
                ) : null}
                <OfferRow>
                  <OfferDataContainer>
                    {offer.fiatMoney &&
                    !offer.errorMsg &&
                    !offer.outOfLimitMsg ? (
                      <>
                        {index === 0 ? (
                          <BestOfferTagContainer>
                            <BestOfferTag>
                              <BestOfferTagText>
                                {t('Our Best Offer')}
                              </BestOfferTagText>
                            </BestOfferTag>
                          </BestOfferTagContainer>
                        ) : null}
                        <OfferDataAmount>
                          {Number(offer.amountReceiving)
                            .toFixed(8)
                            .replace(/\.?0+$/, '')}{' '}
                          {offer.fiatCurrency.toUpperCase()}
                        </OfferDataAmount>
                        {offer.fiatCurrency !== fiatCurrency ? (
                          <OfferDataAmountUsd>
                            {'≈ ' +
                              Number(offer.amountReceivingAltFiatCurrency)
                                .toFixed(8)
                                .replace(/\.?0+$/, '')}{' '}
                            {fiatCurrency}
                          </OfferDataAmountUsd>
                        ) : null}
                        {offer.fiatCurrency !== fiatCurrency ? (
                          <OfferDataWarningContainer>
                            <OfferDataWarningMsg>
                              {t(
                                "This exchange doesn't support sales with , tap 'Sell' to continue paying in .",
                                {
                                  altFiatCurrency: fiatCurrency,
                                  availableFiatCurrency: offer.fiatCurrency,
                                },
                              )}
                            </OfferDataWarningMsg>
                          </OfferDataWarningContainer>
                        ) : null}
                      </>
                    ) : null}
                    <OfferDataInfoContainer testID={offer.key}>
                      <OfferDataInfoLabel>
                        {t('Provided By')}
                      </OfferDataInfoLabel>
                      {offer.logo}
                    </OfferDataInfoContainer>
                  </OfferDataContainer>
                  {offer.fiatMoney ? (
                    <SummaryCtaContainer>
                      <Button
                        action={true}
                        buttonType={'pill'}
                        disabled={openingBrowser}
                        onPress={() => {
                          haptic('impactLight');
                          offer.sellClicked = true;
                          setOpeningBrowser(true);
                          goTo(offer.key);
                        }}>
                        {offer.sellClicked ? (
                          <ActivityIndicator
                            style={{marginBottom: -5}}
                            color={White}
                          />
                        ) : (
                          t('Sell')
                        )}
                      </Button>
                    </SummaryCtaContainer>
                  ) : null}
                </OfferRow>

                {offer.expanded || showArchaxBanner ? (
                  <>
                    <ItemDivisor style={{marginTop: 20}} />
                    <OfferExpandibleItem>
                      <OfferDataInfoLabel>
                        {t('Sell Amount')}
                      </OfferDataInfoLabel>
                      <OfferDataRightContainer>
                        <OfferDataInfoText>
                          {Number(offer.sellAmount).toFixed(6)}{' '}
                          {coin.toUpperCase()}
                        </OfferDataInfoText>
                        <OfferDataInfoTextSec>
                          {formatFiatAmount(
                            Number(offer.amountReceiving) + Number(offer.fee),
                            offer.fiatCurrency,
                          )}
                        </OfferDataInfoTextSec>
                      </OfferDataRightContainer>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <SellBalanceContainer>
                        <OfferDataFeeLabel>
                          {t('Exchange Fee')}
                        </OfferDataFeeLabel>
                        <TouchableOpacity
                          onPress={() => {
                            haptic('impactLight');
                            switch (offer.key) {
                              case 'moonpay':
                                dispatch(
                                  openUrlWithInAppBrowser(
                                    'https://support.moonpay.com/customers/docs/moonpay-fees',
                                  ),
                                );
                                break;
                              case 'ramp':
                                dispatch(
                                  openUrlWithInAppBrowser(
                                    'https://support.ramp.network/en/articles/8957-what-are-the-fees-for-selling-crypto-at-ramp-network',
                                  ),
                                );
                                break;
                              case 'simplex':
                                dispatch(
                                  openUrlWithInAppBrowser(
                                    'https://support.simplex.com/hc/en-gb/articles/360014078420-What-fees-do-you-charge-for-card-payments',
                                  ),
                                );
                                break;
                            }
                          }}
                          style={{marginLeft: 8, marginTop: -3}}>
                          <InfoSvg width={20} height={20} />
                        </TouchableOpacity>
                      </SellBalanceContainer>
                      <OfferDataInfoText>
                        {formatFiatAmount(
                          Number(offer.fee),
                          offer.fiatCurrency,
                        )}
                      </OfferDataInfoText>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <OfferDataInfoTotal>{t('Receiving')}</OfferDataInfoTotal>
                      <OfferDataInfoTotal>
                        {formatFiatAmount(
                          Number(offer.amountReceiving),
                          offer.fiatCurrency,
                          {
                            customPrecision: 'minimal',
                          },
                        )}
                      </OfferDataInfoTotal>
                    </OfferExpandibleItem>
                  </>
                ) : null}
                {showArchaxBanner && (
                  <TermsContainerOffer>
                    <TermsText>
                      {t(
                        'This quote provides an estimated price only. The final cost may vary based on the exact timing when your crypto is exchanged and the type of fiat currency used for withdrawal. Be aware that additional fees from third parties may also apply.',
                      )}
                    </TermsText>
                  </TermsContainerOffer>
                )}
              </SellCryptoExpandibleCard>
            ) : null;
          })}
        {!showArchaxBanner && (
          <TermsContainer>
            <TermsText>
              {t(
                'This quote provides an estimated price only. The final cost may vary based on the exact timing when your crypto is exchanged and the type of fiat currency used for withdrawal. Be aware that additional fees from third parties may also apply.',
              )}
            </TermsText>
          </TermsContainer>
        )}
        {showArchaxBanner && <ArchaxFooter />}
      </ScrollView>

      <Modal
        deviceHeight={HEIGHT}
        deviceWidth={WIDTH}
        backdropTransitionOutTiming={0}
        backdropOpacity={0.85}
        // hideModalContentWhileAnimating={hideModalContentWhileAnimating}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        isVisible={sellModalVisible.open}
        style={{
          margin: 0,
          padding: 0,
        }}>
        <View
          style={{
            flex: 1,
            // backgroundColor: '#f8f8f8',
            justifyContent: 'center',
            overflow: 'scroll',
          }}>
          {/* Close Button */}
          <View
            style={{
              borderTopLeftRadius: 15,
              borderTopRightRadius: 15,
              marginTop: insets.top,
              height: 50,
              backgroundColor: '#f8f8f8',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingHorizontal: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
            }}>
            <TouchableOpacity
              style={{padding: 10}}
              onPress={() => {
                setSellModalVisible({open: false, url: undefined});
              }}>
              <Text style={{fontSize: 24, color: '#333'}}>✕</Text>
            </TouchableOpacity>
          </View>
          <WebView
            style={{
              paddingBottom: insets.bottom + 30,
            }}
            source={{uri: sellModalVisible.url ?? ''}}
            scrollEnabled={true}
            onMessage={(e: WebViewMessageEvent) => {
              handleRampCheckoutMessage(e);
            }}
            originWhitelist={['https://*']}
            automaticallyAdjustContentInsets
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      </Modal>
    </SellCryptoOffersContainer>
  );
};

export default SellCryptoOffers;
