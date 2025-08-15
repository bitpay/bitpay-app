import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView} from 'react-native';
import uuid from 'react-native-uuid';
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
import BanxaLogo from '../../../../components/icons/external-services/banxa/banxa-logo';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import TransakLogo from '../../../../components/icons/external-services/transak/transak-logo';
import {BuyCryptoExpandibleCard, ItemDivisor} from '../styled/BuyCryptoCard';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  BitPay,
} from '../../../../styles/colors';
import {
  getPaymentUrl,
  simplexPaymentRequest,
  simplexEnv,
  getSimplexCoinFormat,
} from '../utils/simplex-utils';
import {RootState} from '../../../../store';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
import {
  BanxaCreateOrderData,
  BanxaCreateOrderRequestData,
  BanxaGetQuoteRequestData,
  BanxaOrderData,
  BanxaPaymentData,
  BanxaPaymentMethodsData,
  BanxaQuoteData,
  BuyCryptoLimits,
  MoonpayGetCurrencyLimitsRequestData,
  MoonpayGetSignedPaymentUrlData,
  MoonpayGetSignedPaymentUrlReqData,
  MoonpayPaymentData,
  MoonpayPaymentType,
  SardineGetAuthTokenRequestData,
  SardineGetQuoteRequestData,
  SardinePaymentUrlConfigParams,
  SimplexGetQuoteRequestData,
  SimplexPaymentData,
  TransakGetQuoteRequestData,
  TransakGetSignedUrlRequestData,
  TransakPaymentData,
  TransakPaymentType,
  TransakQuoteData,
  TransakSignedUrlData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {
  calculateAltFiatToUsd,
  getBuyCryptoFiatLimits,
} from '../../../../store/buy-crypto/buy-crypto.effects';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME_UPPERCASE,
} from '../../../../constants/config';
import {
  BuyCryptoExchangeKey,
  BuyCryptoSupportedExchanges,
  getAvailableFiatCurrencies,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {PaymentMethod} from '../constants/BuyCryptoConstants';
import {useTranslation} from 'react-i18next';
import {
  banxaEnv,
  getBanxaChainFormat,
  getBanxaCoinFormat,
  getBanxaFiatAmountLimits,
  getBanxaSelectedPaymentMethodData,
} from '../utils/banxa-utils';
import {
  getMoonpayFixedCurrencyAbbreviation,
  getMoonpayPaymentMethodFormat,
  moonpayEnv,
} from '../utils/moonpay-utils';
import {
  getRampDefaultOfferData,
  getRampCoinFormat,
  rampEnv,
  getChainFromRampChainFormat,
  getRampChainFormat,
  getCoinFromRampCoinFormat,
  getRampPaymentMethodDataFromQuoteData,
  getRampPaymentMethodFormat,
} from '../utils/ramp-utils';
import BanxaTerms from '../components/terms/banxaTerms';
import MoonpayTerms from '../components/terms/MoonpayTerms';
import RampTerms from '../components/terms/RampTerms';
import SardineTerms from '../components/terms/SardineTerms';
import SimplexTerms from '../components/terms/SimplexTerms';
import TransakTerms from '../components/terms/TransakTerms';
import {
  TermsContainer,
  TermsContainerOffer,
  TermsText,
} from '../styled/BuyCryptoTerms';
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {AppActions} from '../../../../store/app';
import {banxaGetPaymentMethods} from '../../../../store/buy-crypto/effects/banxa/banxa';
import {moonpayGetCurrencyLimits} from '../../../../store/buy-crypto/effects/moonpay/moonpay';
import {rampGetAssets} from '../../../../store/buy-crypto/effects/ramp/ramp';
import {
  getSardineChainFormat,
  getSardineCoinFormat,
  getSardinePaymentMethodFormat,
  sardineEnv,
} from '../utils/sardine-utils';
import {
  sardineGetCurrencyLimits,
  sardineGetSignedPaymentUrl,
} from '../../../../store/buy-crypto/effects/sardine/sardine';
import {transakGetFiatCurrencies} from '../../../../store/buy-crypto/effects/transak/transak';
import {
  getPassthroughUri,
  getTransakChainFormat,
  getTransakCoinFormat,
  getTransakPaymentMethodFormat,
  getTransakSelectedPaymentMethodData,
  transakEnv,
} from '../utils/transak-utils';
import ArchaxFooter from '../../../../components/archax/archax-footer';
import {
  RampGetAssetsData,
  RampGetAssetsRequestData,
  RampGetSellSignedPaymentUrlData,
  RampPaymentData,
  RampPaymentUrlConfigParams,
  RampQuoteRequestData,
  RampQuoteResultForPaymentMethod,
} from '../../../../store/buy-crypto/models/ramp.models';

export type BuyCryptoOffersScreenParams = {
  amount: number;
  fiatCurrency: string;
  coin: string;
  chain: string;
  country: string;
  selectedWallet: Wallet;
  paymentMethod: PaymentMethod;
  buyCryptoConfig: BuyCryptoConfig | undefined;
  preSetPartner?: BuyCryptoExchangeKey | undefined;
  preLoadPartnersData?: {
    banxa: {
      banxaPreloadPaymentMethods: BanxaPaymentMethodsData | undefined;
    };
  };
};

export type CryptoOffer = {
  key: BuyCryptoExchangeKey;
  showOffer: boolean;
  logo: JSX.Element;
  expanded: boolean;
  buyClicked: boolean;
  fiatCurrency: string;
  fiatAmount: number;
  amountCost?: number;
  buyAmount?: number;
  fee?: number;
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountReceivingUnit?: string; // Ramp
  amountLimits?: BuyCryptoLimits;
  errorMsg?: string;
  quoteData?: any; // Banxa | Moonpay | Ramp | Sardine | Simplex | Transak
  paymentMethodId?: number; // Banxa
  paymentMethodKey?: TransakPaymentType; // Transak
  outOfLimitMsg?: string;
};

const BuyCryptoOffersContainer = styled.SafeAreaView`
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
  padding: 0px 14px;
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

const OfferDataWarningContainer = styled.View`
  max-width: 85%;
  margin-top: 20px;
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
  banxa: CryptoOffer;
  moonpay: CryptoOffer;
  ramp: CryptoOffer;
  sardine: CryptoOffer;
  simplex: CryptoOffer;
  transak: CryptoOffer;
} = {
  banxa: {
    key: 'banxa',
    amountReceiving: '0',
    showOffer: true,
    logo: <BanxaLogo width={70} height={20} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  moonpay: {
    key: 'moonpay',
    amountReceiving: '0',
    showOffer: true,
    logo: <MoonpayLogo widthIcon={25} heightIcon={25} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  ramp: {
    key: 'ramp',
    amountReceiving: '0',
    showOffer: true,
    logo: <RampLogo width={70} height={20} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  sardine: {
    key: 'sardine',
    amountReceiving: '0',
    showOffer: true,
    logo: <SardineLogo width={70} height={20} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  simplex: {
    key: 'simplex',
    amountReceiving: '0',
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
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  transak: {
    key: 'transak',
    amountReceiving: '0',
    showOffer: true,
    logo: <TransakLogo width={80} height={25} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

const BuyCryptoOffers: React.FC = () => {
  const {
    params: {
      amount,
      fiatCurrency,
      coin,
      chain,
      country,
      selectedWallet,
      paymentMethod,
      buyCryptoConfig,
      preSetPartner,
      preLoadPartnersData,
    },
  }: {params: BuyCryptoOffersScreenParams} =
    useRoute<RouteProp<{params: BuyCryptoOffersScreenParams}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  BuyCryptoSupportedExchanges.forEach((exchange: BuyCryptoExchangeKey) => {
    if (offersDefault[exchange]) {
      offersDefault[exchange].fiatCurrency = getAvailableFiatCurrencies(
        exchange,
      ).includes(fiatCurrency)
        ? fiatCurrency
        : 'USD';

      if (
        preSetPartner &&
        BuyCryptoSupportedExchanges.includes(preSetPartner)
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
              (!buyCryptoConfig?.[preSetPartner] ||
                !buyCryptoConfig?.[preSetPartner]?.removed)
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
          (!buyCryptoConfig?.[exchange] ||
            !buyCryptoConfig?.[exchange]?.removed);
      }
    }
  });

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [finishedBanxa, setFinishedBanxa] = useState(false);
  const [finishedMoonpay, setFinishedMoonpay] = useState(false);
  const [finishedRamp, setFinishedRamp] = useState(false);
  const [finishedSardine, setFinishedSardine] = useState(false);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [finishedTransak, setFinishedTransak] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);

  const getBanxaQuote = async (): Promise<void> => {
    logger.debug('Banxa getting quote');

    if (buyCryptoConfig?.banxa?.disabled) {
      let err = buyCryptoConfig?.banxa?.disabledMessage
        ? buyCryptoConfig?.banxa?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'banxaGetQuote Error. Exchange disabled from config.';
      showBanxaError(err, reason);
      return;
    }

    offers.banxa.fiatAmount =
      offers.banxa.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    let banxaPaymentMethods: BanxaPaymentMethodsData;
    try {
      // Banxa getPaymentMethods to validate pairs and get currency limits (banxaGetCurrencyLimits)
      if (preLoadPartnersData?.banxa?.banxaPreloadPaymentMethods) {
        banxaPaymentMethods =
          preLoadPartnersData.banxa.banxaPreloadPaymentMethods;
      } else {
        banxaPaymentMethods = await banxaGetPaymentMethods({
          env: banxaEnv,
          source: offers.banxa.fiatCurrency,
          target: getBanxaCoinFormat(coin),
        });
      }

      if (
        !banxaPaymentMethods?.data?.payment_methods ||
        banxaPaymentMethods.errors
      ) {
        const msg = t(
          'Banxa currently does not support operations with the selected combination crypto(coin)-fiat(fiatCurrency)-paymentMethod(paymentMethod).',
          {
            coin: getBanxaCoinFormat(coin)?.toUpperCase(),
            fiatCurrency: offers.banxa.fiatCurrency.toUpperCase(),
            paymentMethod: paymentMethod.label,
          },
        );
        const reason =
          'banxaGetPaymentMethods Error: No banxaPaymentMethods data';
        showBanxaError(msg, reason);
        setFinishedBanxa(!finishedBanxa);
        return;
      }

      const banxaSelectedPaymentMethodData = getBanxaSelectedPaymentMethodData(
        banxaPaymentMethods.data.payment_methods,
        paymentMethod,
      );

      if (!banxaSelectedPaymentMethodData) {
        const msg = t(
          'Banxa currently does not support operations with the selected combination crypto(coin)-fiat(fiatCurrency)-paymentMethod(paymentMethod).',
          {
            coin: getBanxaCoinFormat(coin)?.toUpperCase(),
            fiatCurrency: offers.banxa.fiatCurrency.toUpperCase(),
            paymentMethod: paymentMethod.label,
          },
        );
        const reason =
          'banxaGetPaymentMethods Error: No banxaSelectedPaymentMethodData';
        showBanxaError(msg, reason);
        setFinishedBanxa(!finishedBanxa);
        return;
      }

      offers.banxa.paymentMethodId = banxaSelectedPaymentMethodData.id;

      const banxaCurrencyLimitsData =
        banxaSelectedPaymentMethodData.transaction_limits.find(
          tx_limit =>
            tx_limit.fiat_code.toUpperCase() ===
            offers.banxa.fiatCurrency.toUpperCase(),
        );

      offers.banxa.amountLimits = {
        min: banxaCurrencyLimitsData
          ? Number(banxaCurrencyLimitsData.min)
          : getBanxaFiatAmountLimits().min,
        max: banxaCurrencyLimitsData
          ? Number(banxaCurrencyLimitsData.max)
          : getBanxaFiatAmountLimits().max,
      };
    } catch (err) {
      logger.debug(
        'Error getting Banxa transaction limits. Setting default values.',
      );
      offers.banxa.amountLimits = dispatch(
        getBuyCryptoFiatLimits('banxa', offers.banxa.fiatCurrency),
      );
    }

    if (
      (offers.banxa.amountLimits?.min &&
        offers.banxa.fiatAmount < offers.banxa.amountLimits.min) ||
      (offers.banxa.amountLimits?.max &&
        offers.banxa.fiatAmount > offers.banxa.amountLimits.max)
    ) {
      offers.banxa.outOfLimitMsg = t(
        'There are no Banxa offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.banxa.amountLimits.min,
          max: offers.banxa.amountLimits.max,
          fiatCurrency: offers.banxa.fiatCurrency,
        },
      );
      setFinishedBanxa(!finishedBanxa);
      return;
    } else {
      const requestData: BanxaGetQuoteRequestData = {
        env: banxaEnv,
        source: offers.banxa.fiatCurrency,
        target: getBanxaCoinFormat(coin),
        source_amount: offers.banxa.fiatAmount,
        payment_method_id: offers.banxa.paymentMethodId,
        account_reference: user?.eid ?? selectedWallet.id,
        blockchain: getBanxaChainFormat(selectedWallet.chain),
      };

      selectedWallet
        .banxaGetQuote(requestData)
        .then((quoteData: BanxaQuoteData) => {
          if (quoteData?.data?.prices?.[0]?.coin_amount) {
            const data = quoteData.data.prices[0];

            offers.banxa.outOfLimitMsg = undefined;
            offers.banxa.errorMsg = undefined;
            offers.banxa.quoteData = data;
            offers.banxa.amountCost = Number(data.fiat_amount);
            offers.banxa.fee =
              Number(data.fee_amount) + Number(data.network_fee);
            offers.banxa.buyAmount = offers.banxa.amountCost - offers.banxa.fee;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.banxa.buyAmount && coin && precision) {
              offers.banxa.fiatMoney = Number(
                offers.banxa.buyAmount / Number(data.coin_amount),
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(`Banxa error: Could not get precision for ${coin}`);
            }
            offers.banxa.amountReceiving = Number(data.coin_amount).toString();
            logger.debug('Banxa getting quote: SUCCESS');
            setFinishedBanxa(!finishedBanxa);
          } else {
            if (quoteData.message && typeof quoteData.message === 'string') {
              logger.error('Banxa error: ' + quoteData.message);
            }
            if (quoteData.error && typeof quoteData.error === 'string') {
              logger.error('Banxa error: ' + quoteData.error);
            }
            if (quoteData.errors) {
              logger.error(JSON.stringify(quoteData.errors));
            }
            let err = t(
              "Can't get rates at this moment. Please try again later",
            );
            const reason = 'banxaGetQuote Error. "coin_amount" not included.';
            showBanxaError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'banxaGetQuote Error';
          showBanxaError(err, reason);
        });
    }
  };

  const showBanxaError = (err?: any, reason?: string) => {
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

    logger.error('Banxa error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'banxa',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.banxa.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.banxa.fiatCurrency || '',
      }),
    );

    offers.banxa.errorMsg = msg;
    offers.banxa.fiatMoney = undefined;
    offers.banxa.expanded = false;
    setUpdateView(Math.random());
  };

  const getMoonpayQuote = async (): Promise<void> => {
    logger.debug('Moonpay getting quote');

    if (buyCryptoConfig?.moonpay?.disabled) {
      let err = buyCryptoConfig?.moonpay?.disabledMessage
        ? buyCryptoConfig?.moonpay?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'moonpayGetQuote Error. Exchange disabled from config.';
      showMoonpayError(err, reason);
      return;
    }

    let _paymentMethod: MoonpayPaymentType | undefined =
      getMoonpayPaymentMethodFormat(paymentMethod.method);

    if (_paymentMethod === 'sepa_bank_transfer') {
      // Moonpay only accepts EUR as a base currency for SEPA payments
      offers.moonpay.fiatCurrency = 'EUR';
    }

    offers.moonpay.fiatAmount =
      offers.moonpay.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    const currencyLimitsrequestData: MoonpayGetCurrencyLimitsRequestData = {
      currencyAbbreviation: getMoonpayFixedCurrencyAbbreviation(
        coin.toLowerCase(),
        selectedWallet.chain,
      ),
      baseCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      paymentMethod: _paymentMethod,
      areFeesIncluded: true,
      env: moonpayEnv,
    };

    try {
      const moonpayCurrencyLimitsData = await moonpayGetCurrencyLimits(
        currencyLimitsrequestData,
      );
      offers.moonpay.amountLimits = {
        min: moonpayCurrencyLimitsData.baseCurrency.minBuyAmount,
        max: moonpayCurrencyLimitsData.baseCurrency.maxBuyAmount,
      };

      if (
        (offers.moonpay.amountLimits.min &&
          offers.moonpay.fiatAmount < offers.moonpay.amountLimits.min) ||
        (offers.moonpay.amountLimits.max &&
          offers.moonpay.fiatAmount > offers.moonpay.amountLimits.max)
      ) {
        offers.moonpay.outOfLimitMsg = t(
          'There are no Moonpay offers available, as the current purchase limits for this exchange must be between and',
          {
            min: offers.moonpay.amountLimits.min,
            max: offers.moonpay.amountLimits.max,
            fiatCurrency: offers.moonpay.fiatCurrency,
          },
        );
        setFinishedMoonpay(!finishedMoonpay);
        return;
      }
    } catch (err) {
      logger.warn(
        `It was not possible to get currency limits for Moonpay with the following values: ${JSON.stringify(
          currencyLimitsrequestData,
        )}`,
      );
    }

    const requestData = {
      currencyAbbreviation: getMoonpayFixedCurrencyAbbreviation(
        coin.toLowerCase(),
        selectedWallet.chain,
      ),
      baseCurrencyAmount: offers.moonpay.fiatAmount,
      // extraFeePercentage: 0, // min: 0 max: 10. If not provided, will use the default value set to our account.
      baseCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      paymentMethod: _paymentMethod,
      areFeesIncluded: true,
      env: moonpayEnv,
    };

    selectedWallet
      .moonpayGetQuote(requestData)
      .then(data => {
        if (data?.baseCurrencyAmount) {
          offers.moonpay.amountLimits = {
            min: data.baseCurrency.minBuyAmount,
            max: data.baseCurrency.maxBuyAmount,
          };

          if (
            (offers.moonpay.amountLimits.min &&
              offers.moonpay.fiatAmount < offers.moonpay.amountLimits.min) ||
            (offers.moonpay.amountLimits.max &&
              offers.moonpay.fiatAmount > offers.moonpay.amountLimits.max)
          ) {
            offers.moonpay.outOfLimitMsg = t(
              'There are no Moonpay offers available, as the current purchase limits for this exchange must be between and',
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
            offers.moonpay.amountCost = data.totalAmount;
            offers.moonpay.buyAmount = data.baseCurrencyAmount;
            offers.moonpay.fee =
              Number(data.totalAmount) - Number(data.baseCurrencyAmount);

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.moonpay.buyAmount && coin && precision) {
              offers.moonpay.fiatMoney = Number(
                offers.moonpay.buyAmount / data.quoteCurrencyAmount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Moonpay error: Could not get precision for ${coin}`,
              );
            }
            offers.moonpay.amountReceiving =
              data.quoteCurrencyAmount.toString();
            logger.debug('Moonpay getting quote: SUCCESS');
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
          const reason = 'moonpayGetQuote Error. Necessary data not included.';
          showMoonpayError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'moonpayGetQuote Error';
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
      Analytics.track('Failed Buy Crypto', {
        exchange: 'moonpay',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.moonpay.fiatAmount) || '',
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

  const getRampQuote = async (): Promise<void> => {
    logger.debug('Ramp getting quote');

    if (buyCryptoConfig?.ramp?.disabled) {
      let err = buyCryptoConfig?.ramp?.disabledMessage
        ? buyCryptoConfig?.ramp?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'rampGetQuote Error. Exchange disabled from config.';
      showRampError(err, reason);
      return;
    }

    switch (paymentMethod.method) {
      case 'pix':
        // Ramp only accepts BRL as a base currency for Pix payments
        offers.ramp.fiatCurrency = 'BRL';
        break;
      case 'pisp':
        // Ramp only accepts EUR | GBP as a base currency for PISP payments
        offers.ramp.fiatCurrency = 'EUR';
        break;
      default:
        break;
    }

    offers.ramp.fiatAmount =
      offers.ramp.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    const getAssetsRequestData: RampGetAssetsRequestData = {
      env: rampEnv,
      currencyCode: offers.ramp.fiatCurrency.toUpperCase(),
      withDisabled: false,
      withHidden: false,
      useIp: true,
    };

    let assetsData: RampGetAssetsData | undefined;

    try {
      assetsData = await rampGetAssets(getAssetsRequestData);
      if (assetsData && assetsData.assets?.length > 0) {
        const selectedAssetData = assetsData.assets.filter(asset => {
          return (
            getRampCoinFormat(
              getCoinFromRampCoinFormat(asset.symbol),
              getChainFromRampChainFormat(asset.chain),
            ) === getRampCoinFormat(coin, chain)
          );
        });

        if (selectedAssetData.length === 0) {
          const err = t(
            'The selected coin is not available in your region for purchases through Ramp at the moment.',
          );
          const reason =
            "rampGetQuote Error. Coin not available in the user's region";
          showRampError(err, reason);
          return;
        }
      }
    } catch (err) {
      logger.warn(
        'Ramp warning: Could not get assets data from Ramp. Continue anyways',
      );
    }

    try {
      const requestData = {
        cryptoAssetSymbol: getRampCoinFormat(coin, getRampChainFormat(chain)),
        fiatValue: offers.ramp.fiatAmount,
        fiatCurrency: offers.ramp.fiatCurrency.toUpperCase(),
        env: rampEnv,
      };

      const data: RampQuoteRequestData = await selectedWallet.rampGetQuote(
        requestData,
      );

      let paymentMethodData: RampQuoteResultForPaymentMethod | undefined;
      if (data?.asset) {
        paymentMethodData = getRampPaymentMethodDataFromQuoteData(
          paymentMethod.method,
          data,
        );

        if (!paymentMethodData?.fiatValue) {
          logger.error('rampGetQuote Error: No fiat value provided from Ramp');
          const reason = 'rampGetQuote Error. No fiat value provided from Ramp';
          showRampError(undefined, reason);
          return;
        }

        offers.ramp.amountLimits = {
          min:
            data.asset.minPurchaseAmount < 0
              ? dispatch(
                  getBuyCryptoFiatLimits('ramp', offers.ramp.fiatCurrency),
                ).min
              : data.asset.minPurchaseAmount,
          max:
            data.asset.maxPurchaseAmount < 0
              ? assetsData?.maxPurchaseAmount
                ? assetsData.maxPurchaseAmount
                : dispatch(
                    getBuyCryptoFiatLimits('ramp', offers.ramp.fiatCurrency),
                  ).max
              : data.asset.maxPurchaseAmount,
        };

        if (
          (offers.ramp.amountLimits.min &&
            offers.ramp.fiatAmount < offers.ramp.amountLimits.min) ||
          (offers.ramp.amountLimits.max &&
            offers.ramp.fiatAmount > offers.ramp.amountLimits.max)
        ) {
          offers.ramp.outOfLimitMsg = t(
            'There are no Ramp offers available, as the current purchase limits for this exchange must be between and',
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
          offers.ramp.amountCost = paymentMethodData.fiatValue;
          offers.ramp.buyAmount =
            Number(paymentMethodData.fiatValue) -
            Number(paymentMethodData.appliedFee);
          offers.ramp.fee = Number(paymentMethodData.appliedFee);

          const precision = dispatch(
            GetPrecision(coin, chain, selectedWallet.tokenAddress),
          );
          let decimals: number | undefined;

          if (data.asset.decimals && data.asset.decimals > 0) {
            decimals = data.asset.decimals;
          } else if (precision?.unitDecimals) {
            decimals = precision.unitDecimals;
          } else {
            logger.error(`Ramp error: Could not get precision for ${coin}`);

            const reason = 'rampGetQuote Error. Could not get decimals';
            showRampError(undefined, reason);
            return;
          }

          offers.ramp.amountReceivingUnit = paymentMethodData.cryptoAmount;
          const amountReceivingNum =
            Number(paymentMethodData.cryptoAmount) / 10 ** decimals;
          offers.ramp.amountReceiving = amountReceivingNum.toFixed(8);

          if (
            offers.ramp.buyAmount &&
            Number(paymentMethodData.cryptoAmount) > 0 &&
            coin &&
            precision
          ) {
            offers.ramp.fiatMoney = Number(
              offers.ramp.buyAmount / amountReceivingNum,
            ).toFixed(precision.unitDecimals);
          } else {
            logger.error(`Ramp error: Could not get precision for ${coin}`);
          }

          logger.debug('Ramp getting quote: SUCCESS');
          setFinishedRamp(!finishedRamp);
        }
      } else {
        if (!data) {
          logger.error('Ramp error: No data received');
        }

        let err = t("Can't get rates at this moment. Please try again later");
        const reason = 'rampGetQuote Error. Necessary data not included.';
        showRampError(err, reason);
      }
    } catch (err) {
      const reason = 'rampGetQuote Error';
      showRampError(err, reason);
    }
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
      Analytics.track('Failed Buy Crypto', {
        exchange: 'ramp',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.ramp.fiatAmount) || '',
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

  const getSardineQuote = async (): Promise<void> => {
    logger.debug('Sardine getting quote');

    if (buyCryptoConfig?.sardine?.disabled) {
      let err = buyCryptoConfig?.sardine?.disabledMessage
        ? buyCryptoConfig?.sardine?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'sardineGetQuote Error. Exchange disabled from config.';
      showSardineError(err, reason);
      return;
    }

    offers.sardine.fiatAmount =
      offers.sardine.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    try {
      const sardineCurrencyLimitsData = await sardineGetCurrencyLimits(
        offers.sardine.fiatCurrency,
        getSardinePaymentMethodFormat(paymentMethod.method, country),
      );

      offers.sardine.amountLimits = {
        min: sardineCurrencyLimitsData.minAmount,
        max: sardineCurrencyLimitsData.maxAmount,
      };
    } catch (err) {
      offers.sardine.amountLimits = dispatch(
        getBuyCryptoFiatLimits('sardine', offers.sardine.fiatCurrency),
      );
    }

    if (
      (offers.sardine.amountLimits?.min &&
        offers.sardine.fiatAmount < offers.sardine.amountLimits.min) ||
      (offers.sardine.amountLimits?.max &&
        offers.sardine.fiatAmount > offers.sardine.amountLimits.max)
    ) {
      offers.sardine.outOfLimitMsg = t(
        'There are no Sardine offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.sardine.amountLimits.min,
          max: offers.sardine.amountLimits.max,
          fiatCurrency: offers.sardine.fiatCurrency,
        },
      );
      setFinishedSardine(!finishedSardine);
      return;
    } else {
      const requestData: SardineGetQuoteRequestData = {
        env: sardineEnv,
        asset_type: getSardineCoinFormat(coin),
        network: getSardineChainFormat(selectedWallet.chain) ?? '',
        total: offers.sardine.fiatAmount.toString(),
        currency: offers.sardine.fiatCurrency.toUpperCase(),
        paymentType:
          getSardinePaymentMethodFormat(paymentMethod.method, country) ??
          'debit',
        quote_type: 'buy',
      };

      selectedWallet
        .sardineGetQuote(requestData)
        .then((data: any) => {
          if (data && data.quantity) {
            offers.sardine.outOfLimitMsg = undefined;
            offers.sardine.errorMsg = undefined;
            offers.sardine.quoteData = data;
            offers.sardine.amountCost = data.total;
            offers.sardine.buyAmount = data.subtotal;
            offers.sardine.fee = data.total - data.subtotal;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.sardine.buyAmount && coin && precision) {
              offers.sardine.fiatMoney = Number(
                offers.sardine.buyAmount / data.quantity,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Sardine error: Could not get precision for ${coin}`,
              );
            }
            offers.sardine.amountReceiving = data.quantity.toString();
            logger.debug('Sardine getting quote: SUCCESS');
            setFinishedSardine(!finishedSardine);
          } else {
            if (data.message && typeof data.message === 'string') {
              logger.error('Sardine error: ' + data.message);
            }
            if (data.error && typeof data.error === 'string') {
              logger.error('Sardine error: ' + data.error);
            }
            if (data.errors) {
              logger.error(data.errors);
            }
            let err = t(
              "Can't get rates at this moment. Please try again later",
            );
            const reason = 'sardineGetQuote Error. "quantity" not included.';
            showSardineError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'sardineGetQuote Error';
          showSardineError(err, reason);
        });
    }
  };

  const showSardineError = (err?: any, reason?: string) => {
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

    logger.error('Sardine error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'sardine',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.sardine.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.sardine.fiatCurrency || '',
      }),
    );

    offers.sardine.errorMsg = msg;
    offers.sardine.fiatMoney = undefined;
    offers.sardine.expanded = false;
    setUpdateView(Math.random());
  };

  const getSimplexQuote = (): void => {
    logger.debug('Simplex getting quote');

    if (buyCryptoConfig?.simplex?.disabled) {
      let err = buyCryptoConfig?.simplex?.disabledMessage
        ? buyCryptoConfig?.simplex?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'simplexGetQuote Error. Exchange disabled from config.';
      showSimplexError(err, reason);
      return;
    }

    offers.simplex.fiatAmount =
      offers.simplex.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    offers.simplex.amountLimits = dispatch(
      getBuyCryptoFiatLimits('simplex', offers.simplex.fiatCurrency),
    );

    if (
      (offers.simplex.amountLimits?.min &&
        offers.simplex.fiatAmount < offers.simplex.amountLimits.min) ||
      (offers.simplex.amountLimits?.max &&
        offers.simplex.fiatAmount > offers.simplex.amountLimits.max)
    ) {
      offers.simplex.outOfLimitMsg = t(
        'There are no Simplex offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.simplex.amountLimits.min,
          max: offers.simplex.amountLimits.max,
          fiatCurrency: offers.simplex.fiatCurrency,
        },
      );
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      let paymentMethodArray: string[] = [];
      switch (paymentMethod.method) {
        case 'sepaBankTransfer':
          paymentMethodArray.push('sepa_open_banking');
          break;
        case 'applePay':
        case 'debitCard':
        case 'creditCard':
          paymentMethodArray.push('credit_card');
          break;
      }

      const requestData: SimplexGetQuoteRequestData = {
        digital_currency: getSimplexCoinFormat(coin, selectedWallet.chain),
        fiat_currency: offers.simplex.fiatCurrency.toUpperCase(),
        requested_currency: offers.simplex.fiatCurrency.toUpperCase(),
        requested_amount: offers.simplex.fiatAmount,
        end_user_id: selectedWallet.id,
        env: simplexEnv,
      };

      if (paymentMethodArray.length > 0) {
        requestData.payment_methods = paymentMethodArray;
      }
      selectedWallet
        .simplexGetQuote(requestData)
        .then(data => {
          if (data && data.quote_id) {
            offers.simplex.outOfLimitMsg = undefined;
            offers.simplex.errorMsg = undefined;
            offers.simplex.quoteData = data;
            offers.simplex.amountCost = data.fiat_money.total_amount;
            offers.simplex.buyAmount = data.fiat_money.base_amount;
            offers.simplex.fee =
              data.fiat_money.total_amount - data.fiat_money.base_amount;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.simplex.buyAmount && coin && precision) {
              offers.simplex.fiatMoney = Number(
                offers.simplex.buyAmount / data.digital_money.amount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Simplex error: Could not get precision for ${coin}`,
              );
            }
            offers.simplex.amountReceiving =
              data.digital_money.amount.toString();
            logger.debug('Simplex getting quote: SUCCESS');
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
            const reason = 'simplexGetQuote Error. "quote_id" not included.';
            showSimplexError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'simplexGetQuote Error';
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
      Analytics.track('Failed Buy Crypto', {
        exchange: 'simplex',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.simplex.fiatAmount) || '',
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

  const getTransakQuote = async (): Promise<void> => {
    logger.debug('Transak getting quote');

    if (buyCryptoConfig?.transak?.disabled) {
      let err = buyCryptoConfig?.transak?.disabledMessage
        ? buyCryptoConfig?.transak?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'transakGetQuote Error. Exchange disabled from config.';
      showTransakError(err, reason);
      return;
    }

    offers.transak.fiatAmount =
      offers.transak.fiatCurrency === fiatCurrency
        ? amount
        : dispatch(calculateAltFiatToUsd(amount, fiatCurrency)) || amount;

    try {
      // Transak getFiatCurrencies to validate pairs and get currency limits (transakGetCurrencyLimits)
      const transakFiatCurrenciesData = await transakGetFiatCurrencies({
        env: transakEnv,
      });

      const transakSelectedPaymentMethodData =
        getTransakSelectedPaymentMethodData(
          transakFiatCurrenciesData.response,
          offers.transak.fiatCurrency,
          paymentMethod,
        );

      if (!transakSelectedPaymentMethodData) {
        const msg = t(
          'Transak currently does not support operations with the selected combination fiat(fiatCurrency)-paymentMethod(paymentMethod).',
          {
            fiatCurrency: offers.transak.fiatCurrency.toUpperCase(),
            paymentMethod: paymentMethod.label,
          },
        );
        const reason =
          'transakGetPaymentMethods Error: No transakSelectedPaymentMethodData';
        showTransakError(msg, reason);
        setFinishedTransak(!finishedTransak);
        return;
      }

      offers.transak.paymentMethodKey = transakSelectedPaymentMethodData.id;
      offers.transak.amountLimits = {
        min: transakSelectedPaymentMethodData.minAmount,
        max: transakSelectedPaymentMethodData.maxAmount,
      };
    } catch (err) {
      offers.transak.amountLimits = dispatch(
        getBuyCryptoFiatLimits('transak', offers.transak.fiatCurrency),
      );
    }

    if (
      (offers.transak.amountLimits.min &&
        offers.transak.fiatAmount < offers.transak.amountLimits.min) ||
      (offers.transak.amountLimits.max &&
        offers.transak.fiatAmount > offers.transak.amountLimits.max)
    ) {
      offers.transak.outOfLimitMsg = t(
        'There are no Transak offers available, as the current purchase limits for this exchange must be between and',
        {
          min: offers.transak.amountLimits.min,
          max: offers.transak.amountLimits.max,
          fiatCurrency: offers.transak.fiatCurrency,
        },
      );
      setFinishedTransak(!finishedTransak);
      return;
    } else {
      const requestData: TransakGetQuoteRequestData = {
        env: transakEnv,
        fiatCurrency: offers.transak.fiatCurrency.toUpperCase(),
        cryptoCurrency: getTransakCoinFormat(coin),
        network: getTransakChainFormat(selectedWallet.chain) ?? 'mainnet', // TODO: review 'mainnet'
        paymentMethod:
          offers.transak.paymentMethodKey ??
          getTransakPaymentMethodFormat(paymentMethod.method) ??
          'credit_debit_card',
        fiatAmount: offers.transak.fiatAmount,
      };

      selectedWallet
        .transakGetQuote(requestData)
        .then((data: TransakQuoteData) => {
          if (data?.response?.cryptoAmount) {
            const transakQuoteData = data.response;
            offers.transak.outOfLimitMsg = undefined;
            offers.transak.errorMsg = undefined;
            offers.transak.quoteData = transakQuoteData;
            offers.transak.amountCost = transakQuoteData.fiatAmount;
            offers.transak.fee = transakQuoteData.totalFee;
            offers.transak.buyAmount =
              transakQuoteData.fiatAmount - transakQuoteData.totalFee;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (offers.transak.buyAmount && coin && precision) {
              offers.transak.fiatMoney = Number(
                offers.transak.buyAmount / transakQuoteData.cryptoAmount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Transak error: Could not get precision for ${coin}`,
              );
            }
            offers.transak.amountReceiving =
              transakQuoteData.cryptoAmount.toString();
            logger.debug('Transak getting quote: SUCCESS');
            setFinishedTransak(!finishedTransak);
          } else {
            let err;
            if (data.message && typeof data.message === 'string') {
              logger.error('Transak error: ' + data.message);
            }
            if (data.error && typeof data.error === 'string') {
              logger.error('Transak error: ' + data.error);
            }
            if (data.errors) {
              logger.error(data.errors);
            }
            if (data.error?.message && typeof data.error.message === 'string') {
              logger.error('Transak error: ' + data.error.message);
              if (
                data.error.message
                  .toLowerCase()
                  .includes('invalid cryptocurrency')
              ) {
                err = t(
                  'Transak has temporarily discontinued operations with the selected crypto currency.',
                );
              } else if (
                data.error.message
                  .toLowerCase()
                  .includes('temporarily suspended')
              ) {
                err = data.error.message;
              }
            }
            err =
              err ??
              t("Can't get rates at this moment. Please try again later");
            const reason =
              'transakGetQuote Error. "cryptoAmount" not included.';
            showTransakError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'transakGetQuote Error';
          showTransakError(err, reason);
        });
    }
  };

  const showTransakError = (err?: any, reason?: string) => {
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

    logger.error('Transak error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'transak',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod.method || '',
        amount: Number(offers.transak.fiatAmount) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: offers.transak.fiatCurrency || '',
      }),
    );

    offers.transak.errorMsg = msg;
    offers.transak.fiatMoney = undefined;
    offers.transak.expanded = false;
    setUpdateView(Math.random());
  };

  const goTo = (key: string): void => {
    switch (key) {
      case 'banxa':
        goToBanxaBuyPage();
        break;

      case 'moonpay':
        goToMoonpayBuyPage();
        break;

      case 'ramp':
        goToRampBuyPage();
        break;

      case 'sardine':
        goToSardineBuyPage();
        break;

      case 'simplex':
        goToSimplexBuyPage();
        break;

      case 'transak':
        goToTransakBuyPage();
        break;
    }
  };

  const goToBanxaBuyPage = () => {
    if (offers.banxa.errorMsg || offers.banxa.outOfLimitMsg) {
      return;
    }
    continueToBanxa();
  };

  const continueToBanxa = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showBanxaError(err, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const banxaExternalId = uuid.v4().toString();

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'banxa',
        fiatAmount: offers.banxa.fiatAmount,
        fiatCurrency: offers.banxa.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const quoteData: BanxaCreateOrderRequestData = {
      env: banxaEnv,
      account_reference: user?.eid ?? selectedWallet.id,
      payment_method_id: offers.banxa.paymentMethodId,
      source: offers.banxa.fiatCurrency,
      source_amount: cloneDeep(offers.banxa.fiatAmount).toString(),
      target: getBanxaCoinFormat(coin),
      wallet_address: address,
      blockchain: getBanxaChainFormat(selectedWallet.chain),
      return_url_on_success: `${APP_DEEPLINK_PREFIX}banxa?externalId=${banxaExternalId}&status=pending`,
      return_url_on_cancelled: `${APP_DEEPLINK_PREFIX}banxaCancelled?externalId=${banxaExternalId}&status=cancelled`,
      return_url_on_failure: `${APP_DEEPLINK_PREFIX}banxaFailed?externalId=${banxaExternalId}&status=failed`,
    };

    let data: BanxaCreateOrderData, banxaOrderData: BanxaOrderData;
    try {
      data = await selectedWallet.banxaCreateOrder(quoteData);
    } catch (err) {
      const reason = 'banxaCreateOrder Error';
      showBanxaError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    if (data?.data?.order?.checkout_url && data?.data?.order?.id) {
      banxaOrderData = data.data.order;
    } else {
      const reason =
        'banxaCreateOrder Error: No checkout_url or id value provided from Banxa';
      logger.error(reason);
      showBanxaError(undefined, reason);
      setOpeningBrowser(false);
      return;
    }

    const newData: BanxaPaymentData = {
      address,
      created_on: Date.now(),
      crypto_amount: Number(offers.banxa.amountReceiving),
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offers.banxa.buyAmount!,
      fiat_total_amount: offers.banxa.amountCost!,
      fiat_total_amount_currency: offers.banxa.fiatCurrency,
      order_id: banxaOrderData.id,
      external_id: banxaExternalId,
      status: 'paymentRequestSent',
      user_id: selectedWallet.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestBanxa({
        banxaPaymentData: newData,
      }),
    );

    dispatch(openUrlWithInAppBrowser(banxaOrderData.checkout_url));
    await sleep(500);
    navigation.goBack();
  };

  const goToMoonpayBuyPage = () => {
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
      const reason = 'createWalletAddress Error';
      showMoonpayError(err, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const externalTransactionId = `${selectedWallet.id}-${Date.now()}`;

    const newData: MoonpayPaymentData = {
      address,
      created_on: Date.now(),
      crypto_amount: Number(offers.moonpay.amountReceiving),
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offers.moonpay.buyAmount!,
      fiat_total_amount: offers.moonpay.amountCost!,
      fiat_total_amount_currency: offers.moonpay.fiatCurrency,
      external_id: externalTransactionId,
      status: 'paymentRequestSent',
      user_id: selectedWallet.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestMoonpay({
        moonpayPaymentData: newData,
      }),
    );

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'moonpay',
        fiatAmount: offers.moonpay.fiatAmount,
        fiatCurrency: offers.moonpay.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const quoteData: MoonpayGetSignedPaymentUrlReqData = {
      currencyCode: getMoonpayFixedCurrencyAbbreviation(
        coin.toLowerCase(),
        destinationChain,
      ),
      walletAddress: address,
      baseCurrencyCode: offers.moonpay.fiatCurrency.toLowerCase(),
      baseCurrencyAmount: offers.moonpay.fiatAmount,
      externalTransactionId,
      redirectURL:
        APP_DEEPLINK_PREFIX + `moonpay?externalId=${externalTransactionId}`,
      env: moonpayEnv,
      lockAmount: true,
      showWalletAddressForm: false,
    };

    let _paymentMethod: MoonpayPaymentType | undefined =
      getMoonpayPaymentMethodFormat(paymentMethod.method);
    if (_paymentMethod) {
      quoteData.paymentMethod = _paymentMethod;
    }

    let data: MoonpayGetSignedPaymentUrlData;
    try {
      data = (await selectedWallet.moonpayGetSignedPaymentUrl(
        quoteData,
      )) as MoonpayGetSignedPaymentUrlData;
    } catch (err) {
      const reason = 'moonpayGetSignedPaymentUrl Error';
      showMoonpayError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.goBack();
  };

  const goToRampBuyPage = () => {
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
      const reason = 'createWalletAddress Error';
      showRampError(err, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const rampExternalId = uuid.v4().toString();

    const newData: RampPaymentData = {
      address,
      chain: destinationChain,
      created_on: Date.now(),
      crypto_amount: Number(offers.ramp.amountReceiving),
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offers.ramp.buyAmount!,
      fiat_total_amount: offers.ramp.amountCost!,
      fiat_total_amount_currency: offers.ramp.fiatCurrency,
      external_id: rampExternalId,
      status: 'paymentRequestSent',
      user_id: selectedWallet.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestRamp({
        rampPaymentData: newData,
      }),
    );

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'ramp',
        fiatAmount: offers.ramp.fiatAmount,
        fiatCurrency: offers.ramp.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const redirectUrl =
      APP_DEEPLINK_PREFIX +
      'ramp?rampExternalId=' +
      rampExternalId +
      '&walletId=' +
      selectedWallet.id +
      '&status=pending';

    const quoteData: RampPaymentUrlConfigParams = {
      env: rampEnv,
      hostLogoUrl: 'https://bitpay.com/_nuxt/img/bitpay-logo-blue.1c0494b.svg',
      hostAppName: APP_NAME_UPPERCASE,
      swapAsset: getRampCoinFormat(coin, getRampChainFormat(chain)),
      swapAmount: offers.ramp.amountReceivingUnit!,
      fiatCurrency: offers.ramp.fiatCurrency,
      enabledFlows: ['ONRAMP'],
      defaultFlow: 'ONRAMP',
      userAddress: address,
      selectedCountryCode: country,
      defaultAsset: getRampCoinFormat(coin, getRampChainFormat(chain)),
      finalUrl: redirectUrl,
      paymentMethodType: getRampPaymentMethodFormat(paymentMethod.method),
    };

    let data: RampGetSellSignedPaymentUrlData;
    try {
      data = await selectedWallet.rampGetSignedPaymentUrl(quoteData);
    } catch (err) {
      const reason = 'rampGetSignedPaymentUrl Error';
      showRampError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    if (!data || !data.urlWithSignature) {
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      const reason =
        'rampGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showRampError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.goBack();
  };

  const goToSardineBuyPage = () => {
    if (offers.sardine.errorMsg || offers.sardine.outOfLimitMsg) {
      return;
    }
    continueToSardine();
  };

  const continueToSardine = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showSardineError(err, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const sardineExternalId = uuid.v4().toString();

    let authTokenData;
    try {
      const quoteData: SardineGetAuthTokenRequestData = {
        env: sardineEnv,
        referenceId: sardineExternalId,
        externalUserId: selectedWallet.id,
        customerId: 'app',
        paymentMethodTypeConfig: {
          default:
            getSardinePaymentMethodFormat(paymentMethod.method, country) ??
            'debit',
          enabled: ['ach', 'apple_pay', 'card', 'sepa'],
        },
      };
      authTokenData = await selectedWallet.sardineGetToken(quoteData);
    } catch (err) {
      const reason = 'sardineGetAuthToken Error';
      showSardineError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'sardine',
        fiatAmount: offers.sardine.fiatAmount,
        fiatCurrency: offers.sardine.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const redirectUrl =
      APP_DEEPLINK_PREFIX +
      'sardine?sardineExternalId=' +
      sardineExternalId +
      '&walletId=' +
      selectedWallet.id +
      '&status=pending' +
      '&address=' +
      address +
      '&chain=' +
      destinationChain +
      '&createdOn=' +
      Date.now() +
      '&cryptoAmount=' +
      Number(offers.sardine.amountReceiving) +
      '&coin=' +
      coin.toUpperCase() +
      '&env=' +
      (__DEV__ ? 'dev' : 'prod') +
      '&fiatBaseAmount=' +
      offers.sardine.buyAmount +
      '&fiatTotalAmount=' +
      offers.sardine.amountCost +
      '&fiatTotalAmountCurrency=' +
      offers.sardine.fiatCurrency;

    const quoteData: SardinePaymentUrlConfigParams = {
      env: sardineEnv,
      client_token: authTokenData.clientToken,
      address,
      redirect_url: redirectUrl,
      fixed_fiat_amount: offers.sardine.fiatAmount,
      fixed_fiat_currency: offers.sardine.fiatCurrency,
      fixed_asset_type: getSardineCoinFormat(coin),
      fixed_network: getSardineChainFormat(chain),
      supported_tokens: [
        {
          token: getSardineCoinFormat(coin),
          network: getSardineChainFormat(chain) || '',
        },
      ],
    };

    let checkoutUrl: string;
    try {
      checkoutUrl = await sardineGetSignedPaymentUrl(quoteData);
    } catch (err) {
      const reason = 'sardineGetSignedPaymentUrl Error';
      showSardineError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    if (!checkoutUrl) {
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      const reason =
        'sardineGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showSardineError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    dispatch(openUrlWithInAppBrowser(checkoutUrl));
    await sleep(500);
    navigation.goBack();
  };

  const goToSimplexBuyPage = () => {
    if (offers.simplex.errorMsg || offers.simplex.outOfLimitMsg) {
      return;
    }
    continueToSimplex();
  };

  const continueToSimplex = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showSimplexError(err, reason);
      return;
    }

    const quoteData = {
      quoteId: offers.simplex.quoteData.quote_id,
      currency: offers.simplex.fiatCurrency,
      fiatTotalAmount: offers.simplex.quoteData.fiat_money.total_amount,
      cryptoAmount: offers.simplex.quoteData.digital_money.amount,
    };

    simplexPaymentRequest(selectedWallet, address, quoteData, createdOn)
      .then(async req => {
        if (req && req.error) {
          const reason = 'simplexPaymentRequest Error';
          showSimplexError(req.error, reason);
          setOpeningBrowser(false);
          return;
        }

        logger.debug('Simplex creating payment request: SUCCESS');

        const remoteData: any = {
          address,
          api_host: req.api_host,
          app_provider_id: req.app_provider_id,
          order_id: req.order_id,
          payment_id: req.payment_id,
        };

        const destinationChain = selectedWallet.chain;

        const newData: SimplexPaymentData = {
          address,
          created_on: Date.now(),
          crypto_amount: offers.simplex.quoteData.digital_money.amount,
          chain: destinationChain,
          coin: coin.toUpperCase(),
          env: __DEV__ ? 'dev' : 'prod',
          fiat_base_amount: offers.simplex.quoteData.fiat_money.base_amount,
          fiat_total_amount: offers.simplex.quoteData.fiat_money.total_amount,
          fiat_total_amount_currency: offers.simplex.fiatCurrency,
          order_id: req.order_id,
          payment_id: req.payment_id,
          status: 'paymentRequestSent',
          user_id: selectedWallet.id,
        };

        dispatch(
          BuyCryptoActions.successPaymentRequestSimplex({
            simplexPaymentData: newData,
          }),
        );

        dispatch(
          Analytics.track('Requested Crypto Purchase', {
            exchange: 'simplex',
            fiatAmount: offers.simplex.fiatAmount,
            fiatCurrency: offers.simplex.fiatCurrency,
            paymentMethod: paymentMethod.method,
            coin: selectedWallet.currencyAbbreviation.toLowerCase(),
            chain: destinationChain?.toLowerCase(),
          }),
        );

        const paymentUrl: string = getPaymentUrl(
          selectedWallet,
          quoteData,
          remoteData,
          destinationChain,
        );

        dispatch(openUrlWithInAppBrowser(paymentUrl));
        await sleep(500);
        navigation.goBack();
      })
      .catch(err => {
        const reason = 'simplexPaymentRequest Error';
        showSimplexError(err, reason);
        setOpeningBrowser(false);
      });
  };

  const goToTransakBuyPage = () => {
    if (offers.transak.errorMsg || offers.transak.outOfLimitMsg) {
      return;
    }
    continueToTransak();
  };

  const continueToTransak = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      showTransakError(err, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const transakExternalId = uuid.v4().toString();

    const newData: TransakPaymentData = {
      address,
      chain: destinationChain,
      created_on: Date.now(),
      crypto_amount: Number(offers.transak.amountReceiving),
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offers.transak.buyAmount!,
      fiat_total_amount: offers.transak.amountCost!,
      fiat_total_amount_currency: offers.transak.fiatCurrency,
      external_id: transakExternalId,
      status: 'paymentRequestSent',
      user_id: selectedWallet.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestTransak({
        transakPaymentData: newData,
      }),
    );

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'transak',
        fiatAmount: offers.transak.fiatAmount,
        fiatCurrency: offers.transak.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const quoteData: TransakGetSignedUrlRequestData = {
      env: transakEnv,
      walletAddress: address,
      disableWalletAddressForm: true,
      redirectURL: getPassthroughUri(),
      exchangeScreenTitle: 'Bitpay - Buy crypto',
      fiatAmount: offers.transak.fiatAmount,
      fiatCurrency: offers.transak.fiatCurrency.toUpperCase(),
      network: getTransakChainFormat(chain) ?? 'mainnet',
      cryptoCurrencyCode: getTransakCoinFormat(coin),
      cryptoCurrencyList: getTransakCoinFormat(coin),
      hideExchangeScreen: true,
      themeColor: BitPay.replace(/#/g, ''),
      hideMenu: false,
      partnerOrderId: transakExternalId,
      partnerCustomerId: selectedWallet.id,
    };

    quoteData[
      paymentMethod.method !== 'other'
        ? 'paymentMethod'
        : 'defaultPaymentMethod'
    ] =
      offers.transak.paymentMethodKey ??
      getTransakPaymentMethodFormat(paymentMethod.method) ??
      'credit_debit_card';

    let data: TransakSignedUrlData;
    try {
      data = await selectedWallet.transakGetSignedPaymentUrl(quoteData);
    } catch (err) {
      const reason = 'transakGetSignedPaymentUrl Error';
      showTransakError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    if (!data || !data.urlWithSignature) {
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      const reason =
        'transakGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showTransakError(err, reason);
      setOpeningBrowser(false);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.goBack();
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
      if (offers.banxa.showOffer) {
        getBanxaQuote();
      }
      if (offers.moonpay.showOffer) {
        getMoonpayQuote();
      }
      if (offers.ramp.showOffer) {
        getRampQuote();
      }
      if (offers.sardine.showOffer) {
        getSardineQuote();
      }
      if (offers.simplex.showOffer) {
        getSimplexQuote();
      }
      if (offers.transak.showOffer) {
        getTransakQuote();
      }
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [
    finishedBanxa,
    finishedMoonpay,
    finishedRamp,
    finishedSardine,
    finishedSimplex,
    finishedTransak,
    updateView,
  ]);

  return (
    <BuyCryptoOffersContainer>
      <ScrollView>
        <SummaryRow>
          <SummaryItemContainer>
            <SummaryTitle>{t('Amount')}</SummaryTitle>
            <SummaryData>
              {formatFiatAmount(Number(amount), fiatCurrency, {
                customPrecision: 'minimal',
              })}
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
            <SummaryTitle>{t('Payment Type')}</SummaryTitle>
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
              parseFloat(b.amountReceiving || '0') -
              parseFloat(a.amountReceiving || '0'),
          )
          .map((offer: CryptoOffer, index: number) => {
            return offer.showOffer ? (
              <BuyCryptoExpandibleCard
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
                        <OfferDataCryptoAmount>
                          {Number(offer.amountReceiving)
                            .toFixed(8)
                            .replace(/\.?0+$/, '')}{' '}
                          {coin.toUpperCase()}
                        </OfferDataCryptoAmount>
                        {offer.fiatCurrency !== fiatCurrency ? (
                          <OfferDataWarningContainer>
                            <OfferDataWarningMsg>
                              {t(
                                "This exchange doesn't support purchases with , tap 'Buy' to continue paying in .",
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
                    <OfferDataInfoContainer>
                      <OfferDataInfoLabel
                        accessibilityLabel={'Provided By ' + offer.key}>
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
                          offer.buyClicked = true;
                          setOpeningBrowser(true);
                          goTo(offer.key);
                        }}>
                        {offer.buyClicked ? (
                          <ActivityIndicator
                            style={{marginBottom: -5}}
                            color={White}
                          />
                        ) : (
                          t('Buy')
                        )}
                      </Button>
                    </SummaryCtaContainer>
                  ) : null}
                </OfferRow>

                {offer.expanded || showArchaxBanner ? (
                  <>
                    <ItemDivisor style={{marginTop: 20}} />
                    <OfferExpandibleItem>
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
                          {coin.toUpperCase()}
                        </OfferDataInfoTextSec>
                      </OfferDataRightContainer>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <OfferDataInfoLabel>{t('Fee')}</OfferDataInfoLabel>
                      <OfferDataInfoText>
                        {formatFiatAmount(
                          Number(offer.fee),
                          offer.fiatCurrency,
                        )}
                      </OfferDataInfoText>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <OfferDataInfoTotal>{t('TOTAL')}</OfferDataInfoTotal>
                      <OfferDataInfoTotal>
                        {formatFiatAmount(
                          Number(offer.amountCost),
                          offer.fiatCurrency,
                          {
                            customPrecision: 'minimal',
                          },
                        )}
                      </OfferDataInfoTotal>
                    </OfferExpandibleItem>
                    {offer.key == 'banxa' ? (
                      <BanxaTerms
                        paymentMethod={paymentMethod}
                        country={country}
                      />
                    ) : null}
                    {offer.key == 'moonpay' ? (
                      <MoonpayTerms
                        paymentMethod={paymentMethod}
                        country={country}
                      />
                    ) : null}
                    {offer.key == 'ramp' ? (
                      <RampTerms
                        paymentMethod={paymentMethod}
                        country={country}
                      />
                    ) : null}
                    {offer.key == 'sardine' ? (
                      <SardineTerms quoteData={offer.quoteData} />
                    ) : null}
                    {offer.key == 'simplex' ? (
                      <SimplexTerms paymentMethod={paymentMethod} />
                    ) : null}
                    {offer.key == 'transak' ? (
                      <TransakTerms
                        paymentMethod={paymentMethod}
                        country={country}
                      />
                    ) : null}
                  </>
                ) : null}
                {showArchaxBanner && (
                  <TermsContainerOffer>
                    <TermsText>
                      {t(
                        'The final crypto amount you receive when the transaction is complete may differ because it is based on the exchange rates of the providers.',
                      )}
                    </TermsText>
                  </TermsContainerOffer>
                )}
              </BuyCryptoExpandibleCard>
            ) : null;
          })}

        {!showArchaxBanner && (
          <TermsContainer>
            <TermsText>
              {t(
                'The final crypto amount you receive when the transaction is complete may differ because it is based on the exchange rates of the providers.',
              )}
            </TermsText>
            <TermsText>{t('Additional third-party fees may apply.')}</TermsText>
          </TermsContainer>
        )}
        {showArchaxBanner && <ArchaxFooter />}
      </ScrollView>
    </BuyCryptoOffersContainer>
  );
};

export default BuyCryptoOffers;
