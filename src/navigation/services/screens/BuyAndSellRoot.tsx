import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import SwapCurrenciesSvg from '../../../../assets/img/swap-currencies.svg';
import Button, {ButtonState} from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  HEIGHT,
  WIDTH,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {orderBy, uniqBy} from 'lodash';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import {
  BuyCryptoExchangeKey,
  getAvailableFiatCurrencies,
  getBuyCryptoSupportedCoins,
} from '../buy-crypto/utils/buy-crypto-utils';
import {
  getAvailableSellCryptoFiatCurrencies,
  isCoinSupportedToSellBy,
  SellCryptoExchangeKey,
} from '../sell-crypto/utils/sell-crypto-utils';
import {
  ParseAmount,
  SatToUnit,
} from '../../../store/wallet/effects/amount/amount';
import {
  BitPay,
  LightBlack,
  Slate10,
  Slate30,
  SlateDark,
} from '../../../styles/colors';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getBadgeImg,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  getRateByCurrencyName,
  sleep,
} from '../../../utils/helper-methods';
import {useAppDispatch, useMount} from '../../../utils/hooks';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import {useLogger} from '../../../utils/hooks/useLogger';
import {getBuyCryptoFiatLimits} from '../../../store/buy-crypto/buy-crypto.effects';
import KeyEvent from 'react-native-keyevent';
import ArchaxFooter from '../../../components/archax/archax-footer';
import ExternalServicesOfferSelector, {
  CryptoOffer,
  SellCryptoOffer,
} from '../components/externalServicesOfferSelector';
import ExternalServicesAmountPills from '../components/externalServicesAmountPills';
import {AltCurrenciesRowProps} from '../../../components/list/AltCurrenciesRow';
import {StackActions} from '@react-navigation/native';
import ExternalServicesWalletSelector from '../components/externalServicesWalletSelector';
import {
  Key,
  SendMaxInfo,
  Token,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  BuyCryptoConfig,
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
  SellCryptoConfig,
} from '../../../store/external-services/external-services.types';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ExternalServicesGroupParamList,
  ExternalServicesScreens,
} from '../ExternalServicesGroup';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {getExternalServicesConfig} from '../../../store/external-services/external-services.effects';
import {AppActions} from '../../../store/app';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {ToWalletSelectorCustomCurrency} from '../../wallet/screens/GlobalSelect';
import {getCoinAndChainFromCurrencyCode} from '../../bitpay-id/utils/bitpay-id-utils';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  CurrencyOpts,
  SUPPORTED_COINS,
  SUPPORTED_TOKENS,
} from '../../../constants/currencies';
import {RootState} from '../../../store';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';
import {Analytics} from '../../../store/analytics/analytics.effects';
import uuid from 'react-native-uuid';
import {PaymentMethod} from '../buy-crypto/constants/BuyCryptoConstants';
import {
  BanxaCreateOrderData,
  BanxaCreateOrderRequestData,
  BanxaOrderData,
  BanxaPaymentData,
  MoonpayGetCurrenciesRequestData,
  MoonpayGetSignedPaymentUrlData,
  MoonpayGetSignedPaymentUrlReqData,
  MoonpayPaymentData,
  MoonpayPaymentType,
  SardineGetAuthTokenRequestData,
  SardinePaymentUrlConfigParams,
  SimplexPaymentData,
  TransakAccessTokenData,
  TransakGetSignedUrlRequestData,
  TransakPaymentData,
  TransakSignedUrlData,
} from '../../../store/buy-crypto/buy-crypto.models';
import cloneDeep from 'lodash.clonedeep';
import {
  banxaEnv,
  getBanxaChainFormat,
  getBanxaCoinFormat,
} from '../buy-crypto/utils/banxa-utils';
import {
  APP_DEEPLINK_PREFIX,
  APP_NAME_UPPERCASE,
} from '../../../constants/config';
import {BuyCryptoActions} from '../../../store/buy-crypto';
import {
  getMoonpayFixedCurrencyAbbreviation,
  getMoonpayPaymentMethodFormat,
  moonpayEnv,
} from '../buy-crypto/utils/moonpay-utils';
import {
  RampAssetInfo,
  RampGetAssetsData,
  RampGetAssetsRequestData,
  RampGetSellSignedPaymentUrlData,
  RampPaymentData,
  RampPaymentUrlConfigParams,
} from '../../../store/buy-crypto/models/ramp.models';
import {
  getChainFromRampChainFormat,
  getCoinFromRampCoinFormat,
  getRampChainFormat,
  getRampCoinFormat,
  getRampPaymentMethodFormat,
  rampEnv,
} from '../buy-crypto/utils/ramp-utils';
import {
  getSardineChainFormat,
  getSardineCoinFormat,
  getSardinePaymentMethodFormat,
  sardineEnv,
} from '../buy-crypto/utils/sardine-utils';
import {sardineGetSignedPaymentUrl} from '../../../store/buy-crypto/effects/sardine/sardine';
import {
  getPaymentUrl,
  simplexPaymentRequest,
} from '../buy-crypto/utils/simplex-utils';
import {
  getPassthroughUri,
  getTransakChainFormat,
  getTransakCoinFormat,
  getTransakPaymentMethodFormat,
  transakEnv,
} from '../buy-crypto/utils/transak-utils';
import {
  getErrorMessage,
  getExternalServiceSymbol,
  getSendMaxData,
} from '../utils/external-services-utils';
import {SellCryptoLimits} from '../../../store/sell-crypto/sell-crypto.models';
import {isEuCountry} from '../../../store/location/location.effects';
import {
  MoonpayCurrency,
  MoonpayCurrencyMetadata,
  MoonpayGetSellSignedPaymentUrlData,
  MoonpayGetSellSignedPaymentUrlRequestData,
  MoonpaySellOrderData,
} from '../../../store/sell-crypto/models/moonpay-sell.models';
import {
  getChainFromMoonpayNetworkCode,
  getMoonpaySellCurrenciesFixedProps,
  getMoonpaySellFixedCurrencyAbbreviation,
  getMoonpaySellPayoutMethodFormat,
  moonpaySellEnv,
} from '../sell-crypto/utils/moonpay-sell-utils';
import {moonpayGetCurrencies} from '../../../store/buy-crypto/effects/moonpay/moonpay';
import {
  getPayoutMethodKeyFromRampType,
  getRampSellCoinFormat,
  getRampSellCurrenciesFixedProps,
  rampSellEnv,
} from '../sell-crypto/utils/ramp-sell-utils';
import {rampGetAssets} from '../../../store/buy-crypto/effects/ramp/ramp';
import {
  SimplexCurrency,
  SimplexGetCurrenciesRequestData,
} from '../../../store/buy-crypto/models/simplex.models';
import {
  getChainFromSimplexNetworkCode,
  getSimplexSellCountryFormat,
  getSimplexSellFiatAmountLimits,
  getSimplexSellReturnURL,
  simplexSellEnv,
} from '../sell-crypto/utils/simplex-sell-utils';
import {simplexGetCurrencies} from '../../../store/buy-crypto/effects/simplex/simplex';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import _ from 'lodash';
import {startUpdateWalletStatus} from '../../../store/wallet/effects/status/status';
import {WithdrawalMethod} from '../sell-crypto/constants/SellCryptoConstants';
import {SellCryptoActions} from '../../../store/sell-crypto';
import {GetProtocolPrefixAddress} from '../../../store/wallet/utils/wallet';
import {useTheme} from 'styled-components/native';
import Modal from 'react-native-modal';
import {Linking, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import {
  RampOfframpSaleCreatedEvent,
  RampSellCreatedEventPayload,
  RampSellIncomingData,
  RampSellOrderData,
  RampSellSendCryptoPayload,
} from '../../../store/sell-crypto/models/ramp-sell.models';
import {
  SimplexSellPaymentRequestData,
  SimplexSellPaymentRequestReqData,
} from '../../../store/sell-crypto/models/simplex-sell.models';
import {useOngoingProcess, useTokenContext} from '../../../contexts';

const AmountContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View<{
  isSmallScreen?: boolean;
  justifyCenter?: boolean;
}>`
  width: 100%;
  flex-direction: row;
  justify-content: ${({justifyCenter}) =>
    justifyCenter ? 'center' : 'space-between'};
  align-items: center;
`;

export const AmountHeroContainer = styled.View<{isSmallScreen: boolean}>`
  flex-direction: column;
  align-items: center;
  margin-top: ${({isSmallScreen}) => (isSmallScreen ? 0 : '20px')};
  padding: 0 ${ScreenGutter};
`;

const ActionContainer = styled.View<{isModal?: boolean}>`
  margin-bottom: 15px;
  width: 100%;
`;

const ButtonContainer = styled.View`
  padding: 0 ${ScreenGutter};
`;

const ViewContainer = styled.View`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const VirtualKeyboardContainer = styled.View`
  justify-content: center;
  align-items: center;
`;

const Row = styled.View`
  flex-direction: row;
`;

const AmountText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '35px' : '50px')};
  font-weight: 500;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
`;

const AmountEquivText = styled(AmountText)`
  font-size: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  padding: 4px 8px;
  border-radius: 15px;
`;

const SelectedOfferAmountText = styled(AmountText)`
  font-size: 12px;
  padding: 2px 8px;
  margin-bottom: 4px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const CurrencySuperScript = styled.View`
  position: absolute;
  top: 10px;
  right: -20px;
`;
const CurrencyText = styled(BaseText)<{bigAmount?: boolean}>`
  font-size: ${({bigAmount}) => (bigAmount ? '12px' : '20px')};
  color: ${({theme}) => theme.colors.text};
  position: absolute;
`;

const SwapCurrenciesButton = styled(TouchableOpacity)<{
  isSmallScreen?: boolean;
}>`
  flex-direction: row;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate10)};
  padding: 5px;
  border-radius: 100px;
