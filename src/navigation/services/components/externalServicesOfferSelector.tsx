import React, {memo, useEffect, useRef, useState} from 'react';
import uuid from 'react-native-uuid';
import styled, {useTheme} from 'styled-components/native';
import {
  Caution,
  LightBlack,
  NeutralSlate,
  Slate,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {HEIGHT, ScreenGutter} from '../../../components/styled/Containers';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Platform, View} from 'react-native';
import SelectorArrowRight from '../../../../assets/img/selector-arrow-right.svg';
import {useNavigation, StackActions} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {BaseText} from '../../../components/styled/Text';
import {useLogger} from '../../../utils/hooks/useLogger';
import BanxaLogo from '../../../components/icons/external-services/banxa/banxa-logo';
import MoonpayLogo from '../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../components/icons/external-services/simplex/simplex-logo';
import TransakLogo from '../../../components/icons/external-services/transak/transak-logo';
import {
  simplexEnv,
  getSimplexCoinFormat,
} from '../buy-crypto/utils/simplex-utils';
import {RootState} from '../../../store';
import {GetPrecision} from '../../../store/wallet/utils/currency';
import {
  BanxaGetQuoteRequestData,
  BanxaPaymentMethodsData,
  BanxaQuoteData,
  BuyCryptoLimits,
  MoonpayGetCurrencyLimitsRequestData,
  MoonpayPaymentType,
  SardineGetQuoteRequestData,
  SimplexGetQuoteRequestData,
  TransakGetQuoteRequestData,
  TransakPaymentType,
  TransakQuoteData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {
  calculateAltFiatToUsd,
  calculateAnyFiatToAltFiat,
  getBuyCryptoFiatLimits,
} from '../../../store/buy-crypto/buy-crypto.effects';
import {SendMaxInfo, Wallet} from '../../../store/wallet/wallet.models';
import {
  BuyCryptoExchangeKey,
  BuyCryptoSupportedExchanges,
  getAvailableFiatCurrencies,
  isPaymentMethodSupported,
} from '../buy-crypto/utils/buy-crypto-utils';
import {
  PaymentMethod,
  PaymentMethodKey,
  PaymentMethodsAvailable,
} from '../buy-crypto/constants/BuyCryptoConstants';
import {
  banxaEnv,
  getBanxaChainFormat,
  getBanxaCoinFormat,
  getBanxaFiatAmountLimits,
  getBanxaSelectedPaymentMethodData,
} from '../buy-crypto/utils/banxa-utils';
import {
  getMoonpayFixedCurrencyAbbreviation,
  getMoonpayPaymentMethodFormat,
  moonpayEnv,
} from '../buy-crypto/utils/moonpay-utils';
import {
  getRampCoinFormat,
  rampEnv,
  getChainFromRampChainFormat,
  getRampChainFormat,
  getCoinFromRampCoinFormat,
  getRampPaymentMethodDataFromQuoteData,
} from '../buy-crypto/utils/ramp-utils';
import {
  BuyCryptoConfig,
  SellCryptoConfig,
} from '../../../store/external-services/external-services.types';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {AppActions} from '../../../store/app';
import {banxaGetPaymentMethods} from '../../../store/buy-crypto/effects/banxa/banxa';
import {moonpayGetCurrencyLimits} from '../../../store/buy-crypto/effects/moonpay/moonpay';
import {rampGetAssets} from '../../../store/buy-crypto/effects/ramp/ramp';
import {
  getSardineChainFormat,
  getSardineCoinFormat,
  getSardinePaymentMethodFormat,
  sardineEnv,
} from '../buy-crypto/utils/sardine-utils';
import {sardineGetCurrencyLimits} from '../../../store/buy-crypto/effects/sardine/sardine';
import {transakGetFiatCurrencies} from '../../../store/buy-crypto/effects/transak/transak';
import {
  getTransakChainFormat,
  getTransakCoinFormat,
  getTransakPaymentMethodFormat,
  getTransakSelectedPaymentMethodData,
  transakEnv,
} from '../buy-crypto/utils/transak-utils';
import {
  RampGetAssetsData,
  RampGetAssetsRequestData,
  RampQuoteRequestData,
  RampQuoteResultForPaymentMethod,
} from '../../../store/buy-crypto/models/ramp.models';
import _ from 'lodash';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import OfferSelectorModal from './OfferSelectorModal';
import {getErrorMessage} from '../utils/external-services-utils';
import {BuyCryptoStateOpts} from '../../../store/buy-crypto/buy-crypto.reducer';
import {
  ExternalServicesContext,
  PreLoadPartnersData,
  SellLimitsOpts,
} from '../screens/BuyAndSellRoot';
import {
  WithdrawalMethod,
  WithdrawalMethodKey,
  WithdrawalMethodsAvailable,
} from '../sell-crypto/constants/SellCryptoConstants';
import {SellCryptoStateOpts} from '../../../store/sell-crypto/sell-crypto.reducer';
import {
  getAvailableSellCryptoFiatCurrencies,
  getBaseSellCryptoFiatCurrencies,
  getDefaultPaymentMethod,
  isWithdrawalMethodSupported,
  SellCryptoExchangeKey,
  SellCryptoSupportedExchanges,
} from '../sell-crypto/utils/sell-crypto-utils';
import {SellCryptoLimits} from '../../../store/sell-crypto/sell-crypto.models';
import {
  adjustMoonpaySellAmount,
  getMoonpaySellFixedCurrencyAbbreviation,
  getMoonpaySellPayoutMethodFormat,
  moonpaySellEnv,
} from '../sell-crypto/utils/moonpay-sell-utils';
import {MoonpayGetSellQuoteRequestData} from '../../../store/sell-crypto/models/moonpay-sell.models';
import {
  RampGetSellQuoteData,
  RampGetSellQuoteRequestData,
  RampSellQuoteResultForPayoutMethod,
} from '../../../store/sell-crypto/models/ramp-sell.models';
import {
  getRampSellCoinFormat,
  rampSellEnv,
} from '../sell-crypto/utils/ramp-sell-utils';
import {
  SimplexGetSellQuoteData,
  SimplexGetSellQuoteRequestData,
  SimplexPayoutMethodType,
} from '../../../store/sell-crypto/models/simplex-sell.models';
import {
  getSimplexBaseAmountFormat,
  getSimplexSellCoinFormat,
  getSimplexSellCountryFormat,
  simplexSellEnv,
} from '../sell-crypto/utils/simplex-sell-utils';

export const ExternalServicesOfferSelectorContainer = styled.View``;

const OfferSelectorContainer = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
}>`
  margin: ${({isSmallScreen}) => (isSmallScreen ? 5 : 10)}px ${ScreenGutter};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  min-height: ${({isSmallScreen}) => (isSmallScreen ? 40 : 56)}px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  padding: 16px;
`;

