import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
import {RootState} from '../../../../store';
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
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {
  SellCryptoExchangeKey,
  SellCryptoSupportedExchanges,
  getAvailableSellCryptoFiatCurrencies,
  getBaseSellCryptoFiatCurrencies,
  isPaymentMethodSupported,
} from '../utils/sell-crypto-utils';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {PaymentMethod} from '../constants/SellCryptoConstants';
import {useTranslation} from 'react-i18next';
import {
  TermsContainer,
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
import {
  simplexGetSellQuote,
  simplexSellPaymentRequest,
} from '../../../../store/buy-crypto/effects/simplex/simplex';
import {SellCryptoScreens} from '../SellCryptoGroup';

export type SellCryptoOffersScreenParams = {
  amount: number;
  fiatCurrency: string;
  coin: string;
  chain: string;
  country: string;
  selectedWallet: Wallet;
  paymentMethod: PaymentMethod;
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
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountReceivingAltFiatCurrency?: string;
  amountReceivingUnit?: string; // Ramp
  amountLimits?: SellCryptoLimits;
  errorMsg?: string;
  quoteData?: any; // Moonpay | Simplex
  outOfLimitMsg?: string;
};

const SellCryptoOffersContainer = styled.SafeAreaView`
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
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

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
        getAvailableSellCryptoFiatCurrencies(exchange).includes(fiatCurrency)
          ? fiatCurrency
          : getBaseSellCryptoFiatCurrencies(exchange);

      if (
        preSetPartner &&
        SellCryptoSupportedExchanges.includes(preSetPartner)
      ) {
        offersDefault[exchange].showOffer =
          preSetPartner === exchange
            ? isPaymentMethodSupported(
                preSetPartner,
                paymentMethod,
                coin,
                chain,
                offersDefault[preSetPartner].fiatCurrency,
                country,
              ) &&
              (!sellCryptoConfig?.[preSetPartner] ||
                !sellCryptoConfig?.[preSetPartner]?.removed)
            : false;
      } else {
        offersDefault[exchange].showOffer =
          isPaymentMethodSupported(
            exchange,
            paymentMethod,
            coin,
            chain,
            offersDefault[exchange].fiatCurrency,
            country,
          ) &&
          (!sellCryptoConfig?.[exchange] ||
            !sellCryptoConfig?.[exchange]?.removed);
      }
    }
  });

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [finishedMoonpay, setFinishedMoonpay] = useState(false);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);

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

      const requestData: SimplexGetSellQuoteRequestData = {
        env: simplexSellEnv,
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
                offers.simplex.sellAmount / Number(data.fiat_amount), // TODO: review this
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
      quoteCurrencyCode: cloneDeep(fiatCurrency).toLowerCase(),
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
    navigation.goBack(); // TODO: review if use popToTop
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

    const quoteData: SimplexSellPaymentRequestReqData = {
      env: simplexSellEnv,
      referer_url: 'https://bitpay.com/',
      return_url: return_url,
      txn_details: {quote_id: offers.simplex.quoteData.quote_id},
    };

    simplexSellPaymentRequest(quoteData)
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
      if (offers.simplex.showOffer) {
        getSimplexSellQuote();
      }
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedMoonpay, finishedSimplex, updateView]);

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
                                {t('Best Offer')}
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
                              {/* TODO: add translations */}
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

                {offer.expanded ? (
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
                          {customPrecision: 'minimal'},
                        )}
                      </OfferDataInfoTotal>
                    </OfferExpandibleItem>
                  </>
                ) : null}
              </SellCryptoExpandibleCard>
            ) : null;
          })}

        <TermsContainer>
          <TermsText>
            {t(
              'This quote provides an estimated price only. The final cost may vary based on the exact timing when your crypto is exchanged and the type of fiat currency used for withdrawal. Be aware that additional fees from third parties may also apply.',
            )}
          </TermsText>
        </TermsContainer>
      </ScrollView>
    </SellCryptoOffersContainer>
  );
};

export default SellCryptoOffers;