`;

export interface Limits {
  min?: number;
  max?: number;
}

export interface SellLimits {
  minAmount?: number;
  maxAmount?: number;
}

export interface SellLimitsOpts {
  maxWalletAmount?: string;
  limits: {
    minAmount?: number;
    maxAmount?: number;
  };
}

export interface SellCryptoCoin {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  protocol?: string; // Moonpay | Ramp | Simplex
  logoUri?: any;
  tokenAddress?: string | null;
  limits?: {
    min: number | undefined;
    max: number | undefined;
  };
  supportsTestMode?: boolean; // Moonpay
  precision?: number; // Moonpay | Ramp
}

export interface SellCryptoExchange {
  key: SellCryptoExchangeKey;
  showOffer: boolean;
  supportedCoins: SellCryptoCoin[] | undefined;
  disabled: boolean; // The offer card is shown but with an error message
  offerError: string | undefined;
  limits?: SellCryptoLimits;
  precision?: number; // used to adjust moonpay amount
}

export type PreLoadPartnersData = {
  [key in SellCryptoExchangeKey]: SellCryptoExchange;
};

const sellCryptoExchangesDefault: PreLoadPartnersData = {
  moonpay: {
    key: 'moonpay',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: {
      min: undefined,
      max: undefined,
    },
  },
  ramp: {
    key: 'ramp',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: {
      min: undefined,
      max: undefined,
    },
  },
  simplex: {
    key: 'simplex',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: {
      min: undefined,
      max: undefined,
    },
  },
};

export type ExternalServicesContext = 'buyCrypto' | 'sellCrypto';

export interface BuyAndSellRootProps {
  route?: any;
  navigation?: any;

  context: ExternalServicesContext;
  fromWallet?: Wallet;
  amount?: number; // deeplink params are strings, ensure this is number so offers will work
  currencyAbbreviation?: string; // used from charts and deeplinks.
  chain?: string; // used from charts and deeplinks.
  partner?: BuyCryptoExchangeKey | undefined; // used from deeplinks.
  fromDeeplink?: boolean;
  reduceTopGap?: boolean;
}

let buyCryptoConfig: BuyCryptoConfig | undefined;
let sellCryptoConfig: SellCryptoConfig | undefined;

const BuyAndSellRoot = ({
  route,
  navigation,
}: NativeStackScreenProps<
  ExternalServicesGroupParamList,
  ExternalServicesScreens.ROOT_BUY_AND_SELL
>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();

  const defaultAltCurrency: AltCurrenciesRowProps = useAppSelector(
    ({APP}) => APP.defaultAltCurrency,
  );
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const accessTokenTransak: TransakAccessTokenData | undefined = useAppSelector(
    ({BUY_CRYPTO}) => BUY_CRYPTO.tokens?.transak?.[transakEnv],
  );
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  const {tokenOptionsByAddress, tokenDataByAddress} = useTokenContext();
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainFromTokenByAddressKey(k);
      return getCurrencyAbbreviation(symbol.toLowerCase(), chain);
    },
  );
  const SupportedChains: string[] = SUPPORTED_COINS;

  const allKeys: {[key: string]: Key} = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys,
  );
  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);
  const curValRef = useRef('');
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  const _isSmallScreen = showArchaxBanner
    ? HEIGHT < 1000
      ? true
      : false
    : HEIGHT < 700;
  const country = locationData?.countryShortCode || 'US';

  // Real route params
  const context = route.params?.context;
  const fromWallet = route.params?.fromWallet;
  const fromAmount = route.params?.amount
    ? Number(route.params.amount)
    : undefined; // deeplink params are strings, ensure this is number so offers will work
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();
  const fromChain = route.params?.chain?.toLowerCase();
  const preSetPartner = route.params?.partner?.toLowerCase() as
    | BuyCryptoExchangeKey
    | undefined;
  const fromDeeplink = route.params?.fromDeeplink;

  const reduceTopGap = route.params?.reduceTopGap;

  let _buyCryptoSupportedCoins: string[] | undefined;
  if (context === 'buyCrypto') {
    _buyCryptoSupportedCoins = getBuyCryptoSupportedCoins(
      locationData,
      preSetPartner,
    );
  }

  const [buyCryptoSupportedCoins, setBuyCryptoSupportedCoins] = useState(
    _buyCryptoSupportedCoins,
  );
  const [buyCryptoSupportedCoinsFullObj, setBuyCryptoSupportedCoinsFullObj] =
    useState<ToWalletSelectorCustomCurrency[]>([]);

  const [sellCryptoSupportedCoins, setSellCryptoSupportedCoins] =
    useState<string[]>();
  const [sellCryptoSupportedCoinsFullObj, setSellCryptoSupportedCoinsFullObj] =
    useState<SellCryptoCoin[]>([]);

  const [selectedOffer, setSelectedOffer] = useState<
    CryptoOffer | SellCryptoOffer | undefined
  >();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    PaymentMethod | WithdrawalMethod | undefined
  >();
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [continueEnabled, setContinueEnabled] = useState(false);

  const fiatCurrency = useMemo<string>(() => {
    if (context === 'buyCrypto') {
      return getAvailableFiatCurrencies().includes(defaultAltCurrency.isoCode)
        ? defaultAltCurrency.isoCode
        : 'USD';
    } else if (context === 'sellCrypto') {
      return getAvailableSellCryptoFiatCurrencies().includes(
        defaultAltCurrency.isoCode,
      )
        ? defaultAltCurrency.isoCode
        : 'USD';
    }

    return defaultAltCurrency.isoCode;
  }, [context, defaultAltCurrency.isoCode]);

  // flag for primary selector type
  const [rate, setRate] = useState(0);
  // const [cryptoCurrencyAbbreviation, setCryptoCurrencyAbbreviation] = useState<string | undefined>(_cryptoCurrencyAbbreviation);
  const [amountConfig, updateAmountConfig] = useState({
    // display amount fiat/crypto
    displayAmount: '0',
    displayEquivalentAmount: '0',
    // amount to be sent to proposal creation (sats)
    amount: '0',
  });
  const [useSendMax, setUseSendMax] = useState<boolean>(false);
  const [sendMaxInfo, setSendMaxInfo] = useState<SendMaxInfo | undefined>();
  const [limits, setLimits] = useState<Limits>({
    min: undefined,
    max: undefined,
  });
  const [selectedPillValue, setSelectedPillValue] = useState<
    number | string | null
  >(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>();
  const [externalServicesConfig, setExternalServicesConfig] = useState<
    ExternalServicesConfig | undefined
  >();
  const [swapCurrenciesList, setSwapCurrenciesList] = useState<string[]>([
    fiatCurrency,
  ]);
  const [usingCurrency, setUsingCurrency] = useState<string>(fiatCurrency);
  const [usingCurrencyIsFiat, setUsingCurrencyIsFiat] = useState<boolean>(true);
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [loadingEnterAmountBtn, setLoadingEnterAmountBtn] =
    useState<boolean>(false);
  const [sellLimits, setSellLimits] = useState<SellLimitsOpts>({
    maxWalletAmount: undefined,
    limits: {
      minAmount: undefined,
      maxAmount: undefined,
    },
  });
  const [sellModalVisible, setSellModalVisible] = useState<{
    open: boolean;
    url: string | undefined;
    rampOffer?: SellCryptoOffer;
  }>({open: false, url: undefined, rampOffer: undefined});

  const updateAmount = (_val: string) => {
    const val = Number(_val);

    let _cryptoCurrencyAbbreviation;
    let _fromChain = fromChain;

    if (context === 'sellCrypto') {
      if (selectedWallet) {
        _cryptoCurrencyAbbreviation = selectedWallet.currencyAbbreviation;
        _fromChain = selectedWallet.chain;
      }
    }

    if (isNaN(val) || !_cryptoCurrencyAbbreviation || !_fromChain) {
      updateAmountConfig(current => ({
        ...current,
        displayAmount: _val,
        amount: _val,
      }));

      return;
    }

    const cryptoAmount =
      val === 0 || !_cryptoCurrencyAbbreviation
        ? '0'
        : dispatch(
            ParseAmount(
              usingCurrencyIsFiat ? val / rate : val,
              _cryptoCurrencyAbbreviation.toLowerCase(),
              _fromChain,
              selectedWallet?.tokenAddress, // TODO: review this
            ),
          ).amount;

    const fiatAmount = formatFiatAmount(val * rate, fiatCurrency, {
      currencyDisplay: 'symbol',
      currencyAbbreviation: usingCurrencyIsFiat
        ? undefined
        : _cryptoCurrencyAbbreviation,
    });

    updateAmountConfig(current => ({
      ...current,
      displayAmount: _val,
      displayEquivalentAmount: usingCurrencyIsFiat ? cryptoAmount : fiatAmount,
      amount: cryptoAmount,
    }));
  };
  const updateAmountRef = useRef(updateAmount);
  updateAmountRef.current = updateAmount;

  const onSwapCurrencies = (toCurrency: string) => {
    let newPrimaryIsFiat = usingCurrencyIsFiat;
    if (toCurrency === fiatCurrency) {
      newPrimaryIsFiat = true;
    } else {
      newPrimaryIsFiat = false;
    }

    updateAmountConfig(current => ({
      ...current,
      currency: toCurrency,
      primaryIsFiat: newPrimaryIsFiat,
      displayAmount: '0',
      displayEquivalentAmount: newPrimaryIsFiat
        ? formatFiatAmount(0, fiatCurrency, {
            currencyDisplay: 'symbol',
          })
        : '0',
    }));

    // reset amount on swap currencies
    curValRef.current = '';
    updateAmountRef.current('0');
  };

  const onCellPress = useCallback((val: string) => {
    haptic('soft');
    setUseSendMax(false);
    setSelectedPillValue(null);
    let newValue;
    switch (val) {
      case 'reset':
        newValue = '';
        break;
      case 'backspace':
        if (curValRef.current.length === 0) {
          return;
        }
        newValue = curValRef.current.slice(0, -1);
        break;
      case '.':
        newValue = curValRef.current.includes('.')
          ? curValRef.current
          : curValRef.current + val;
        break;
      default:
        newValue = curValRef.current + val;
    }
    curValRef.current = newValue;
    updateAmountRef.current(newValue);
  }, []);

  const sellCryptoSendMax = async () => {
    logger.debug(
      `Handling sellCryptoSendMax with: ${JSON.stringify(sellLimits)}`,
    );

    let sendMaxAmount: string;
    if (sellLimits?.limits?.maxAmount && sellLimits?.maxWalletAmount) {
      if (
        selectedWallet &&
        sellLimits.limits.maxAmount >= Number(sellLimits.maxWalletAmount)
      ) {
        let maxAmount: number | undefined;
        if (
          IsERCToken(selectedWallet.currencyAbbreviation, selectedWallet.chain)
        ) {
          setUseSendMax(true);
          setSendMaxInfo(undefined);
          maxAmount = Number(
            // @ts-ignore
            selectedWallet.balance.cryptoSpendable.replaceAll(',', ''),
          );
        } else {
          showOngoingProcess('WAITING_FOR_MAX_AMOUNT');
          setUseSendMax(true);
          const data = await getSendMaxData(selectedWallet);
          setSendMaxInfo(data);
          if (data?.amount) {
            maxAmount = dispatch(
              SatToUnit(
                data.amount,
                selectedWallet.currencyAbbreviation,
                selectedWallet.chain,
                selectedWallet.tokenAddress,
              ),
            );
          }
        }

        if (usingCurrencyIsFiat && rate && maxAmount) {
          sendMaxAmount = (maxAmount * rate).toFixed(2);
        } else {
          sendMaxAmount = maxAmount?.toFixed(8).replace(/\.?0+$/, '') || '0';
        }

        await sleep(300);
        hideOngoingProcess();
      } else {
        sendMaxAmount = sellLimits.limits.maxAmount.toString();
        if (usingCurrencyIsFiat && rate) {
          sendMaxAmount = (+sellLimits.limits.maxAmount * rate).toFixed(2);
        }
        curValRef.current = sendMaxAmount;
        updateAmountRef.current(sendMaxAmount);
        setUseSendMax(false);
      }

      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);

      await sleep(300);
      hideOngoingProcess();
    } else if (sellLimits?.maxWalletAmount && selectedWallet) {
      let maxAmount: number | undefined;
      if (
        IsERCToken(selectedWallet.currencyAbbreviation, selectedWallet.chain)
      ) {
        setUseSendMax(true);
        setSendMaxInfo(undefined);
        maxAmount = Number(
          // @ts-ignore
          selectedWallet.balance.cryptoSpendable.replaceAll(',', ''),
        );
      } else {
        showOngoingProcess('WAITING_FOR_MAX_AMOUNT');
        setUseSendMax(true);
        const data = await getSendMaxData(selectedWallet);
        setSendMaxInfo(data);
        if (data?.amount) {
          maxAmount = dispatch(
            SatToUnit(
              data.amount,
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
              selectedWallet.tokenAddress,
            ),
          );
        }
      }

      if (usingCurrencyIsFiat && rate && maxAmount) {
        sendMaxAmount = (maxAmount * rate).toFixed(2);
      } else {
        sendMaxAmount = maxAmount?.toFixed(8).replace(/\.?0+$/, '') || '0';
      }

      setUseSendMax(true);
      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);

      await sleep(300);
      hideOngoingProcess();
    } else {
      setUseSendMax(false);
      setSendMaxInfo(undefined);
    }
  };

  const getWarnMsg = useMemo<string | undefined>(() => {
    let msg: string | undefined;
    const cryptoCurrencyAbbreviation = cloneDeep(
      selectedWallet?.currencyAbbreviation,
    );

    if (+amountConfig.amount > 0) {
      if (limits.min && +amountConfig.amount < limits.min) {
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: cloneDeep(cryptoCurrencyAbbreviation).toUpperCase(),
          });
        }
      } else if (
        (!limits?.min || (limits.min && +amountConfig.amount >= limits.min)) &&
        sellLimits?.maxWalletAmount &&
        +amountConfig.amount > Number(sellLimits.maxWalletAmount)
      ) {
        msg =
          t('Not enough funds: ') +
          `${
            selectedWallet?.balance.cryptoSpendable
          } ${selectedWallet?.currencyAbbreviation.toUpperCase()} ${t(
            'available to sell',
          )}`;
      } else if (limits.max && +amountConfig.amount > limits.max) {
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: cloneDeep(cryptoCurrencyAbbreviation).toUpperCase(),
          });
        }
      }
    }

    return msg;
  }, [selectedWallet, amountConfig.amount, limits, context, sellLimits]);

  const initAmount = () => {
    if (!usingCurrency) {
      return;
    }
    if (fromAmount && !isNaN(fromAmount)) {
      // Valid fromAmount
      updateAmount(fromAmount.toString());
    } else {
      updateAmount('0');
    }
  };
  const initAmountRef = useRef(initAmount);
  initAmountRef.current = initAmount;

  const initLimits = (): void => {
    if (context === 'buyCrypto') {
      setLimits(dispatch(getBuyCryptoFiatLimits(undefined, fiatCurrency)));
    }
    // Sell crypto limits are set when selling coin is selected (from selectedWallet)
  };

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = (
      Object.values(tokenDataByAddress) as CurrencyOpts[]
    ).find(
      token =>
        token.coin === _currencyAbbreviation.toLowerCase() &&
        token.chain === _chain,
    );
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )!.img;
    } else if (foundToken?.logoURI) {
      return foundToken.logoURI;
    } else {
      return undefined;
    }
  };

  const initBuyCrypto = async () => {
    try {
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };
      const config: ExternalServicesConfig = await dispatch(
        getExternalServicesConfig(requestData),
      );
      buyCryptoConfig = config?.buyCrypto;
      setExternalServicesConfig(config);
      logger.debug('buyCryptoConfig: ' + JSON.stringify(buyCryptoConfig));
    } catch (err) {
      logger.error('getBuyCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (buyCryptoConfig?.disabled) {
      hideOngoingProcess();
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: buyCryptoConfig?.disabledTitle
            ? buyCryptoConfig.disabledTitle
            : t('Out of service'),
          message: buyCryptoConfig?.disabledMessage
            ? buyCryptoConfig.disabledMessage
            : t(
                'This feature is temporarily out of service. Please try again later.',
              ),
          type: 'warning',
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
      return;
    }

    if (preSetPartner) {
      logger.debug(
        `preSetPartner: ${preSetPartner} - fromAmount: ${fromAmount} - fromCurrencyAbbreviation: ${fromCurrencyAbbreviation} - fromChain: ${fromChain}`,
      );
    }

    const limits = dispatch(
      getBuyCryptoFiatLimits(preSetPartner, fiatCurrency),
    );

    if (
      limits.min !== undefined &&
      fromAmount !== undefined &&
      fromAmount < limits.min
    ) {
      curValRef.current = limits.min.toString();
      updateAmountRef.current(limits.min.toString());
    }
    if (
      limits.max !== undefined &&
      fromAmount !== undefined &&
      fromAmount > limits.max
    ) {
      curValRef.current = limits.max.toString();
      updateAmountRef.current(limits.max.toString());
    }

    if (!buyCryptoSupportedCoins) {
      // TODO: handle an error
      return;
    }

    // TODO: add the ability to remove coins or chains from buyCryptoConfig
    const coinsToRemove =
      !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];

    if (coinsToRemove.length > 0) {
      coinsToRemove.forEach((coin: string) => {
        const index = buyCryptoSupportedCoins.indexOf(coin);
        if (index > -1) {
          logger.debug(`Removing ${coin} from Buy Crypto supported coins`);
          buyCryptoSupportedCoins.splice(index, 1);
        }
      });
      setBuyCryptoSupportedCoins(buyCryptoSupportedCoins);
    }

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    const supportedCoins = orderBy(
      buyCryptoSupportedCoins,
      [
        (symbol: string) => {
          return orderedArray.includes(symbol)
            ? orderedArray.indexOf(symbol)
            : orderedArray.length;
        },
        'name',
      ],
      ['asc', 'asc'],
    );

    try {
      const initialBuyCryptoSupportedCoinsFullObj: ToWalletSelectorCustomCurrency[] =
        supportedCoins
          .map((symbol: string) => {
            const {coin, chain} = getCoinAndChainFromCurrencyCode(
              symbol,
              'buyCrypto',
            );
            const isErc20Token = IsERCToken(coin, chain);
            let foundToken: CurrencyOpts | undefined;
            if (isErc20Token) {
              foundToken = (
                Object.values({
                  ...BitpaySupportedTokens,
                  ...tokenDataByAddress,
                }) as CurrencyOpts[]
              ).find(token => token.coin === coin && token.chain === chain);
            }
            return {
              currencyAbbreviation: coin,
              symbol,
              name: (isErc20Token
                ? foundToken?.name || ''
                : BitpaySupportedCoins[chain]?.name)!,
              chain,
              logoUri: getLogoUri(coin, chain),
              badgeUri: getBadgeImg(coin, chain),
              tokenAddress: foundToken?.address,
            };
          })
          .filter(currency => !!currency.name);

      setBuyCryptoSupportedCoinsFullObj(initialBuyCryptoSupportedCoinsFullObj);
    } catch (error) {
      logger.error(
        'Buy crypto Error when trying to build the list of supported coins from: ' +
          JSON.stringify(supportedCoins),
      );
      hideOngoingProcess();
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: t('Out of service'),
          message: t(
            'There was an error building the list of supported coins. Please try again later.',
          ),
          type: 'warning',
          actions: [
            {
              text: t('OK'),
              action: async () => {
                await sleep(600);
                navigation.dispatch(StackActions.popToTop());
              },
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: async () => {
            await sleep(600);
            navigation.dispatch(StackActions.popToTop());
          },
        }),
      );
      return;
    }

    // TODO: review if this if(...) is necessary
    if (fromWallet?.id || fromCurrencyAbbreviation) {
      // TODO: selectFirstAvailableWallet
      // selectFirstAvailableWallet();
    } else {
      await sleep(500);
      hideOngoingProcess();
    }
  };

  const filterMoonpayCurrenciesConditions = (
    currency: MoonpayCurrency,
  ): boolean => {
    return (
      !currency.isSuspended &&
      currency.isSellSupported &&
      currency.type === 'crypto'
    );
  };

  const getMoonpayCurrencies = async () => {
    const requestData: MoonpayGetCurrenciesRequestData = {
      env: moonpaySellEnv,
    };
    const moonpayAllCurrencies: MoonpayCurrency[] = await moonpayGetCurrencies(
      requestData,
    );

    const moonpayAllSellCurrencies = moonpayAllCurrencies.filter(
      (moonpayCurrency: MoonpayCurrency) => {
        return filterMoonpayCurrenciesConditions(moonpayCurrency);
      },
    );

    const moonpayAllSellSupportedCurrenciesFixedProps: MoonpayCurrency[] =
      getMoonpaySellCurrenciesFixedProps(moonpayAllSellCurrencies);

    const allSupportedTokens: string[] = [...tokenOptions, ...SUPPORTED_TOKENS];
    const moonpaySellSupportedCurrenciesFullObj =
      moonpayAllSellSupportedCurrenciesFixedProps.filter(currency => {
        return (
          currency.metadata?.networkCode &&
          [...SupportedChains].includes(
            getChainFromMoonpayNetworkCode(
              currency.code,
              currency.metadata.networkCode,
            ),
          ) &&
          (currency.code === 'eth' ||
            (currency.metadata.contractAddress &&
            [
              'ethereum',
              'polygon',
              'arbitrum',
              'base',
              'optimism',
              'solana',
            ].includes(currency.metadata.networkCode.toLowerCase())
              ? allSupportedTokens.includes(
                  getCurrencyAbbreviation(
                    currency.code,
                    getChainFromMoonpayNetworkCode(
                      currency.code,
                      currency.metadata.networkCode,
                    ),
                  ),
                )
              : true))
        );
      });

    const moonpaySellSupportedCurrencies: SellCryptoCoin[] =
      moonpaySellSupportedCurrenciesFullObj.map(
        ({
          code,
          name,
          metadata,
          minSellAmount,
          maxSellAmount,
          supportsTestMode,
          precision,
        }: {
          code: string;
          name: string;
          metadata?: MoonpayCurrencyMetadata;
          minSellAmount?: number;
          maxSellAmount?: number;
          supportsTestMode?: boolean;
          precision?: number;
        }) => {
          const chain = getChainFromMoonpayNetworkCode(
            code,
            metadata?.networkCode,
          );
          return {
            currencyAbbreviation: code.toLowerCase(),
            symbol: getExternalServiceSymbol(code, chain),
            name,
            chain,
            protocol: metadata?.networkCode,
            logoUri: getLogoUri(code.toLowerCase(), chain),
            tokenAddress: metadata?.contractAddress,
            limits: {
              min: minSellAmount,
              max: maxSellAmount,
            },
            supportsTestMode,
            precision,
          };
        },
      );

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    let supportedCoins = orderBy(
      moonpaySellSupportedCurrencies,
      [
        coin => {
          return orderedArray.includes(coin.symbol)
            ? orderedArray.indexOf(coin.symbol)
            : orderedArray.length;
        },
        'name',
      ],
      ['asc', 'asc'],
    );

    return supportedCoins;
  };

  const filterRampCurrenciesConditions = (currency: RampAssetInfo): boolean => {
    return !currency.hidden && currency.enabled;
  };

  const getRampCurrencies = async () => {
    const requestData: RampGetAssetsRequestData = {
      env: rampSellEnv,
      flow: 'sell',
      // TODO: review if "fiatCurrency" is correct in currencyCode
      currencyCode: cloneDeep(fiatCurrency).toUpperCase(),
      withDisabled: false,
      withHidden: false,
      useIp: true,
    };

    const rampAllCurrencies: RampGetAssetsData = await rampGetAssets(
      requestData,
    );

    if (!rampAllCurrencies?.assets) {
      return [];
    }

    const rampAllSellCurrencies = rampAllCurrencies.assets.filter(
      (rampCurrency: RampAssetInfo) => {
        return filterRampCurrenciesConditions(rampCurrency);
      },
    );

    const rampAllSellSupportedCurrenciesFixedProps: RampAssetInfo[] =
      getRampSellCurrenciesFixedProps(rampAllSellCurrencies);

    const allSupportedTokens: string[] = [...tokenOptions, ...SUPPORTED_TOKENS];
    const rampSellSupportedCurrenciesFullObj =
      rampAllSellSupportedCurrenciesFixedProps.filter(currency => {
        return (
          currency.chain &&
          [...SupportedChains].includes(
            getChainFromRampChainFormat(currency.chain)!,
          ) &&
          (getCoinFromRampCoinFormat(currency.symbol) === 'eth' ||
            (currency.type !== 'NATIVE' &&
            ['eth', 'matic', 'arbitrum', 'base', 'optimism', 'solana'].includes(
              currency.chain.toLowerCase(),
            )
              ? allSupportedTokens.includes(
                  getCurrencyAbbreviation(
                    getCoinFromRampCoinFormat(currency.symbol),
                    getChainFromRampChainFormat(currency.chain)!,
                  ),
                )
              : true))
        );
      });

    const rampSellSupportedCurrencies: SellCryptoCoin[] =
      rampSellSupportedCurrenciesFullObj.map(
        ({
          symbol,
          chain,
          name,
          address,
          type,
          minPurchaseAmount,
          maxPurchaseAmount,
          decimals,
        }: {
          symbol: string;
          chain: string;
          name: string;
          address?: string | null;
          type: string;
          minPurchaseAmount?: number;
          maxPurchaseAmount?: number;
          decimals?: number;
        }) => {
          const _chain = getChainFromRampChainFormat(chain);
          return {
            currencyAbbreviation: symbol.toLowerCase(),
            symbol: getExternalServiceSymbol(symbol, _chain!),
            name,
            chain: _chain!,
            protocol: type,
            logoUri: getLogoUri(symbol.toLowerCase(), _chain!),
            tokenAddress: address,
            limits: {
              min:
                minPurchaseAmount && minPurchaseAmount > 0
                  ? minPurchaseAmount
                  : undefined,
              max:
                maxPurchaseAmount && maxPurchaseAmount > 0
                  ? maxPurchaseAmount
                  : undefined,
            },
            precision: decimals,
          };
        },
      );

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    let supportedCoins = orderBy(
      rampSellSupportedCurrencies,
      [
        coin => {
          return orderedArray.includes(coin.symbol)
            ? orderedArray.indexOf(coin.symbol)
            : orderedArray.length;
        },
        'name',
      ],
      ['asc', 'asc'],
    );

    return supportedCoins;
  };

  const filterSimplexCurrenciesConditions = (
    currency: SimplexCurrency,
  ): boolean => {
    return (
      // For now, BTC is the only coin supported for sale on Simplex.
      currency.ticker_symbol === 'BTC' && currency.network_code === 'bitcoin'
    );
  };

  const getSimplexCurrencies = async () => {
    const requestData: SimplexGetCurrenciesRequestData = {
      env: simplexSellEnv,
    };
    const simplexAllCurrencies: SimplexCurrency[] = await simplexGetCurrencies(
      requestData,
    );

    const simplexAllSellCurrencies = simplexAllCurrencies.filter(
      (simplexCurrency: SimplexCurrency) => {
        return filterSimplexCurrenciesConditions(simplexCurrency);
      },
    );

    const simplexSellSupportedCurrencies: SellCryptoCoin[] =
      simplexAllSellCurrencies.map((simplexCurrency: SimplexCurrency) => {
        const coin = simplexCurrency.ticker_symbol.toLowerCase();
        const chain = getChainFromSimplexNetworkCode(
          coin,
          simplexCurrency.network_code,
        );
        return {
          currencyAbbreviation: coin,
          symbol: getExternalServiceSymbol(coin, chain),
          name: simplexCurrency.name,
          chain,
          protocol: simplexCurrency.network_code,
          logoUri: getLogoUri(coin.toLowerCase(), chain),
          tokenAddress: simplexCurrency.contract_address ?? undefined,
          limits: {
            min: simplexCurrency.fixed_min_amount ?? undefined,
            max: undefined,
          },
        };
      });

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    let supportedCoins = orderBy(
      simplexSellSupportedCurrencies,
      [
        coin => {
          return orderedArray.includes(coin.symbol)
            ? orderedArray.indexOf(coin.symbol)
            : orderedArray.length;
        },
        'name',
      ],
      ['asc', 'asc'],
    );

    return supportedCoins;
  };

  const initSellCrypto = async () => {
    try {
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };
      const config: ExternalServicesConfig = await dispatch(
        getExternalServicesConfig(requestData),
      );
      sellCryptoConfig = config?.sellCrypto;
      logger.debug('sellCryptoConfig: ' + JSON.stringify(sellCryptoConfig));
    } catch (err) {
      logger.error('getSellCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (sellCryptoConfig?.disabled) {
      hideOngoingProcess();
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: sellCryptoConfig?.disabledTitle
            ? sellCryptoConfig.disabledTitle
            : t('Out of service'),
          message: sellCryptoConfig?.disabledMessage
            ? sellCryptoConfig.disabledMessage
            : t(
                'This feature is temporarily out of service. Please try again later.',
              ),
          type: 'warning',
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
      return;
    }

    const supportedExchanges: SellCryptoExchangeKey[] = Object.keys(
      sellCryptoExchangesDefault,
    ) as SellCryptoExchangeKey[];

    // prevent "getCurrencies" from deleted or disabled exchanges
    supportedExchanges.forEach(exchange => {
      if (sellCryptoConfig && sellCryptoConfig[exchange]) {
        sellCryptoExchangesDefault[exchange].showOffer =
          !sellCryptoConfig[exchange]?.removed;
        sellCryptoExchangesDefault[exchange].disabled =
          !!sellCryptoConfig[exchange]?.disabled;
      }

      if (exchange === 'simplex' && sellCryptoExchangesDefault.simplex) {
        // Simplex sell only available in the EU
        sellCryptoExchangesDefault.simplex.showOffer =
          !!(
            locationData?.countryShortCode &&
            isEuCountry(locationData.countryShortCode)
          ) || !!(user?.country && isEuCountry(user.country));
      }
    });

    const enabledExchanges = Object.values(sellCryptoExchangesDefault)
      .filter(
        exchange =>
          exchange.showOffer &&
          !exchange.disabled &&
          (!preSetPartner || exchange.key === preSetPartner),
      )
      .map(exchange => exchange.key);

    if (!enabledExchanges || enabledExchanges.length === 0) {
      logger.error(
        'There are no partners with offers available for the user parameters.',
      );
      let msg: string;

      if (
        preSetPartner === 'simplex' &&
        !(
          isEuCountry(locationData?.countryShortCode) ||
          isEuCountry(user?.country)
        )
      ) {
        msg = t(
          'Sell Crypto feature is currently unavailable in your country. Please try again later.',
        );
      } else {
        msg = t(
          'Sell Crypto feature is not available at this moment. Please try again later.',
        );
      }
      const reason =
        'initSellCrypto Error. Could not get enabledExchanges for the user parameters';
      hideOngoingProcess();
      await sleep(100);
      showError(undefined, msg, reason);
      return;
    }

    const getCurrenciesPromiseByExchange = (
      exchange: SellCryptoExchangeKey,
    ) => {
      switch (exchange) {
        case 'moonpay':
          return getMoonpayCurrencies();
        case 'ramp':
          return getRampCurrencies();
        case 'simplex':
          return getSimplexCurrencies();
        default:
          return Promise.resolve([]);
      }
    };

    const getCurrenciesPromises = enabledExchanges.map(exchange =>
      getCurrenciesPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getCurrenciesPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SellCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      let allSupportedCoins: SellCryptoCoin[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.error(
              `Sell crypto getCurrencies[${index}] Rejected: + ${JSON.stringify(
                e.promiseRes.reason,
              )}`,
            );
            if (e.promiseRes.reason instanceof Error) {
              switch (e.exchangeKey) {
                case 'moonpay':
                  logger.debug(
                    'getMoonpayCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  sellCryptoExchangesDefault.moonpay.showOffer = false;
                  break;
                case 'ramp':
                  logger.debug(
                    'getRampCurrencies Error: ' + e.promiseRes.reason.message,
                  );
                  sellCryptoExchangesDefault.ramp.showOffer = false;
                  break;
                case 'simplex':
                  logger.debug(
                    'getSimplexCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  sellCryptoExchangesDefault.simplex.showOffer = false;
                  break;
                default:
                  logger.debug('Error: ' + e.promiseRes.reason.message);
                  break;
              }
            }
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'moonpay':
                sellCryptoExchangesDefault.moonpay.supportedCoins = e.promiseRes
                  .value as SellCryptoCoin[];
                break;
              case 'ramp':
                sellCryptoExchangesDefault.ramp.supportedCoins = e.promiseRes
                  .value as SellCryptoCoin[];
                break;
              case 'simplex':
                sellCryptoExchangesDefault.simplex.supportedCoins = e.promiseRes
                  .value as SellCryptoCoin[];
                break;
              default:
                break;
            }

            allSupportedCoins = [
              ...allSupportedCoins,
              ...((e.promiseRes.value as SellCryptoCoin[]) || []),
            ];
          }
        });

        if (allSupportedCoins.length > 0) {
          const coinsToRemove =
            !locationData || locationData.countryShortCode === 'US'
              ? ['xrp']
              : [];
          coinsToRemove.push('busd');

          if (coinsToRemove.length > 0) {
            logger.debug(
              `Removing ${JSON.stringify(
                coinsToRemove,
              )} from Sell supported coins`,
            );
            allSupportedCoins = allSupportedCoins.filter(
              supportedCoin =>
                !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
            );
          }

          allSupportedCoins = uniqBy(allSupportedCoins, 'symbol');
        }

        // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
        const orderedArray = SupportedCurrencyOptions.map(currency =>
          currency.chain
            ? getCurrencyAbbreviation(
                currency.currencyAbbreviation,
                currency.chain,
              )
            : currency.currencyAbbreviation,
        );
        let allSupportedCoinsOrdered = orderBy(
          allSupportedCoins,
          [
            coin => {
              return orderedArray.includes(coin.symbol)
                ? orderedArray.indexOf(coin.symbol)
                : orderedArray.length;
            },
            'name',
          ],
          ['asc', 'asc'],
        );

        if (allSupportedCoinsOrdered?.length > 0) {
          setSellCryptoSupportedCoinsFullObj(allSupportedCoinsOrdered);
          const _sellCryptoSupportedCoins = allSupportedCoinsOrdered?.map(
            ({symbol}) => symbol,
          );
          setSellCryptoSupportedCoins(_sellCryptoSupportedCoins);
          await sleep(100);
          hideOngoingProcess();
        } else {
          logger.error(
            'Sell crypto getCurrencies Error: allSupportedCoins array is empty',
          );
          const msg = t(
            'Sell Crypto feature is not available at this moment. Please try again later.',
          );
          hideOngoingProcess();
          await sleep(500);
          showError(undefined, msg, undefined, undefined, true);
        }
      }
    } catch (err) {
      logger.error('Sell crypto getCurrencies Error: ' + JSON.stringify(err));
      const msg = t(
        'Sell Crypto feature is not available at this moment. Please try again later.',
      );
      hideOngoingProcess();
      await sleep(500);
      showError(undefined, msg, undefined, undefined, true);
    }
  };

  const init = async () => {
    if (fromDeeplink) {
      await sleep(200);
    }
    await sleep(100);
    showOngoingProcess('GENERAL_AWAITING');
  };

  const updateWalletStatus = async (
    wallet: Wallet,
    skipStatusUpdate?: boolean,
  ) => {
    if (!wallet) {
      return;
    }

    if (!skipStatusUpdate) {
      setLoadingWalletFromStatus(true);

      const key = allKeys[wallet.keyId];
      try {
        await dispatch(startUpdateWalletStatus({key, wallet, force: true}));
      } catch (err) {
        logger.warn('Failed to update balances from Sell Crypto');
      }
    }

    setLoadingWalletFromStatus(false);
  };

  const sellGetLimits = async () => {
    setLoadingEnterAmountBtn(true);
    if (!selectedWallet) {
      setLoadingEnterAmountBtn(false);
      return;
    }

    const sellSymbol = getExternalServiceSymbol(
      selectedWallet.currencyAbbreviation,
      selectedWallet.chain,
    );
    logger.debug(`Updating max and min for: ${sellSymbol}`);

    const enabledExchanges = Object.values(sellCryptoExchangesDefault)
      .filter(
        exchange =>
          (!preSetPartner || exchange.key === preSetPartner) &&
          exchange.showOffer &&
          !exchange.disabled &&
          exchange.supportedCoins &&
          exchange.supportedCoins.length > 0 &&
          isCoinSupportedToSellBy(
            exchange.key,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            locationData?.countryShortCode || 'US',
          ),
      )
      .map(exchange => exchange.key);

    const getLimitsPromiseByExchange = (exchange: SellCryptoExchangeKey) => {
      switch (exchange) {
        case 'moonpay':
          return moonpayGetLimits(selectedWallet);
        case 'ramp':
          return rampGetLimits(selectedWallet);
        case 'simplex':
          return simplexGetLimits(selectedWallet);
        default:
          return Promise.reject('No getLimits function for this partner');
      }
    };

    const getLimitsPromises = enabledExchanges.map(exchange =>
      getLimitsPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getLimitsPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SellCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      let allLimits: SellLimits[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.debug(
              `Sell crypto getLimits[${
                e.exchangeKey
              }] Rejected: + ${JSON.stringify(e.promiseRes.reason)}`,
            );
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'moonpay':
                sellCryptoExchangesDefault.moonpay.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SellLimits);
                break;
              case 'ramp':
                sellCryptoExchangesDefault.ramp.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SellLimits);
                break;
              case 'simplex':
                sellCryptoExchangesDefault.simplex.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SellLimits);
                break;
            }
          }
        });

        if (allLimits.length > 0) {
          // If at least one enabled exchange does not have limits, then I set the limits to undefined,
          // this way the user can put any value in Amount modal
          const minMinAmount = allLimits.find(
            limit => limit.minAmount === undefined,
          )
            ? undefined
            : _.minBy(allLimits, 'minAmount')?.minAmount;
          const maxMaxAmount = allLimits.find(
            limit => limit.maxAmount === undefined,
          )
            ? undefined
            : _.maxBy(allLimits, 'maxAmount')?.maxAmount;

          setSellLimits({
            limits: {
              minAmount: minMinAmount,
              maxAmount: maxMaxAmount,
            },
            maxWalletAmount:
              // @ts-ignore
              selectedWallet?.balance?.cryptoSpendable?.replaceAll(',', ''),
          });

          setLimits({
            min: minMinAmount,
            max: maxMaxAmount,
          });
        }
      }
      setLoadingEnterAmountBtn(false);
    } catch (err) {
      logger.error('Sell crypto getLimits Error: ' + JSON.stringify(err));
      setLoadingEnterAmountBtn(false);
      const msg = t(
        'Sell Crypto feature is not available at this moment. Please try again later.',
      );
      const reason = 'Sell crypto getLimits Error';
      hideOngoingProcess();
      await sleep(200);
      showError(undefined, msg, reason);
    }
  };

  const moonpayGetLimits = async (
    wallet: Wallet,
  ): Promise<SellLimits | undefined> => {
    let moonpayLimits: SellLimits = {
      minAmount: undefined,
      maxAmount: undefined,
    };
    if (sellCryptoExchangesDefault.moonpay.supportedCoins) {
      const selectedCoin =
        sellCryptoExchangesDefault.moonpay.supportedCoins.find(
          coin =>
            coin.symbol ===
            getExternalServiceSymbol(wallet.currencyAbbreviation, wallet.chain),
        );

      if (selectedCoin) {
        moonpayLimits = {
          minAmount: selectedCoin.limits?.min,
          maxAmount: selectedCoin.limits?.max,
        };
      }
    }

    return Promise.resolve(moonpayLimits);
  };

  const rampGetLimits = async (
    wallet: Wallet,
  ): Promise<SellLimits | undefined> => {
    let rampLimits: SellLimits = {
      minAmount: undefined,
      maxAmount: undefined,
    };
    if (sellCryptoExchangesDefault.ramp.supportedCoins) {
      const selectedCoin = sellCryptoExchangesDefault.ramp.supportedCoins.find(
        coin =>
          coin.symbol ===
          getExternalServiceSymbol(wallet.currencyAbbreviation, wallet.chain),
      );

      if (selectedCoin) {
        rampLimits = {
          minAmount: selectedCoin.limits?.min,
          maxAmount: selectedCoin.limits?.max,
        };
      }
    }

    return Promise.resolve(rampLimits);
  };

  const simplexGetLimits = async (
    wallet: Wallet,
  ): Promise<SellLimits | undefined> => {
    let simplexLimits: SellLimits = {
      minAmount: undefined,
      maxAmount: undefined,
    };
    if (sellCryptoExchangesDefault.simplex.supportedCoins) {
      const selectedCoin =
        sellCryptoExchangesDefault.simplex.supportedCoins.find(
          coin =>
            coin.symbol ===
            getExternalServiceSymbol(wallet.currencyAbbreviation, wallet.chain),
        );

      if (selectedCoin) {
        const simplexSellFiatLimits = getSimplexSellFiatAmountLimits();

        const rateByCurrency = getRateByCurrencyName(
          allRates,
          selectedCoin.currencyAbbreviation?.toLowerCase(),
          selectedCoin.chain?.toLowerCase(),
          selectedCoin.tokenAddress,
        );
        const rateForCoinAndFiat = rateByCurrency?.find(
          r => r.code === simplexSellFiatLimits.fiatCurrency,
        );

        if (rateForCoinAndFiat) {
          const fiatRate = rateForCoinAndFiat.rate;
          simplexLimits = {
            minAmount: simplexSellFiatLimits.min / fiatRate,
            maxAmount: simplexSellFiatLimits.max / fiatRate,
          };
        }
      }
    }

    return Promise.resolve(simplexLimits);
  };

  useMount(() => {
    init();
    if (context === 'buyCrypto') {
      try {
        initBuyCrypto();
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`[Buy] could not initialize view: ${errStr}`);
        hideOngoingProcess();
      }
    } else if (context === 'sellCrypto') {
      try {
        initSellCrypto();
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`[Sell] could not initialize view: ${errStr}`);
        hideOngoingProcess();
      }
    }

    try {
      initAmountRef.current();
    } catch (err: any) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`[Buy/Sell Amount] could not initialize view: ${errStr}`);
    }
    initLimits();
  });

  useEffect(() => {
    KeyEvent.onKeyUpListener((keyEvent: any) => {
      if (keyEvent.pressedKey === '\b') {
        onCellPress('backspace');
      } else if (keyEvent.pressedKey === '\r' && continueEnabled) {
        // onSubmit?.(+curValRef.current);
        // TODO: handle continue with keyboard
      } else if (keyEvent.pressedKey === 'UIKeyInputEscape') {
        onCellPress('reset');
      } else if (keyEvent.pressedKey === '0') {
        onCellPress('0');
      } else if (keyEvent.pressedKey === '.') {
        onCellPress('.');
      } else if (Number(keyEvent.pressedKey)) {
        onCellPress(keyEvent.pressedKey);
      }
    });
    return () => KeyEvent.removeKeyUpListener();
  }, [continueEnabled]);

  useEffect(() => {
    if (
      selectedOffer &&
      buttonState !== 'loading' &&
      !openingBrowser &&
      !getWarnMsg
    ) {
      setContinueEnabled(true);
    } else {
      setContinueEnabled(false);
    }
  }, [selectedOffer, buttonState, openingBrowser, getWarnMsg]);

  useEffect(() => {
    if (
      selectedPillValue !== null &&
      selectedPillValue !== 'max' &&
      curValRef.current !== selectedPillValue.toString()
    ) {
      setSelectedPillValue(null);
    }
  }, [curValRef.current]);

  useEffect(() => {
    if (context === 'sellCrypto' && selectedWallet?.currencyAbbreviation) {
      const cryptoCurrency = cloneDeep(selectedWallet.currencyAbbreviation);
      setSwapCurrenciesList([
        ...new Set([formatCurrencyAbbreviation(cryptoCurrency), fiatCurrency]),
      ]);
    } else {
      setSwapCurrenciesList([fiatCurrency]);
    }
  }, [selectedWallet, fiatCurrency, context]);

  useEffect(() => {
    if (selectedWallet) {
      navigation.setParams({fromWallet: selectedWallet});

      if (context === 'sellCrypto') {
        // TODO: Clean amount?
        // curValRef.current = '0';
        // updateAmountRef.current('0');
        // setSelectedPillValue(null);

        // Update wallet status
        updateWalletStatus(selectedWallet);

        // Set Moonpay preload data
        if (
          sellCryptoExchangesDefault.moonpay.supportedCoins &&
          sellCryptoExchangesDefault.moonpay.supportedCoins.length > 0
        ) {
          const selectedCoin =
            sellCryptoExchangesDefault.moonpay.supportedCoins.find(
              coin =>
                coin.symbol ===
                getExternalServiceSymbol(
                  selectedWallet.currencyAbbreviation,
                  selectedWallet.chain,
                ),
            );
          // setMoonpaySelectedCoin(selectedCoin);
          sellCryptoExchangesDefault.moonpay.precision =
            selectedCoin?.precision;

          // TODO: review if needed
          // sellGetLimits();
        }

        // Set Sell limits
        if (sellCryptoSupportedCoins && sellCryptoSupportedCoins.length > 0) {
          sellGetLimits();
        }

        const currency = cloneDeep(
          selectedWallet.currencyAbbreviation,
        ).toUpperCase();
        const fromChain = cloneDeep(selectedWallet.chain);

        setUsingCurrency(currency);
        setUsingCurrencyIsFiat(false);

        // if added for dev (hot reload)
        if (
          getRateByCurrencyName(allRates, currency.toLowerCase(), fromChain)
        ) {
          const rateByCurrencyName = getRateByCurrencyName(
            allRates,
            currency.toLowerCase(),
            fromChain,
            selectedWallet.tokenAddress, // TODO: review this
          );
          const fiatRateData = rateByCurrencyName.find(
            r => r.code === fiatCurrency,
          );

          if (!fiatRateData) {
            logger.warn(
              `There is no fiatRateData for: ${currency.toLowerCase()} (${fromChain}) and ${fiatCurrency}. Setting rate to 0.`,
            );
            setRate(0);
            return;
          }

          const fiatRate = fiatRateData.rate;
          setRate(fiatRate);
        }
      }
    }
  }, [selectedWallet, navigation, allRates, fiatCurrency, context]);

  const goToBuyCheckout = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ): void => {
    setButtonState('loading');
    setOpeningBrowser(true);
    dispatch(
      BuyCryptoActions.updateBuyCryptoOpts({
        buyCryptoOpts: {
          selectedPaymentMethod: paymentMethod.method,
        },
      }),
    );
    switch (offer.key) {
      case 'banxa':
        goToBanxaBuyPage(offer, paymentMethod);
        break;

      case 'moonpay':
        goToMoonpayBuyPage(offer, paymentMethod);
        break;

      case 'ramp':
        goToRampBuyPage(offer, paymentMethod);
        break;

      case 'sardine':
        goToSardineBuyPage(offer, paymentMethod);
        break;

      case 'simplex':
        goToSimplexBuyPage(offer, paymentMethod);
        break;

      case 'transak':
        goToTransakBuyPage(offer, paymentMethod);
        break;
    }
  };

  const goToBanxaBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToBanxa(offer, paymentMethod);
  };

  const continueToBanxa = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('Banxa Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const banxaExternalId = uuid.v4().toString();
    const coin = cloneDeep(selectedWallet.currencyAbbreviation).toLowerCase();

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'banxa',
        fiatAmount: offer.fiatAmount,
        fiatCurrency: offer.fiatCurrency,
        paymentMethod: paymentMethod.method,
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: destinationChain?.toLowerCase(),
      }),
    );

    const quoteData: BanxaCreateOrderRequestData = {
      env: banxaEnv,
      account_reference: user?.eid ?? selectedWallet.id,
      payment_method_id: offer.paymentMethodId,
      source: offer.fiatCurrency,
      source_amount: cloneDeep(offer.fiatAmount).toString(),
      target: getBanxaCoinFormat(coin),
      wallet_address: address,
      blockchain: getBanxaChainFormat(selectedWallet.chain),
      return_url_on_success: `${APP_DEEPLINK_PREFIX}banxa?externalId=${banxaExternalId}&status=pending`,
      return_url_on_cancelled: `${APP_DEEPLINK_PREFIX}banxaCancelled?externalId=${banxaExternalId}&status=cancelled`,
      return_url_on_failure: `${APP_DEEPLINK_PREFIX}banxaFailed?externalId=${banxaExternalId}&status=failed`,
    };

    let data: BanxaCreateOrderData, banxaOrderData: BanxaOrderData;
    try {
      const _data = await selectedWallet.banxaCreateOrder(quoteData);
      data = _data?.body ?? _data;
    } catch (err) {
      setOpeningBrowser(false);
      const title = t('Banxa Error');
      const msg = getErrorMessage(err);
      const reason = 'banxaCreateOrder Error';
      showError(title, msg, reason);
      return;
    }

    if (data?.data?.order?.checkout_url && data?.data?.order?.id) {
      banxaOrderData = data.data.order;
    } else {
      setOpeningBrowser(false);
      const title = t('Banxa Error');
      const reason =
        'banxaCreateOrder Error: No checkout_url or id value provided from Banxa';
      showError(title, reason, reason);
      return;
    }

    const newData: BanxaPaymentData = {
      address,
      created_on: Date.now(),
      crypto_amount: Number(offer.amountReceiving),
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offer.buyAmount!,
      fiat_total_amount: offer.amountCost!,
      fiat_total_amount_currency: offer.fiatCurrency,
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
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const goToMoonpayBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToMoonpay(offer, paymentMethod);
  };

  const continueToMoonpay = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('MoonPay Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const externalTransactionId = `${selectedWallet.id}-${Date.now()}`;
    const coin = cloneDeep(selectedWallet.currencyAbbreviation).toLowerCase();

    const newData: MoonpayPaymentData = {
      address,
      created_on: Date.now(),
      crypto_amount: Number(offer.amountReceiving),
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offer.buyAmount!,
      fiat_total_amount: offer.amountCost!,
      fiat_total_amount_currency: offer.fiatCurrency,
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
        fiatAmount: offer.fiatAmount,
        fiatCurrency: offer.fiatCurrency,
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
      baseCurrencyCode: offer.fiatCurrency.toLowerCase(),
      baseCurrencyAmount: offer.fiatAmount,
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
      const _data: any = await selectedWallet.moonpayGetSignedPaymentUrl(
        quoteData,
      );
      data = _data?.body ?? _data;
    } catch (err) {
      setOpeningBrowser(false);
      const title = t('MoonPay Error');
      const reason = 'moonpayGetSignedPaymentUrl Error';
      showError(title, reason, reason);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const goToRampBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToRamp(offer, paymentMethod);
  };

  const continueToRamp = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('Ramp Network Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const rampExternalId = uuid.v4().toString();
    const coin = cloneDeep(selectedWallet.currencyAbbreviation).toLowerCase();
    const chain = cloneDeep(selectedWallet.chain);

    const newData: RampPaymentData = {
      address,
      chain: destinationChain,
      created_on: Date.now(),
      crypto_amount: Number(offer.amountReceiving),
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offer.buyAmount!,
      fiat_total_amount: offer.amountCost!,
      fiat_total_amount_currency: offer.fiatCurrency,
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
        fiatAmount: offer.fiatAmount,
        fiatCurrency: offer.fiatCurrency,
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
      swapAmount: offer.amountReceivingUnit!,
      fiatCurrency: offer.fiatCurrency,
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
      const _data = await selectedWallet.rampGetSignedPaymentUrl(quoteData);
      data = _data?.body ?? _data;
    } catch (err) {
      setOpeningBrowser(false);
      const title = t('Ramp Network Error');
      const reason = 'rampGetSignedPaymentUrl Error';
      showError(title, reason, reason);
      return;
    }

    if (!data || !data.urlWithSignature) {
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      setOpeningBrowser(false);
      const title = t('Ramp Network Error');
      const reason =
        'rampGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showError(title, err, reason);
      return;
    }

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const goToSardineBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToSardine(offer, paymentMethod);
  };

  const continueToSardine = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('Sardine Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const sardineExternalId = uuid.v4().toString();
    const coin = cloneDeep(selectedWallet.currencyAbbreviation).toLowerCase();
    const chain = cloneDeep(selectedWallet.chain);

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
      const _authTokenData = await selectedWallet.sardineGetToken(quoteData);
      authTokenData = _authTokenData?.body ?? _authTokenData;
    } catch (err) {
      setOpeningBrowser(false);
      const title = t('Sardine Error');
      const reason = 'sardineGetAuthToken Error';
      const msg = getErrorMessage(err);
      showError(title, msg, reason);
      return;
    }

    dispatch(
      Analytics.track('Requested Crypto Purchase', {
        exchange: 'sardine',
        fiatAmount: offer.fiatAmount,
        fiatCurrency: offer.fiatCurrency,
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
      Number(offer.amountReceiving) +
      '&coin=' +
      coin.toUpperCase() +
      '&env=' +
      (__DEV__ ? 'dev' : 'prod') +
      '&fiatBaseAmount=' +
      offer.buyAmount +
      '&fiatTotalAmount=' +
      offer.amountCost +
      '&fiatTotalAmountCurrency=' +
      offer.fiatCurrency;

    const quoteData: SardinePaymentUrlConfigParams = {
      env: sardineEnv,
      client_token: authTokenData.clientToken,
      address,
      redirect_url: redirectUrl,
      fixed_fiat_amount: offer.fiatAmount,
      fixed_fiat_currency: offer.fiatCurrency,
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
      setOpeningBrowser(false);
      const title = t('Sardine Error');
      const reason = 'sardineGetSignedPaymentUrl Error';
      const msg = getErrorMessage(err);
      showError(title, msg, reason);
      return;
    }

    if (!checkoutUrl) {
      setOpeningBrowser(false);
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      const title = t('Sardine Error');
      const reason =
        'sardineGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showError(title, err, reason);
      return;
    }

    dispatch(openUrlWithInAppBrowser(checkoutUrl));
    await sleep(500);
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const goToSimplexBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToSimplex(offer, paymentMethod);
  };

  const continueToSimplex = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('Simplex Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const quoteData = {
      quoteId: offer.quoteData.quote_id,
      currency: offer.fiatCurrency,
      fiatTotalAmount: offer.quoteData.fiat_money.total_amount,
      cryptoAmount: offer.quoteData.digital_money.amount,
    };

    simplexPaymentRequest(selectedWallet, address, quoteData, createdOn)
      .then(async _req => {
        const req = _req?.body ?? _req;
        if (req && req.error) {
          const title = t('Simplex Error');
          const reason = 'simplexPaymentRequest Error';
          showError(title, req.error, reason);
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
        const coin = cloneDeep(
          selectedWallet.currencyAbbreviation,
        ).toLowerCase();

        const newData: SimplexPaymentData = {
          address,
          created_on: Date.now(),
          crypto_amount: offer.quoteData.digital_money.amount,
          chain: destinationChain,
          coin: coin.toUpperCase(),
          env: __DEV__ ? 'dev' : 'prod',
          fiat_base_amount: offer.quoteData.fiat_money.base_amount,
          fiat_total_amount: offer.quoteData.fiat_money.total_amount,
          fiat_total_amount_currency: offer.fiatCurrency,
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
            fiatAmount: offer.fiatAmount,
            fiatCurrency: offer.fiatCurrency,
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
        setOpeningBrowser(false);
        navigation.goBack();
      })
      .catch(err => {
        const title = t('Simplex Error');
        const msg = getErrorMessage(err);
        const reason = 'simplexPaymentRequest Error';
        showError(title, msg, reason);
        setOpeningBrowser(false);
        return;
      });
  };

  const goToTransakBuyPage = (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToTransak(offer, paymentMethod);
  };

  const continueToTransak = async (
    offer: CryptoOffer,
    paymentMethod: PaymentMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const title = t('Transak Error');
      const msg = getErrorMessage(err);
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
      return;
    }

    const destinationChain = selectedWallet.chain;
    const transakExternalId = uuid.v4().toString();
    const coin = cloneDeep(selectedWallet.currencyAbbreviation).toLowerCase();
    const chain = cloneDeep(selectedWallet.chain);

    const nowTimestamp = (Date.now() / 1000) | 0;
    let _accessToken = accessTokenTransak?.accessToken;
    let _expiresAt = accessTokenTransak?.expiresAt;
    if (!_accessToken || !_expiresAt || _expiresAt < nowTimestamp) {
      if (_expiresAt && _expiresAt < nowTimestamp) {
        logger.debug('Transak access token expired. Fetching new one...');
      }
      try {
        let data: TransakAccessTokenData | undefined;
        const _data = await selectedWallet.transakGetAccessToken({
          env: transakEnv,
        });
        data = _data?.body?.data ?? _data;

        if (data?.accessToken) {
          logger.debug('Transak access token fetched successfully.');
          dispatch(
            BuyCryptoActions.updateAccessTokenTransak({
              env: transakEnv,
              ...data,
            }),
          );
          _accessToken = data.accessToken;
        } else {
          const err = t('Could not fetch Transak access token');
          const title = t('Transak Error');
          const reason = 'transakGetAccessToken Error: No accessToken provided';
          showError(title, err, reason);
          setOpeningBrowser(false);
          return;
        }
      } catch (err: any) {
        logger.error('Error fetching Transak access token');
        const title = t('Transak Error');
        const msg = getErrorMessage(err);
        const reason = 'transakUpdateAccessToken Error';
        showError(title, msg, reason);
        setOpeningBrowser(false);
        return;
      }
    } else {
      logger.debug('Using cached Transak access token.');
    }

    const newData: TransakPaymentData = {
      address,
      chain: destinationChain,
      created_on: Date.now(),
      crypto_amount: Number(offer.amountReceiving),
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offer.buyAmount!,
      fiat_total_amount: offer.amountCost!,
      fiat_total_amount_currency: offer.fiatCurrency,
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
        fiatAmount: offer.fiatAmount,
        fiatCurrency: offer.fiatCurrency,
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
      fiatAmount: offer.fiatAmount,
      fiatCurrency: offer.fiatCurrency.toUpperCase(),
      network: getTransakChainFormat(chain) ?? 'mainnet',
      cryptoCurrencyCode: getTransakCoinFormat(coin),
      cryptoCurrencyList: getTransakCoinFormat(coin),
      hideExchangeScreen: true,
      themeColor: BitPay.replace(/#/g, ''),
      hideMenu: false,
      partnerOrderId: transakExternalId,
      partnerCustomerId: selectedWallet.id,
      accessToken: _accessToken,
    };

    quoteData[
      paymentMethod.method !== 'other'
        ? 'paymentMethod'
        : 'defaultPaymentMethod'
    ] =
      offer.paymentMethodKey ??
      getTransakPaymentMethodFormat(paymentMethod.method) ??
      'credit_debit_card';

    let data: TransakSignedUrlData;
    try {
      const _data = await selectedWallet.transakGetSignedPaymentUrl(quoteData);
      data = _data?.body ?? _data;
    } catch (err) {
      const title = t('Transak Error');
      const msg = getErrorMessage(err);
      const reason = 'transakGetSignedPaymentUrl Error';
      showError(title, msg, reason);
      setOpeningBrowser(false);
      return;
    }

    if (!data || !data.urlWithSignature) {
      const err = t(
        'It was not possible to generate the checkout URL correctly',
      );
      const title = t('Transak Error');
      const reason =
        'transakGetSignedPaymentUrl Error. Could not generate urlWithSignature';
      showError(title, err, reason);
      setOpeningBrowser(false);
      return;
    }

    // This offer is opened in an external browser.
    // Apparently, Transak placed certain restrictions on opening its widgetUrl,
    // which causes it not to display correctly in the inappBrowser.
    await Linking.openURL(data.urlWithSignature);

    await sleep(500);
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const goToSellCheckout = (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ): void => {
    setButtonState('loading');
    setOpeningBrowser(true);
    dispatch(
      SellCryptoActions.updateSellCryptoOpts({
        sellCryptoOpts: {
          selectedWithdrawalMethod: paymentMethod.method,
        },
      }),
    );
    switch (offer.key) {
      case 'moonpay':
        goToMoonpaySellPage(offer, paymentMethod);
        break;

      case 'ramp':
        goToRampSellPage(offer, paymentMethod);
        break;

      case 'simplex':
        goToSimplexSellPage(offer, paymentMethod);
        break;
    }
  };

  const goToMoonpaySellPage = (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToMoonpaySell(offer, paymentMethod);
  };

  const continueToMoonpaySell = async (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const msg = t('Error when trying to generate wallet address.');
      const title = t('MoonPay Error');
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
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
      baseCurrencyAmount: offer.sellAmount || +curValRef.current,
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
      quoteCurrencyCode: cloneDeep(offer.fiatCurrency)?.toLowerCase(),
      showWalletAddressForm: false,
    };

    let data: MoonpayGetSellSignedPaymentUrlData;
    try {
      const _data = await selectedWallet.moonpayGetSellSignedPaymentUrl(
        requestData,
      );
      data = _data?.body ?? _data;
      if (!data?.urlWithSignature) {
        const msg = t(
          'Our partner Moonpay is not currently available. Please try again later.',
        );
        const reason =
          'moonpayGetSignedPaymentUrl Error. urlWithSignature not present.';
        const title = t('MoonPay Error');
        showError(title, msg, reason);
        return;
      }
    } catch (err) {
      const msg = t(
        'Our partner Moonpay is not currently available. Please try again later.',
      );
      const reason = 'moonpayGetSignedPaymentUrl Error.';
      const title = t('MoonPay Error');
      showError(title, msg, reason);
      const logErr = getErrorMessage(err);
      logger.error(`moonpayGetSellSignedPaymentUrl Error: ${logErr}`);
      return;
    }

    const newData: MoonpaySellOrderData = {
      env: __DEV__ ? 'dev' : 'prod',
      wallet_id: selectedWallet.id,
      coin: cloneDeep(selectedWallet.currencyAbbreviation).toUpperCase(),
      chain: cloneDeep(selectedWallet.chain).toLowerCase(),
      external_id: externalTransactionId,
      created_on: Date.now(),
      crypto_amount: offer.sellAmount || +curValRef.current,
      refund_address: address,
      fiat_currency: offer.quoteData?.quoteCurrency?.code
        ? cloneDeep(offer.quoteData.quoteCurrency.code).toUpperCase()
        : fiatCurrency,
      payment_method: paymentMethod!.method,
      fiat_fee_amount: Number(offer.fee),
      fiat_receiving_amount: Number(offer.amountReceiving),
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

  const goToRampSellPage = (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToRampSell(offer, paymentMethod);
  };

  const continueToRampSell = async (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (!selectedWallet) {
      return;
    }
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const msg = t('Error when trying to generate wallet address.');
      const title = t('Ramp Error');
      const reason = 'createWalletAddress Error';
      showError(title, msg, reason);
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
      swapAmount: offer.decimals
        ? Number(offer.sellAmount) * 10 ** offer.decimals
        : undefined,
      fiatCurrency: offer.fiatCurrency,
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
      const _data = await selectedWallet.rampGetSignedPaymentUrl(requestData);
      data = _data?.body ?? _data;
      if (!data?.urlWithSignature) {
        const msg = t(
          'Our partner Ramp Network is not currently available. Please try again later.',
        );
        const reason =
          'rampGetSignedPaymentUrl Error. urlWithSignature not present.';
        const title = t('Ramp Network Error');
        showError(title, msg, reason);
        return;
      }
    } catch (err) {
      const msg = t(
        'Our partner Ramp Network is not currently available. Please try again later.',
      );
      const reason = 'rampGetSignedPaymentUrl Error.';
      const title = t('Ramp Network Error');
      showError(title, msg, reason);
      const logErr = getErrorMessage(err);
      logger.error(`rampGetSignedPaymentUrl Error: ${logErr}`);
      return;
    }

    try {
      const RampWebView = (url: string) => {
        setSellModalVisible({open: true, url: url, rampOffer: offer});
      };

      RampWebView(data.urlWithSignature);
    } catch (err) {
      const msg = t(
        'The Ramp Network checkout page could not be opened. Please try again later.',
      );
      const reason =
        'rampGetSignedPaymentUrl Error. The checkout page could not be opened.';
      const title = t('Ramp Network Error');
      showError(title, msg, reason);
      const logErr = getErrorMessage(err);
      logger.error(`RampWebView Error: ${logErr}`);
      return;
    }
  };

  const handleRampCheckoutMessage = async (
    event: WebViewMessageEvent,
    offer: SellCryptoOffer | undefined,
  ) => {
    if (!selectedWallet) {
      logger.error('handleRampCheckoutMessage: selectedWallet is undefined');
      return;
    }
    if (!offer) {
      logger.error('handleRampCheckoutMessage: offer is undefined');
      return;
    }
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
              crypto_amount: offer.sellAmount || +curValRef.current,
              fiat_receiving_amount: Number(offer.amountReceiving),
              fiat_fee_amount: Number(offer.fee),
              fiat_currency: offer.quoteData?.quoteCurrency?.code
                ? cloneDeep(offer.quoteData.quoteCurrency.code).toUpperCase()
                : fiatCurrency,
              payment_method: (selectedPaymentMethod as WithdrawalMethod)
                ?.method,
              external_id: cloneDeep(offer.externalId)!,
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

                  const title = t('Ramp Network Error');
                  const reason = 'Contract address mismatch error.';

                  setSellModalVisible({
                    open: false,
                    url: sellModalVisible?.url,
                    rampOffer: sellModalVisible?.rampOffer,
                  });
                  await sleep(1500);
                  showError(title, errMsg, reason);
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
                  const title = t('Ramp Network Error');
                  const reason = 'Coin-chain mismatch error.';

                  setSellModalVisible({
                    open: false,
                    url: sellModalVisible?.url,
                    rampOffer: sellModalVisible?.rampOffer,
                  });
                  await sleep(1500);
                  showError(title, errMsg, reason);
                }
              }
            }

            if (
              orderData.sale?.fiat?.payoutMethod &&
              getPayoutMethodKeyFromRampType(
                orderData.sale.fiat.payoutMethod,
              ) !== selectedPaymentMethod?.method
            ) {
              logger.debug(
                `Payout Method changed on the checkout page. Updating payment_method from: ${selectedPaymentMethod?.method} to: ${orderData.sale.fiat.payoutMethod}`,
              );
              newData.payment_method = getPayoutMethodKeyFromRampType(
                orderData.sale.fiat.payoutMethod,
              );
            }

            if (
              orderData.sale?.crypto?.amount &&
              Number(orderData.sale.crypto.amount) &&
              offer.decimals
            ) {
              const orderAmount =
                Number(orderData.sale.crypto.amount) / 10 ** offer.decimals;
              if (orderAmount !== newData.crypto_amount) {
                // TODO: review the send max case here. Set it to undefined when the amount changed
                logger.debug(
                  `Amount changed on the checkout page. Updating crypto_amount from: ${newData.crypto_amount} to: ${orderAmount}`,
                );
                newData.crypto_amount = orderAmount;
                offer.sellAmount = orderAmount;
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
              rampExternalId: cloneDeep(offer.externalId)!,
              depositWalletAddress: sendCryptoPayload?.address,
            };

            dispatch(
              SellCryptoActions.updateSellOrderRamp({
                rampSellIncomingData: dataToUpdate,
              }),
            );

            setSellModalVisible({
              open: false,
              url: sellModalVisible?.url,
              rampOffer: sellModalVisible?.rampOffer,
            });
            await sleep(1500);
            navigation.goBack();
            navigation.navigate(ExternalServicesScreens.RAMP_SELL_CHECKOUT, {
              rampQuoteOffer: offer,
              wallet: selectedWallet,
              toAddress: sendCryptoPayload?.address,
              amount: offer.sellAmount!,
              showNewQuoteInfo: !!(offer.sellAmount !== +curValRef.current),
              sellCryptoExternalId: cloneDeep(offer.externalId)!,
              paymentMethod: (selectedPaymentMethod as WithdrawalMethod)
                ?.method,
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

  const goToSimplexSellPage = (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (offer.errorMsg || offer.outOfLimitMsg) {
      return;
    }
    continueToSimplexSell(offer, paymentMethod);
  };

  const continueToSimplexSell = async (
    offer: SellCryptoOffer,
    paymentMethod: WithdrawalMethod,
  ) => {
    if (!selectedWallet) {
      const msg = 'selectedWallet is undefined.';
      const reason = 'selectedWallet is undefined.';
      const title = t('Simplex Error');
      showError(title, msg, reason);
      return;
    }
    if (!offer.quoteData?.quote_id) {
      const msg =
        'There was an error while trying to reach the checkout page. Please try again later';
      const reason = 'quote_id not included in Simplex quote data.';
      const title = t('Simplex Error');
      showError(title, msg, reason);
      return;
    }

    const externalTransactionId = uuid.v4().toString();

    const return_url = getSimplexSellReturnURL(
      externalTransactionId,
      useSendMax,
    );

    const userCountry = getSimplexSellCountryFormat(country, user?.country);

    const quoteData: SimplexSellPaymentRequestReqData = {
      env: simplexSellEnv,
      userCountry: __DEV__ ? 'LT' : userCountry || 'US',
      referer_url: 'https://bitpay.com/',
      return_url: return_url,
      txn_details: {quote_id: offer.quoteData.quote_id},
    };

    selectedWallet
      .simplexSellPaymentRequest(quoteData)
      .then(async (_data: any) => {
        const data: SimplexSellPaymentRequestData = _data?.body ?? _data;
        if (data?.error) {
          const msg = getErrorMessage(data.error);
          const reason = 'simplexSellPaymentRequest Error';
          const title = t('Simplex Error');
          showError(title, msg, reason);
          setOpeningBrowser(false);
          return;
        }

        if (!data?.txn_url) {
          const msg =
            'There was an error. Simplex did not provide the URL to continue with the sales process.';
          const reason = 'simplexSellPaymentRequest Error: No txn_url present.';
          const title = t('Simplex Error');
          showError(title, msg, reason);
          setOpeningBrowser(false);
          return;
        }

        logger.debug('Simplex creating sell payment request: SUCCESS');

        const destinationChain = selectedWallet.chain;

        dispatch(
          Analytics.track('Sell Crypto Order Created', {
            exchange: 'simplex',
            cryptoAmount: offer.sellAmount,
            fiatAmount: offer.quoteData?.fiat_amount
              ? Number(offer.quoteData.fiat_amount)
              : '',
            fiatCurrency: offer.fiatCurrency || '',
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
        navigation.navigate(ExternalServicesScreens.SIMPLEX_SELL_CHECKOUT, {
          simplexQuoteOffer: offer,
          wallet: selectedWallet,
          amount: offer.sellAmount || +curValRef.current,
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
        const msg = getErrorMessage(err);
        const reason = 'simplexSellPaymentRequest Error';
        const title = t('Simplex Error');
        showError(title, msg, reason);
        setOpeningBrowser(false);
      });
  };

  const showError = (
    title: string | undefined,
    msg: string,
    reason: string | undefined,
    actions?: any,
    goBack?: boolean,
  ) => {
    logger.error(
      selectedOffer?.label + ' error: ' + msg + ' | Reason: ' + reason,
    );

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: selectedOffer?.key || 'unknown',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: selectedPaymentMethod?.method || '',
        amount: Number((selectedOffer as CryptoOffer)?.fiatAmount) || '',
        coin:
          cloneDeep(selectedWallet?.currencyAbbreviation)?.toLowerCase() || '',
        chain: cloneDeep(selectedWallet?.chain)?.toLowerCase() || '',
        fiatCurrency: selectedOffer?.fiatCurrency || '',
      }),
    );

    dispatch(
      AppActions.showBottomNotificationModal({
        title: title ?? t('Error'),
        message: msg,
        type: 'error',
        enableBackdropDismiss: goBack ? false : true,
        actions: actions ?? [
          {
            text: t('OK'),
            action: () => {
              navigation.dispatch(StackActions.popToTop());
            },
          },
        ],
        onBackdropDismiss: () => {
          navigation.dispatch(StackActions.popToTop());
        },
      }),
    );
  };

  return (
    <AmountContainer>
      <ViewContainer
        style={{
          marginTop: _isSmallScreen
            ? reduceTopGap
              ? -40
              : 0
            : reduceTopGap
            ? -10
            : 0,
        }}>
        <AmountHeroContainer isSmallScreen={_isSmallScreen}>
          <Row>
            <AmountText
              numberOfLines={1}
              ellipsizeMode={'tail'}
              bigAmount={
                _isSmallScreen ? true : amountConfig.displayAmount?.length > 8
              }>
              {amountConfig.displayAmount || 0}
            </AmountText>
            {context !== 'sellCrypto' || selectedWallet ? (
              <CurrencySuperScript>
                <CurrencyText
                  bigAmount={
                    _isSmallScreen
                      ? true
                      : amountConfig.displayAmount?.length > 8
                  }>
                  {formatCurrencyAbbreviation(usingCurrency) || 'USD'}
                </CurrencyText>
              </CurrencySuperScript>
            ) : null}
          </Row>
          {/* This section shows the equivalent amount (in crypto if usingCurrency is fiat / in fiat if usingCurrency is crypto) 
              Do not remove commented section*/}
          {usingCurrency &&
          context === 'sellCrypto' &&
          usingCurrencyIsFiat &&
          amountConfig.displayEquivalentAmount !== '0' &&
          amountConfig.amount !== '0' ? (
            <Row>
              <AmountEquivText>
                {usingCurrencyIsFiat
                  ? Number(amountConfig.displayEquivalentAmount)
                      .toFixed(8)
                      .replace(/\.?0+$/, '')
                  : amountConfig.displayEquivalentAmount}{' '}
                {context === 'sellCrypto'
                  ? usingCurrencyIsFiat
                    ? selectedWallet?.currencyAbbreviation.toUpperCase()
                    : fiatCurrency
                  : null}
              </AmountEquivText>
            </Row>
          ) : null}
          <CtaContainer justifyCenter={context === 'buyCrypto'}>
            {selectedOffer?.amountReceiving ? (
              <>
                {context === 'sellCrypto' ? <View style={{width: 40}} /> : null}
                <SelectedOfferAmountText>
                  {'≈ '}
                  {Number(selectedOffer.amountReceiving)
                    .toFixed(8)
                    .replace(/\.?0+$/, '')}{' '}
                  {context === 'buyCrypto'
                    ? selectedWallet?.currencyAbbreviation.toUpperCase()
                    : null}
                  {context === 'sellCrypto'
                    ? selectedOffer?.fiatCurrency.toUpperCase()
                    : null}
                </SelectedOfferAmountText>
              </>
            ) : context === 'sellCrypto' ? (
              <View style={{width: 40}} />
            ) : null}
            {context === 'sellCrypto' &&
            swapCurrenciesList.length > 1 &&
            selectedWallet ? (
              <SwapCurrenciesButton
                onPress={() => {
                  curValRef.current = '0';
                  updateAmountRef.current('0');
                  setSelectedPillValue(null);
                  if (usingCurrencyIsFiat) {
                    setUsingCurrencyIsFiat(false);
                    setUsingCurrency(
                      selectedWallet.currencyAbbreviation.toUpperCase(),
                    );
                  } else {
                    setUsingCurrencyIsFiat(true);
                    setUsingCurrency(fiatCurrency);
                  }
                }}>
                <SwapCurrenciesSvg width={30} height={30} />
              </SwapCurrenciesButton>
            ) : null}
          </CtaContainer>

          <ExternalServicesWalletSelector
            navigation={navigation}
            route={route}
            context={context}
            buyCryptoSupportedCoins={buyCryptoSupportedCoins ?? []}
            buyCryptoSupportedCoinsFullObj={buyCryptoSupportedCoinsFullObj}
            sellCryptoSupportedCoins={sellCryptoSupportedCoins ?? []}
            sellCryptoSupportedCoinsFullObj={
              sellCryptoSupportedCoinsFullObj ?? []
            }
            fromWallet={fromWallet}
            currencyAbbreviation={fromCurrencyAbbreviation}
            chain={fromChain}
            partner={preSetPartner}
            onWalletSelected={setSelectedWallet}
          />
        </AmountHeroContainer>
        <ActionContainer>
          {selectedWallet ? (
            <ExternalServicesOfferSelector
              context={context}
              selectedWallet={selectedWallet}
              amount={
                usingCurrencyIsFiat ? +amountConfig.amount : +curValRef.current
              }
              amountLimits={limits}
              sellLimits={sellLimits}
              getWarnMsg={getWarnMsg}
              fiatCurrency={
                defaultAltCurrency?.isoCode ? defaultAltCurrency.isoCode : 'USD'
              }
              coin={selectedWallet?.currencyAbbreviation || ''}
              chain={selectedWallet?.chain || ''}
              country={country}
              preSetPartner={preSetPartner}
              buyCryptoConfig={externalServicesConfig?.buyCrypto}
              sellCryptoConfig={externalServicesConfig?.sellCrypto}
              preLoadSellPartnersData={sellCryptoExchangesDefault}
              useSendMax={
                IsERCToken(
                  selectedWallet!.currencyAbbreviation,
                  selectedWallet!.chain,
                )
                  ? false
                  : useSendMax
              }
              sendMaxInfo={sendMaxInfo}
              onSelectOffer={setSelectedOffer}
              onSelectPaymentMethod={setSelectedPaymentMethod}
            />
          ) : null}
          {(context === 'buyCrypto' &&
            ['USD', 'EUR'].includes(defaultAltCurrency.isoCode)) ||
          (context === 'sellCrypto' && selectedWallet) ? (
            <ExternalServicesAmountPills
              fiatCurrency={defaultAltCurrency.isoCode}
              selectedValue={selectedPillValue}
              showMaxPill={context === 'sellCrypto'}
              maxPillDisabled={
                !sellLimits?.maxWalletAmount && !sellLimits?.limits?.maxAmount
              }
              hideFiatPills={
                !usingCurrencyIsFiat ||
                !['USD', 'EUR'].includes(defaultAltCurrency.isoCode)
              }
              onPillPress={(pillValue: number | string) => {
                try {
                  const pillValueStr = pillValue?.toString();
                  if (pillValueStr) {
                    if (context === 'buyCrypto') {
                      curValRef.current = pillValueStr;
                      updateAmountRef.current(pillValueStr);
                      setSelectedPillValue(pillValue);
                    } else if (context === 'sellCrypto') {
                      if (
                        usingCurrencyIsFiat &&
                        typeof pillValue === 'number'
                      ) {
                        curValRef.current = pillValueStr;
                        updateAmountRef.current(pillValueStr);
                        setSelectedPillValue(pillValue);
                      } else if (typeof pillValue === 'number' && rate) {
                        const rateForPill = rate
                          ? (pillValue / rate).toFixed(8).replace(/\.?0+$/, '')
                          : '0';
                        curValRef.current = rateForPill;
                        updateAmountRef.current(rateForPill);
                        setSelectedPillValue(pillValue);
                      } else if (
                        typeof pillValue === 'string' &&
                        pillValue === 'max'
                      ) {
                        setSelectedPillValue(pillValue);
                        sellCryptoSendMax();
                      }
                    }
                  }

                  const eventName =
                    context === 'buyCrypto'
                      ? 'Buy - Clicked Pre-defined Amount'
                      : 'Sell - Clicked Pre-defined Amount';
                  dispatch(
                    Analytics.track(eventName, {
                      amount: pillValue,
                      fiatCurrency: defaultAltCurrency.isoCode,
                    }),
                  );
                } catch (err) {
                  const errorMsg =
                    err instanceof Error ? err.message : JSON.stringify(err);
                  logger.warn(
                    `An error occurred tapping amount pill: ${errorMsg}`,
                  );
                }
              }}
            />
          ) : null}

          <VirtualKeyboardContainer>
            <VirtualKeyboard
              onCellPress={onCellPress}
              showDot={usingCurrency !== 'JPY'}
              context={'buyCrypto'}
            />
          </VirtualKeyboardContainer>
          <ButtonContainer>
            <Button
              state={buttonState}
              disabled={!continueEnabled}
              onPress={() => {
                if (context === 'buyCrypto') {
                  selectedOffer && selectedPaymentMethod
                    ? goToBuyCheckout(
                        selectedOffer as CryptoOffer,
                        selectedPaymentMethod as PaymentMethod,
                      )
                    : {};
                } else if (context === 'sellCrypto') {
                  selectedOffer && selectedPaymentMethod
                    ? goToSellCheckout(
                        selectedOffer as SellCryptoOffer,
                        selectedPaymentMethod as WithdrawalMethod,
                      )
                    : {};
                }
              }}>
              {selectedOffer
                ? t('Continue with ') + selectedOffer.label
                : t('Continue')}
            </Button>
          </ButtonContainer>
          {context === 'buyCrypto' && showArchaxBanner && (
            <ArchaxFooter isSmallScreen={_isSmallScreen} />
          )}
        </ActionContainer>
      </ViewContainer>

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
                setSellModalVisible({
                  open: false,
                  url: undefined,
                  rampOffer: undefined,
                });
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
              handleRampCheckoutMessage(e, sellModalVisible.rampOffer);
            }}
            originWhitelist={['https://*']}
            automaticallyAdjustContentInsets
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      </Modal>
    </AmountContainer>
  );
};

export default BuyAndSellRoot;