const OfferSelectorContainerLeft = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

const OfferSelectorText = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  flex: 1;
  min-width: 0;
  flex-shrink: 1;
  flex-wrap: wrap;
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

export type CryptoOffer = {
  key: BuyCryptoExchangeKey;
  label: string;
  showOffer: boolean;
  logo: React.JSX.Element;
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

const offersDefault: {
  [key in BuyCryptoExchangeKey]: CryptoOffer;
} = {
  banxa: {
    key: 'banxa',
    label: 'Banxa',
    amountReceiving: '0',
    showOffer: true,
    logo: <BanxaLogo iconOnly={true} width={25} height={25} />,
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
    label: 'MoonPay',
    amountReceiving: '0',
    showOffer: true,
    logo: <MoonpayLogo iconOnly={true} widthIcon={25} heightIcon={25} />,
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
    label: 'Ramp Network',
    amountReceiving: '0',
    showOffer: true,
    logo: <RampLogo iconOnly={true} width={25} height={25} />,
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
    label: 'Sardine',
    amountReceiving: '0',
    showOffer: true,
    logo: <SardineLogo iconOnly={true} width={25} height={25} />,
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
    label: 'Simplex',
    amountReceiving: '0',
    showOffer: true,
    logo: (
      <SimplexLogo
        iconOnly={true}
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
    label: 'Transak',
    amountReceiving: '0',
    showOffer: true,
    logo: <TransakLogo iconOnly={true} width={25} height={25} />,
    expanded: false,
    buyClicked: false,
    fiatCurrency: 'USD',
    fiatAmount: 0,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

export type SellCryptoOffer = {
  key: SellCryptoExchangeKey;
  label: string;
  showOffer: boolean;
  logo: React.JSX.Element;
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

const sellOffersDefault: {
  moonpay: SellCryptoOffer;
  ramp: SellCryptoOffer;
  simplex: SellCryptoOffer;
} = {
  moonpay: {
    key: 'moonpay',
    label: 'MoonPay',
    amountReceiving: '0', // Fiat amount
    amountReceivingAltFiatCurrency: '0', // Fiat amount in alt fiat currency
    showOffer: true,
    logo: <MoonpayLogo iconOnly={true} widthIcon={25} heightIcon={25} />,
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
    label: 'Ramp Network',
    amountReceiving: '0', // Fiat amount
    amountReceivingAltFiatCurrency: '0', // Fiat amount in alt fiat currency
    showOffer: true,
    logo: <RampLogo iconOnly={true} width={25} height={25} />,
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
    label: 'Simplex',
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

interface ExternalServicesOfferSelectorProps {
  context: ExternalServicesContext;
  selectedWallet: Wallet;
  amount: number;
  amountLimits?: BuyCryptoLimits;
  sellLimits?: SellLimitsOpts;
  fiatCurrency: string;
  coin: string;
  chain: string;
  country: string;
  getWarnMsg?: string;
  preSetPaymentMethod?: PaymentMethodKey | WithdrawalMethodKey;
  onSelectOffer?: (offer: CryptoOffer | SellCryptoOffer | undefined) => void;
  onSelectPaymentMethod?: (
    paymentMethod: PaymentMethod | WithdrawalMethod | undefined,
  ) => void;
  buyCryptoConfig: BuyCryptoConfig | undefined;
  sellCryptoConfig: SellCryptoConfig | undefined;
  preLoadSellPartnersData?: PreLoadPartnersData | undefined;
  useSendMax?: boolean | undefined;
  sendMaxInfo?: SendMaxInfo | undefined;
  preSetPartner?: BuyCryptoExchangeKey | SellCryptoExchangeKey | undefined;
  preLoadPartnersData?: {
    banxa: {
      banxaPreloadPaymentMethods: BanxaPaymentMethodsData | undefined;
    };
  };
}

const ExternalServicesOfferSelector: React.FC<
  ExternalServicesOfferSelectorProps
> = ({
  context,
  selectedWallet,
  getWarnMsg,
  amount,
  amountLimits,
  sellLimits,
  fiatCurrency,
  coin,
  chain,
  country,
  preSetPaymentMethod,
  onSelectOffer,
  onSelectPaymentMethod,
  buyCryptoConfig,
  sellCryptoConfig,
  preLoadSellPartnersData,
  useSendMax,
  sendMaxInfo,
  preSetPartner,
  preLoadPartnersData,
}) => {
  const theme = useTheme();
  const {t} = useTranslation();
  const _isSmallScreen = HEIGHT < 700;

  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const buyCryptoOpts: BuyCryptoStateOpts = useAppSelector(
    ({BUY_CRYPTO}) => BUY_CRYPTO.opts,
  );
  const sellCryptoOpts: SellCryptoStateOpts = useAppSelector(
    ({SELL_CRYPTO}) => SELL_CRYPTO.opts,
  );

  let _paymentMethod: PaymentMethod | WithdrawalMethod | undefined;
  if (context === 'buyCrypto') {
    if (
      preSetPaymentMethod &&
      PaymentMethodsAvailable[preSetPaymentMethod as PaymentMethodKey]
    ) {
      _paymentMethod =
        PaymentMethodsAvailable[preSetPaymentMethod as PaymentMethodKey];
    } else if (
      buyCryptoOpts?.selectedPaymentMethod &&
      PaymentMethodsAvailable[buyCryptoOpts.selectedPaymentMethod] &&
      !preSetPartner
    ) {
      _paymentMethod =
        PaymentMethodsAvailable[buyCryptoOpts.selectedPaymentMethod];
    } else {
      _paymentMethod =
        Platform.OS === 'ios'
          ? PaymentMethodsAvailable.applePay
          : PaymentMethodsAvailable.debitCard;
    }
  } else if (context === 'sellCrypto') {
    if (
      preSetPaymentMethod &&
      WithdrawalMethodsAvailable[preSetPaymentMethod as WithdrawalMethodKey]
    ) {
      _paymentMethod =
        WithdrawalMethodsAvailable[preSetPaymentMethod as WithdrawalMethodKey];
    } else if (
      sellCryptoOpts?.selectedWithdrawalMethod &&
      WithdrawalMethodsAvailable[sellCryptoOpts.selectedWithdrawalMethod] &&
      !preSetPartner
    ) {
      _paymentMethod =
        WithdrawalMethodsAvailable[sellCryptoOpts.selectedWithdrawalMethod];
    } else {
      _paymentMethod = getDefaultPaymentMethod(country);
    }
  }

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(
    _paymentMethod as PaymentMethod,
  );
  const [offerWarnMsg, setOfferWarnMsg] = useState<string | undefined>(
    getWarnMsg,
  );

  const [withdrawalMethod, setWithdrawalMethod] = useState<
    WithdrawalMethod | undefined
  >(_paymentMethod as WithdrawalMethod);

  if (context === 'buyCrypto') {
    BuyCryptoSupportedExchanges.forEach((exchange: BuyCryptoExchangeKey) => {
      if (offersDefault[exchange]) {
        offersDefault[exchange].fiatCurrency = getAvailableFiatCurrencies(
          exchange,
        ).includes(fiatCurrency)
          ? fiatCurrency
          : 'USD';

        if (paymentMethod) {
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
      }
    });
  } else if (context === 'sellCrypto') {
    SellCryptoSupportedExchanges.forEach((exchange: SellCryptoExchangeKey) => {
      if (sellOffersDefault[exchange]) {
        if (preLoadSellPartnersData && preLoadSellPartnersData[exchange]) {
          sellOffersDefault[exchange].amountLimits =
            preLoadSellPartnersData[exchange].limits;

          if (exchange === 'moonpay') {
            sellOffersDefault.moonpay.precision =
              preLoadSellPartnersData.moonpay.precision;
            const adjustedSellAmount = adjustMoonpaySellAmount(
              amount,
              preLoadSellPartnersData?.moonpay?.precision,
            );
            sellOffersDefault.moonpay.sellAmount = adjustedSellAmount;
          }
        }

        if (withdrawalMethod) {
          sellOffersDefault[exchange].fiatCurrency =
            getAvailableSellCryptoFiatCurrencies(
              exchange,
              withdrawalMethod.method,
            ).includes(fiatCurrency)
              ? fiatCurrency
              : getBaseSellCryptoFiatCurrencies(
                  exchange,
                  withdrawalMethod.method,
                );

          if (
            preSetPartner &&
            SellCryptoSupportedExchanges.includes(
              preSetPartner as SellCryptoExchangeKey,
            )
          ) {
            sellOffersDefault[exchange].showOffer =
              preSetPartner === exchange
                ? isWithdrawalMethodSupported(
                    preSetPartner,
                    withdrawalMethod,
                    coin,
                    chain,
                    sellOffersDefault[preSetPartner].fiatCurrency,
                    country,
                    user?.country,
                  ) &&
                  (!sellCryptoConfig?.[preSetPartner] ||
                    !sellCryptoConfig?.[preSetPartner]?.removed)
                : false;
          } else {
            sellOffersDefault[exchange].showOffer =
              isWithdrawalMethodSupported(
                exchange,
                withdrawalMethod,
                coin,
                chain,
                sellOffersDefault[exchange].fiatCurrency,
                country,
                user?.country,
              ) &&
              (!sellCryptoConfig?.[exchange] ||
                !sellCryptoConfig?.[exchange]?.removed);
          }
        }
      }
    });
  }

  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [sellOffers, setSellOffers] = useState(cloneDeep(sellOffersDefault));
  const [selectedOffer, setSelectedOffer] = useState<
    CryptoOffer | SellCryptoOffer | undefined
  >();
  const [selectedOfferLoading, setSelectedOfferLoading] =
    useState<boolean>(false);
  const [offerSelectorText, setOfferSelectorText] = useState<string>(
    t('Set amount for our Best Offer'),
  );
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [finishedBanxa, setFinishedBanxa] = useState(false);
  const [finishedMoonpay, setFinishedMoonpay] = useState(false);
  const [finishedRamp, setFinishedRamp] = useState(false);
  const [finishedSardine, setFinishedSardine] = useState(false);
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [finishedTransak, setFinishedTransak] = useState(false);
  const [updateView, setUpdateView] = useState<number>(0);
  const [updateViewSell, setUpdateViewSell] = useState<number>(0);

  const [offerSelectorModalVisible, setOfferSelectorModalVisible] =
    useState(false);

  // Get Buy Quotes

  const getBanxaQuote = async (selectedWallet: Wallet): Promise<void> => {
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
        !paymentMethod ||
        banxaPaymentMethods.errors
      ) {
        const msg = t(
          'Banxa currently does not support operations with the selected combination crypto(coin)-fiat(fiatCurrency)-paymentMethod(paymentMethod).',
          {
            coin: getBanxaCoinFormat(coin)?.toUpperCase(),
            fiatCurrency: offers.banxa.fiatCurrency.toUpperCase(),
            paymentMethod: paymentMethod?.label,
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
            paymentMethod: paymentMethod?.label,
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
        .then((data: any) => {
          const quoteData: BanxaQuoteData = data?.body ?? data;
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
    let msg = getErrorMessage(err);
    logger.error('Banxa error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'banxa',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  const getMoonpayQuote = async (selectedWallet: Wallet): Promise<void> => {
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
      getMoonpayPaymentMethodFormat(paymentMethod?.method);

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
      .then((data: any) => {
        data = data?.body ?? data;
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
    let msg = getErrorMessage(err);
    logger.error('Moonpay error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'moonpay',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  const getRampQuote = async (selectedWallet: Wallet): Promise<void> => {
    logger.debug('Ramp getting quote');

    if (buyCryptoConfig?.ramp?.disabled) {
      let err = buyCryptoConfig?.ramp?.disabledMessage
        ? buyCryptoConfig?.ramp?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'rampGetQuote Error. Exchange disabled from config.';
      showRampError(err, reason);
      return;
    }

    switch (paymentMethod?.method) {
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

      const _data: any = await selectedWallet.rampGetQuote(requestData);
      const data: RampQuoteRequestData = _data?.body ?? _data;

      let paymentMethodData: RampQuoteResultForPaymentMethod | undefined;
      if (data?.asset) {
        paymentMethodData = getRampPaymentMethodDataFromQuoteData(
          paymentMethod?.method,
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
    let msg = getErrorMessage(err);
    logger.error('Ramp error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'ramp',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  const getSardineQuote = async (selectedWallet: Wallet): Promise<void> => {
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
        getSardinePaymentMethodFormat(paymentMethod?.method, country),
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
          getSardinePaymentMethodFormat(paymentMethod?.method, country) ??
          'debit',
        quote_type: 'buy',
      };

      selectedWallet
        .sardineGetQuote(requestData)
        .then((_data: any) => {
          const data = _data?.body ?? _data;
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
    let msg = getErrorMessage(err);
    logger.error('Sardine error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'sardine',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  const getSimplexQuote = (selectedWallet: Wallet): void => {
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
      switch (paymentMethod?.method) {
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
        .then((_data: any) => {
          const data = _data?.body ?? _data;
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
    let msg = getErrorMessage(err);
    logger.error('Simplex error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'simplex',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  const getTransakQuote = async (selectedWallet: Wallet): Promise<void> => {
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
            paymentMethod: paymentMethod?.label,
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
          getTransakPaymentMethodFormat(paymentMethod?.method) ??
          'credit_debit_card',
        fiatAmount: offers.transak.fiatAmount,
      };

      selectedWallet
        .transakGetQuote(requestData)
        .then((_data: any) => {
          const data: TransakQuoteData = _data?.body ?? _data;
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
    let msg = getErrorMessage(err);
    logger.error('Transak error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'transak',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: paymentMethod?.method || '',
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

  // Get Sell Quotes

  const getMoonpaySellQuote = async (selectedWallet: Wallet): Promise<void> => {
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

    sellOffers.moonpay.cryptoAmount = amount;

    const requestData: MoonpayGetSellQuoteRequestData = {
      env: moonpaySellEnv,
      currencyAbbreviation: getMoonpaySellFixedCurrencyAbbreviation(
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
      ),
      quoteCurrencyCode: sellOffers.moonpay.fiatCurrency.toLowerCase(),
      baseCurrencyAmount: sellOffers.moonpay.sellAmount || amount,
      payoutMethod: getMoonpaySellPayoutMethodFormat(withdrawalMethod?.method),
    };

    selectedWallet
      .moonpayGetSellQuote(requestData)
      .then(_data => {
        const data = _data?.body ?? _data;
        if (data?.baseCurrencyAmount) {
          sellOffers.moonpay.amountLimits = {
            min: data.baseCurrency.minsellAmount,
            max: data.baseCurrency.maxsellAmount,
          };

          if (
            (sellOffers.moonpay.amountLimits.min &&
              Number(sellOffers.moonpay.sellAmount) <
                sellOffers.moonpay.amountLimits.min) ||
            (sellOffers.moonpay.amountLimits.max &&
              Number(sellOffers.moonpay.sellAmount) >
                sellOffers.moonpay.amountLimits.max)
          ) {
            sellOffers.moonpay.outOfLimitMsg = t(
              'There are no Moonpay offers available, as the current sell limits for this exchange must be between and',
              {
                min: sellOffers.moonpay.amountLimits.min,
                max: sellOffers.moonpay.amountLimits.max,
                fiatCurrency: sellOffers.moonpay.fiatCurrency,
              },
            );
            setFinishedMoonpay(!finishedMoonpay);
            return;
          } else {
            sellOffers.moonpay.outOfLimitMsg = undefined;
            sellOffers.moonpay.errorMsg = undefined;
            sellOffers.moonpay.quoteData = data;
            sellOffers.moonpay.sellAmount = data.baseCurrencyAmount;
            sellOffers.moonpay.fee =
              Number(data.extraFeeAmount) + Number(data.feeAmount);

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (sellOffers.moonpay.sellAmount && coin && precision) {
              sellOffers.moonpay.fiatMoney = Number(
                sellOffers.moonpay.sellAmount / data.quoteCurrencyAmount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Moonpay error: Could not get precision for ${coin}`,
              );
            }
            const adjustedFiatAmount: number =
              sellOffers.moonpay.fiatCurrency === fiatCurrency
                ? Number(data.quoteCurrencyAmount)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(data.quoteCurrencyAmount),
                      sellOffers.moonpay.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(data.quoteCurrencyAmount);

            sellOffers.moonpay.amountReceiving = Number(
              data.quoteCurrencyAmount,
            ).toFixed(2);
            sellOffers.moonpay.amountReceivingAltFiatCurrency =
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
          showMoonpaySellError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'moonpayGetSellQuote Error';
        showMoonpaySellError(err, reason);
      });
  };

  const showMoonpaySellError = (err?: any, reason?: string) => {
    let msg = getErrorMessage(err);
    logger.error('Moonpay sell error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'moonpay',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: withdrawalMethod?.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(sellOffers.moonpay.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: sellOffers.moonpay.fiatCurrency || '',
      }),
    );

    sellOffers.moonpay.errorMsg = msg;
    sellOffers.moonpay.fiatMoney = undefined;
    sellOffers.moonpay.expanded = false;
    setUpdateViewSell(Math.random());
  };

  const getRampSellQuote = async (selectedWallet: Wallet): Promise<void> => {
    logger.debug('Ramp getting sell quote');

    if (sellCryptoConfig?.ramp?.disabled) {
      let err = sellCryptoConfig?.ramp?.disabledMessage
        ? sellCryptoConfig?.ramp?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason = 'rampGetSellQuote Error. Exchange disabled from config.';
      showRampSellError(err, reason);
      return;
    }

    sellOffers.ramp.cryptoAmount = amount;

    const requestData: RampGetSellQuoteRequestData = {
      env: rampSellEnv,
      cryptoAssetSymbol: getRampSellCoinFormat(
        selectedWallet.currencyAbbreviation,
        getRampChainFormat(selectedWallet.chain),
      ),
      fiatCurrency: sellOffers.ramp.fiatCurrency.toUpperCase(),
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
      showRampSellError(msg, reason);
      return;
    }

    selectedWallet
      .rampGetSellQuote(requestData)
      .then((_data: any) => {
        const data: RampGetSellQuoteData = _data?.body ?? _data;
        let paymentMethodData: RampSellQuoteResultForPayoutMethod | undefined;
        if (data?.asset) {
          switch (withdrawalMethod?.method) {
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
            showRampSellError(undefined, reason);
            return;
          }

          sellOffers.ramp.amountLimits = {
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
            (sellOffers.ramp.amountLimits.min &&
              Number(sellOffers.ramp.sellAmount) <
                sellOffers.ramp.amountLimits.min) ||
            (sellOffers.ramp.amountLimits.max &&
              Number(sellOffers.ramp.sellAmount) >
                sellOffers.ramp.amountLimits.max)
          ) {
            sellOffers.ramp.outOfLimitMsg = t(
              'There are no Ramp Network offers available, as the current sell limits for this exchange must be between and',
              {
                min: sellOffers.ramp.amountLimits.min,
                max: sellOffers.ramp.amountLimits.max,
                fiatCurrency: sellOffers.ramp.fiatCurrency,
              },
            );
            setFinishedRamp(!finishedRamp);
            return;
          } else {
            sellOffers.ramp.outOfLimitMsg = undefined;
            sellOffers.ramp.errorMsg = undefined;
            sellOffers.ramp.quoteData = data;
            sellOffers.ramp.sellAmount = cloneDeep(amount); // paymentMethodData.fiatValue;
            sellOffers.ramp.fee =
              Number(paymentMethodData.baseRampFee ?? 0) +
              Number(paymentMethodData.appliedFee);

            sellOffers.ramp.externalId = uuid.v4().toString();

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            let decimals: number | undefined;

            if (data.asset.decimals && data.asset.decimals > 0) {
              decimals = data.asset.decimals;
            } else if (precision?.unitDecimals) {
              decimals = precision.unitDecimals;
            }
            sellOffers.ramp.decimals = decimals;

            if (sellOffers.ramp.sellAmount && coin && decimals) {
              sellOffers.ramp.fiatMoney = Number(
                sellOffers.ramp.sellAmount /
                  Number(paymentMethodData.fiatValue),
              ).toFixed(decimals);
            } else {
              logger.error(`Ramp error: Could not get precision for ${coin}`);

              const reason = 'rampGetSellQuote Error. Could not get decimals';
              showRampSellError(undefined, reason);
              return;
            }

            const adjustedFiatAmount: number =
              sellOffers.ramp.fiatCurrency === fiatCurrency
                ? Number(paymentMethodData.fiatValue)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(paymentMethodData.fiatValue),
                      sellOffers.ramp.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(paymentMethodData.fiatValue);

            sellOffers.ramp.amountReceiving = Number(
              paymentMethodData.fiatValue,
            ).toFixed(2);
            sellOffers.ramp.amountReceivingAltFiatCurrency =
              adjustedFiatAmount.toFixed(2);
            // const amountReceivingNum =
            //   Number(paymentMethodData.cryptoAmount) / 10 ** decimals;
            // sellOffers.ramp.amountReceiving = amountReceivingNum.toFixed(8);

            // if (
            //   sellOffers.ramp.sellAmount &&
            //   Number(paymentMethodData.fiatValue) > 0 &&
            //   coin &&
            //   precision
            // ) {
            //   sellOffers.ramp.fiatMoney = Number(
            //     sellOffers.ramp.sellAmount / paymentMethodData.fiatValue,
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
          showRampSellError(err, reason);
        }
      })
      .catch(err => {
        const reason = 'rampGetSellQuote Error';
        showRampSellError(err, reason);
      });
  };

  const showRampSellError = (err?: any, reason?: string) => {
    let msg = getErrorMessage(err);
    logger.error('Ramp sell error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'ramp',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: withdrawalMethod?.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(sellOffers.ramp.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: sellOffers.ramp.fiatCurrency || '',
      }),
    );

    sellOffers.ramp.errorMsg = msg;
    sellOffers.ramp.fiatMoney = undefined;
    sellOffers.ramp.expanded = false;
    setUpdateViewSell(Math.random());
  };

  const getSimplexSellQuote = (selectedWallet: Wallet): void => {
    logger.debug('Simplex getting sell quote');

    if (sellCryptoConfig?.simplex?.disabled) {
      let err = sellCryptoConfig?.simplex?.disabledMessage
        ? sellCryptoConfig?.simplex?.disabledMessage
        : t("Can't get rates at this moment. Please try again later");
      const reason =
        'simplexGetSellQuote Error. Exchange disabled from config.';
      showSimplexSellError(err, reason);
      return;
    }

    sellOffers.simplex.cryptoAmount = amount;

    if (
      (sellOffers.simplex.amountLimits?.min &&
        Number(sellOffers.simplex.sellAmount) <
          sellOffers.simplex.amountLimits.min) ||
      (sellOffers.simplex.amountLimits?.max &&
        Number(sellOffers.simplex.sellAmount) >
          sellOffers.simplex.amountLimits.max)
    ) {
      sellOffers.simplex.outOfLimitMsg = t(
        'There are no Simplex offers available, as the current sell limits for this exchange must be between and',
        {
          min: sellOffers.simplex.amountLimits.min,
          max: sellOffers.simplex.amountLimits.max,
          fiatCurrency: sellOffers.simplex.fiatCurrency,
        },
      );
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      let simplexPaymentMethod: SimplexPayoutMethodType | undefined;
      switch (withdrawalMethod?.method) {
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
        showSimplexSellError(msg, reason);
        return;
      }
      const userCountry = getSimplexSellCountryFormat(country, user?.country);

      const requestData: SimplexGetSellQuoteRequestData = {
        env: simplexSellEnv,
        userCountry: __DEV__ ? 'LT' : userCountry || 'US',
        base_currency: getSimplexSellCoinFormat(coin, selectedWallet.chain),
        base_amount: getSimplexBaseAmountFormat(amount), // base_amount should be integer, which counts millionths of a whole currency unit.
        quote_currency: sellOffers.simplex.fiatCurrency.toUpperCase(),
        pp_payment_method: 'sepa', // pp_payment_method = "sepa" (this does not impact user payment method but is needed to get a quote, no impact on price) | TODO: use simplexPaymentMethod,
      };

      selectedWallet
        .simplexGetSellQuote(requestData)
        .then(_data => {
          const data: SimplexGetSellQuoteData = _data?.body ?? _data;
          if (data && data.fiat_amount) {
            sellOffers.simplex.outOfLimitMsg = undefined;
            sellOffers.simplex.errorMsg = undefined;
            sellOffers.simplex.quoteData = data;
            sellOffers.simplex.sellAmount = cloneDeep(amount);
            sellOffers.simplex.fee = Number(data.fiat_amount) * 0.05;

            const precision = dispatch(
              GetPrecision(coin, chain, selectedWallet.tokenAddress),
            );
            if (sellOffers.simplex.sellAmount && coin && precision) {
              sellOffers.simplex.fiatMoney = Number(
                sellOffers.simplex.sellAmount / Number(data.fiat_amount),
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Simplex error: Could not get precision for ${coin}`,
              );
            }

            const adjustedFiatAmount: number =
              sellOffers.simplex.fiatCurrency === fiatCurrency
                ? Number(data.fiat_amount)
                : dispatch(
                    calculateAnyFiatToAltFiat(
                      Number(data.fiat_amount),
                      sellOffers.simplex.fiatCurrency,
                      fiatCurrency,
                    ),
                  ) || Number(data.fiat_amount);

            sellOffers.simplex.amountReceiving = Number(
              data.fiat_amount,
            ).toFixed(2);
            sellOffers.simplex.amountReceivingAltFiatCurrency =
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
            showSimplexSellError(err, reason);
          }
        })
        .catch((err: any) => {
          const reason = 'simplexGetSellQuote Error';
          showSimplexSellError(err, reason);
        });
    }
  };

  const showSimplexSellError = (err?: any, reason?: string) => {
    let msg = getErrorMessage(err);
    logger.error('Simplex sell error: ' + msg + ' | Reason: ' + reason);

    dispatch(
      Analytics.track('Failed Sell Crypto', {
        exchange: 'simplex',
        context: 'SellCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: withdrawalMethod?.method || '',
        cryptoAmount: amount || '',
        fiatAmount: Number(sellOffers.simplex.amountReceiving) || '',
        coin: coin?.toLowerCase() || '',
        chain: chain?.toLowerCase() || '',
        fiatCurrency: sellOffers.simplex.fiatCurrency || '',
      }),
    );

    sellOffers.simplex.errorMsg = msg;
    sellOffers.simplex.fiatMoney = undefined;
    sellOffers.simplex.expanded = false;
    setUpdateViewSell(Math.random());
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

  const getBuyCryptoQuotes = (selectedWallet: Wallet) => {
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
        getBanxaQuote(selectedWallet);
      }
      if (offers.moonpay.showOffer) {
        getMoonpayQuote(selectedWallet);
      }
      if (offers.ramp.showOffer) {
        getRampQuote(selectedWallet);
      }
      if (offers.sardine.showOffer) {
        getSardineQuote(selectedWallet);
      }
      if (offers.simplex.showOffer) {
        getSimplexQuote(selectedWallet);
      }
      if (offers.transak.showOffer) {
        getTransakQuote(selectedWallet);
      }
    }
  };

  const getSellCryptoQuotes = (selectedWallet: Wallet) => {
    const showedOffersCount = Object.values(cloneDeep(sellOffers)).filter(
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
      if (sellOffers.moonpay.showOffer) {
        getMoonpaySellQuote(selectedWallet);
      }
      if (sellOffers.ramp.showOffer) {
        getRampSellQuote(selectedWallet);
      }
      if (sellOffers.simplex.showOffer) {
        getSimplexSellQuote(selectedWallet);
      }
    }
  };

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!amount || amount === 0 || isNaN(amount)) {
      setOfferSelectorText(t('Set amount for our Best Offer'));
      setOfferWarnMsg(undefined);
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
      setSelectedOfferLoading(false);
      setOffers(offersDefault);
      setSellOffers(sellOffersDefault);
      return;
    }

    if (
      !selectedWallet ||
      (context === 'buyCrypto' && !amountLimits) ||
      (context === 'sellCrypto' && !sellLimits)
    ) {
      setSelectedOffer(undefined);
      onSelectOffer?.(undefined);
      setSelectedOfferLoading(false);
      setOffers(offersDefault);
      setSellOffers(sellOffersDefault);
      return;
    }

    if (context === 'buyCrypto' && amountLimits) {
      if (
        amountLimits.min &&
        amountLimits.max &&
        (amount < amountLimits.min || amount > amountLimits.max)
      ) {
        setSelectedOffer(undefined);
        onSelectOffer?.(undefined);
        setSelectedOfferLoading(false);
        setOffers(offersDefault);
        setSellOffers(sellOffersDefault);
        return;
      }
    }

    if (context === 'sellCrypto' && sellLimits) {
      if (
        (sellLimits.limits?.minAmount &&
          sellLimits.limits?.maxAmount &&
          (amount < sellLimits.limits.minAmount ||
            amount > sellLimits.limits.maxAmount)) ||
        (sellLimits.maxWalletAmount &&
          amount > Number(sellLimits.maxWalletAmount))
      ) {
        setSelectedOffer(undefined);
        onSelectOffer?.(undefined);
        setSelectedOfferLoading(false);
        setOffers(offersDefault);
        setSellOffers(sellOffersDefault);
        return;
      }
    }

    setOfferSelectorText(t('Searching for our Best Offer'));
    setOfferWarnMsg(undefined);
    setSelectedOffer(undefined);
    onSelectOffer?.(undefined);
    setSelectedOfferLoading(true);
    onSelectPaymentMethod?.(
      context === 'sellCrypto' ? withdrawalMethod : paymentMethod,
    );

    // Clean up the previous timeout if the value changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (context === 'buyCrypto') getBuyCryptoQuotes(selectedWallet);
      if (context === 'sellCrypto') getSellCryptoQuotes(selectedWallet);
    }, 2000);

    // Clean up the timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    selectedWallet,
    amount,
    amountLimits,
    sellLimits,
    paymentMethod,
    withdrawalMethod,
  ]);

  useEffect(() => {
    if (context !== 'buyCrypto') {
      return;
    }
    setOffers(offers);

    if (!selectedWallet || !amount || !amountLimits) {
      return;
    }
    if (
      amountLimits.min &&
      amountLimits.max &&
      (amount < amountLimits.min || amount > amountLimits.max)
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
        return;
      }
      const _selectedOffer = _.clone(filteredOffers).reduce((prev, curr) =>
        parseFloat(curr.amountReceiving || '0') >
        parseFloat(prev.amountReceiving || '0')
          ? curr
          : prev,
      );
      setSelectedOffer(_selectedOffer);
      onSelectOffer?.(_selectedOffer);
      setOfferWarnMsg(undefined);
      setOfferSelectorText(
        _selectedOffer?.label + t(' using ') + paymentMethod?.label,
      );

      dispatch(
        Analytics.track('Buy - Our Best Offer Loaded', {
          exchange: _selectedOffer?.key || 'unknown',
          paymentMethod: paymentMethod?.method || '',
          fiatAmount: Number(_selectedOffer?.fiatAmount) || '',
          coin: coin?.toLowerCase() || '',
          chain: chain?.toLowerCase() || '',
          fiatCurrency: _selectedOffer?.fiatCurrency || '',
          cryptoAmount: Number(_selectedOffer?.amountReceiving) || '',
        }),
      );

      setSelectedOfferLoading(false);
    }, 3500);

    return () => clearTimeout(offersTimeout);
  }, [
    paymentMethod,
    finishedBanxa,
    finishedMoonpay,
    finishedRamp,
    finishedSardine,
    finishedSimplex,
    finishedTransak,
    updateView,
  ]);

  useEffect(() => {
    if (context !== 'sellCrypto') {
      return;
    }
    setSellOffers(sellOffers);

    if (!selectedWallet || !amount || !sellLimits) {
      return;
    }
    if (
      (sellLimits.limits?.minAmount &&
        sellLimits.limits?.maxAmount &&
        (amount < sellLimits.limits.minAmount ||
          amount > sellLimits.limits.maxAmount)) ||
      (sellLimits.maxWalletAmount &&
        amount > Number(sellLimits.maxWalletAmount))
    ) {
      return;
    }

    const offersTimeout = setTimeout(() => {
      const offersArray = Object.values(sellOffers);
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
        setOfferSelectorText(
          _selectedOffer?.label +
            ' ' +
            t('paid to') +
            ' ' +
            withdrawalMethod?.label,
        );

        dispatch(
          Analytics.track('Sell - Our Best Offer Loaded', {
            exchange: _selectedOffer?.key || 'unknown',
            paymentMethod: paymentMethod?.method || '',
            fiatAmount: Number(_selectedOffer?.amountReceiving) || '',
            coin: coin?.toLowerCase() || '',
            chain: chain?.toLowerCase() || '',
            fiatCurrency: _selectedOffer?.fiatCurrency || '',
            cryptoAmount: Number(_selectedOffer?.sellAmount) || '',
          }),
        );
      } else {
        setSelectedOffer(undefined);
        onSelectOffer?.(undefined);
      }
      setSelectedOfferLoading(false);
    }, 3500);

    return () => clearTimeout(offersTimeout);
  }, [
    withdrawalMethod,
    finishedMoonpay,
    finishedRamp,
    finishedSimplex,
    updateViewSell,
  ]);

  useEffect(() => {
    setOfferWarnMsg(getWarnMsg);
  }, [getWarnMsg]);

  const onBackdropPress = () => {
    setOfferSelectorModalVisible(false);
  };

  return (
    <ExternalServicesOfferSelectorContainer>
      <OfferSelectorContainer
        isSmallScreen={_isSmallScreen}
        onPress={() => {
          if (amount === 0 || !amount || isNaN(amount) || !selectedWallet) {
            return;
          }
          if (
            context === 'buyCrypto' &&
            ((amountLimits?.min && amount < amountLimits.min) ||
              (amountLimits?.max && amount > amountLimits.max))
          ) {
            return;
          }
          if (
            context === 'sellCrypto' &&
            ((sellLimits?.limits?.minAmount &&
              amount < sellLimits.limits.minAmount) ||
              (sellLimits?.limits?.maxAmount &&
                amount > sellLimits.limits.maxAmount) ||
              (sellLimits?.maxWalletAmount &&
                amount > Number(sellLimits.maxWalletAmount)))
          ) {
            return;
          }
          setOfferSelectorModalVisible(true);
          dispatch(
            Analytics.track(
              context === 'buyCrypto'
                ? 'Buy - Clicked Offer & Payment Method'
                : 'Sell - Clicked Offer & Payment Method',
              {
                context,
                clickedAfterBestOfferLoaded:
                  !selectedOfferLoading && !!selectedOffer,
                exchange: selectedOffer?.key || 'none',
                paymentMethod:
                  context === 'buyCrypto'
                    ? paymentMethod?.method || ''
                    : withdrawalMethod?.method || '',
              },
            ),
          );
        }}>
        {offerWarnMsg ? (
          <WarnMsgText>{offerWarnMsg}</WarnMsgText>
        ) : (
          <OfferSelectorContainerLeft>
            <View style={{marginRight: 5}}>
              {selectedOffer?.logo ? selectedOffer.logo : null}
            </View>
            <OfferSelectorText>{offerSelectorText}</OfferSelectorText>
          </OfferSelectorContainerLeft>
        )}
        {offerWarnMsg ? null : selectedOfferLoading ? (
          <ActivityIndicatorContainer>
            <ActivityIndicator color={SlateDark} />
          </ActivityIndicatorContainer>
        ) : selectedOffer ? (
          <ArrowContainer style={{marginRight: 10}}>
            <SelectorArrowRight
              {...{
                width: 5,
                height: 9,
                color: selectedWallet
                  ? theme.dark
                    ? Slate
                    : SlateDark
                  : White,
              }}
            />
          </ArrowContainer>
        ) : null}
      </OfferSelectorContainer>

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={offerSelectorModalVisible}
        onBackdropPress={onBackdropPress}
        fullscreen>
        <OfferSelectorModal
          modalContext={context}
          modalTitle={t('Partners')}
          coin={coin}
          fiatCurrency={fiatCurrency}
          offers={context === 'sellCrypto' ? sellOffers : offers}
          country={country}
          selectedWallet={selectedWallet}
          preSetPartner={preSetPartner}
          selectedPaymentMethod={
            context === 'sellCrypto' ? withdrawalMethod : paymentMethod
          }
          selectedOffer={selectedOffer}
          showOffersLoading={selectedOfferLoading}
          onPaymentMethodSelected={pm => {
            if (
              (pm &&
                context === 'buyCrypto' &&
                pm.method !== paymentMethod?.method) ||
              (context === 'sellCrypto' &&
                pm.method !== withdrawalMethod?.method)
            ) {
              setOffers(offersDefault);
              setSellOffers(sellOffersDefault);
              setSelectedOffer(undefined);
              onSelectOffer?.(undefined);
              if (context === 'buyCrypto') {
                setPaymentMethod(pm as PaymentMethod);
              } else if (context === 'sellCrypto') {
                setWithdrawalMethod(pm as WithdrawalMethod);
              }
              onSelectPaymentMethod?.(pm);
            }
          }}
          offerSelectorOnDismiss={selectedOffer => {
            if (selectedOffer) {
              if (context === 'buyCrypto') {
                setOfferSelectorText(
                  selectedOffer.label +
                    ' ' +
                    t('using') +
                    ' ' +
                    paymentMethod?.label,
                );
              } else if (context === 'sellCrypto') {
                setOfferSelectorText(
                  selectedOffer.label +
                    ' ' +
                    t('paid to') +
                    ' ' +
                    withdrawalMethod?.label,
                );
              }
              setSelectedOffer(selectedOffer);
              onSelectOffer?.(selectedOffer);
            }
            setOfferSelectorModalVisible(false);
          }}
        />
      </SheetModal>
    </ExternalServicesOfferSelectorContainer>
  );
};

export default memo(ExternalServicesOfferSelector);
