import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import Button, {ButtonState} from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {HEIGHT, ScreenGutter} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import SwapButton, {
  ButtonText,
  SwapButtonContainer,
} from '../../../components/swap-button/SwapButton';
import {orderBy} from 'lodash';
import VirtualKeyboard from '../../../components/virtual-keyboard/VirtualKeyboard';
import {
  BuyCryptoExchangeKey,
  getAvailableFiatCurrencies,
  getBuyCryptoSupportedCoins,
} from '../buy-crypto/utils/buy-crypto-utils';
import {getAvailableSellCryptoFiatCurrencies} from '../sell-crypto/utils/sell-crypto-utils';
import {ParseAmount} from '../../../store/wallet/effects/amount/amount';
import {BitPay, Slate30, SlateDark} from '../../../styles/colors';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  getRateByCurrencyName,
  sleep,
} from '../../../utils/helper-methods';
import {useAppDispatch, useMount} from '../../../utils/hooks';
import useAppSelector from '../../../utils/hooks/useAppSelector';
import CurrencySymbol from '../../../components/icons/currency-symbol/CurrencySymbol';
import {useLogger} from '../../../utils/hooks/useLogger';
import {getBuyCryptoFiatLimits} from '../../../store/buy-crypto/buy-crypto.effects';
import KeyEvent from 'react-native-keyevent';
import ArchaxFooter from '../../../components/archax/archax-footer';
import ExternalServicesOfferSelector, {
  CryptoOffer,
} from '../components/externalServicesOfferSelector';
import ExternalServicesAmountPills from '../components/externalServicesAmountPills';
import {AltCurrenciesRowProps} from '../../../components/list/AltCurrenciesRow';
import {StackActions} from '@react-navigation/native';
import ExternalServicesWalletSelector from '../components/externalServicesWalletSelector';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  BuyCryptoConfig,
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
} from '../../../store/external-services/external-services.types';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ExternalServicesGroupParamList,
  ExternalServicesScreens,
} from '../ExternalServicesGroup';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {getExternalServicesConfig} from '../../../store/external-services/external-services.effects';
import {dismissOnGoingProcessModal} from '../../../store/app/app.actions';
import {AppActions} from '../../../store/app';
import {SupportedCurrencyOptions} from '../../../constants/SupportedCurrencyOptions';
import {ToWalletSelectorCustomCurrency} from '../../wallet/screens/GlobalSelect';
import {getCoinAndChainFromCurrencyCode} from '../../bitpay-id/utils/bitpay-id-utils';
import {IsERCToken} from '../../../store/wallet/utils/currency';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  CurrencyOpts,
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
  MoonpayGetSignedPaymentUrlData,
  MoonpayGetSignedPaymentUrlReqData,
  MoonpayPaymentData,
  MoonpayPaymentType,
  SardineGetAuthTokenRequestData,
  SardinePaymentUrlConfigParams,
  SimplexPaymentData,
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
  RampGetSellSignedPaymentUrlData,
  RampPaymentData,
  RampPaymentUrlConfigParams,
} from '../../../store/buy-crypto/models/ramp.models';
import {
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
import {getErrorMessage} from '../utils/external-services-utils';

const AmountContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View<{isSmallScreen?: boolean}>`
  width: 100%;
  margin-top: ${({isSmallScreen}) => (isSmallScreen ? 0 : '20px')};
  flex-direction: row;
  justify-content: space-between;
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

export interface Limits {
  min?: number;
  max?: number;
}

export interface LimitsOpts {
  maxWalletAmount?: string;
  limits: {
    minAmount?: number;
    maxAmount?: number;
  };
}

export type ExternalServicesContext = 'buyCrypto' | 'sellCrypto';

export interface BuyAndSellRootProps {
  route?: any;
  navigation?: any;

  fromWallet?: any;
  amount?: number; // deeplink params are strings, ensure this is number so offers will work
  currencyAbbreviation?: string; // used from charts and deeplinks.
  chain?: string; // used from charts and deeplinks.
  partner?: BuyCryptoExchangeKey | undefined; // used from deeplinks.

  wallet?: Wallet;
  cryptoCurrencyAbbreviation?: string;
  fiatCurrencyAbbreviation?: string;
  tokenAddress?: string;
  context?: ExternalServicesContext;
  reduceTopGap?: boolean;
  limitsOpts?: LimitsOpts; // TODO: take it from components
  customAmountSublabel?: (amount: number) => void;

  /**
   * @param amount crypto amount
   */
  onSubmit?: (amount: number) => void;
}

let buyCryptoConfig: BuyCryptoConfig | undefined;

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

  const defaultAltCurrency: AltCurrenciesRowProps = useAppSelector(
    ({APP}) => APP.defaultAltCurrency,
  );
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const allRates = useAppSelector(({RATE}) => RATE.rates);
  const tokenDataByAddress = useAppSelector(
    ({WALLET}: RootState) => WALLET.tokenDataByAddress,
  );
  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);
  const curValRef = useRef('');
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);

  const _isSmallScreen = showArchaxBanner ? true : HEIGHT < 700;
  const country = locationData?.countryShortCode || 'US';

  // Real route params
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

  // TODO: Route params to review or delete
  const cryptoCurrencyAbbreviation = route.params?.cryptoCurrencyAbbreviation;
  const fiatCurrencyAbbreviation = route.params?.fiatCurrencyAbbreviation;
  const tokenAddress = route.params?.tokenAddress;
  const context = route.params?.context;
  const reduceTopGap = route.params?.reduceTopGap;
  const limitsOpts = route.params?.limitsOpts;
  const customAmountSublabel = route.params?.customAmountSublabel;
  const onSubmit = route.params?.onSubmit;

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
  const [selectedOffer, setSelectedOffer] = useState<CryptoOffer | undefined>();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    PaymentMethod | undefined
  >();
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [continueEnabled, setContinueEnabled] = useState(false);

  const fiatCurrency = useMemo<string>(() => {
    if (fiatCurrencyAbbreviation) {
      return fiatCurrencyAbbreviation;
    }

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
  }, [context, defaultAltCurrency.isoCode, fiatCurrencyAbbreviation]);

  // flag for primary selector type
  const [rate, setRate] = useState(0);
  const [amountConfig, updateAmountConfig] = useState({
    // display amount fiat/crypto
    displayAmount: '0',
    displayEquivalentAmount: '0',
    // amount to be sent to proposal creation (sats)
    amount: '0',
    currency: cryptoCurrencyAbbreviation
      ? cryptoCurrencyAbbreviation
      : fiatCurrency,
    primaryIsFiat:
      !cryptoCurrencyAbbreviation ||
      cryptoCurrencyAbbreviation === fiatCurrency,
  });
  const [useSendMax, setUseSendMax] = useState(false);
  const [limits, setLimits] = useState<Limits>({
    min: undefined,
    max: undefined,
  });
  const [selectedPillValue, setSelectedPillValue] = useState<number | null>(
    null,
  );
  const [selectedWallet, setSelectedWallet] = useState<Wallet | undefined>();
  const [externalServicesConfig, setExternalServicesConfig] = useState<
    ExternalServicesConfig | undefined
  >();

  const swapList = useMemo(() => {
    return cryptoCurrencyAbbreviation
      ? [
          ...new Set([
            formatCurrencyAbbreviation(cryptoCurrencyAbbreviation),
            fiatCurrency,
          ]),
        ]
      : [fiatCurrency];
  }, [cryptoCurrencyAbbreviation, fiatCurrency]);

  const {
    displayAmount,
    displayEquivalentAmount,
    amount,
    currency,
    primaryIsFiat,
  } = amountConfig;

  const updateAmount = (_val: string) => {
    const val = Number(_val);

    if (isNaN(val) || !cryptoCurrencyAbbreviation || !fromChain) {
      updateAmountConfig(current => ({
        ...current,
        displayAmount: _val,
        amount: _val,
      }));

      return;
    }

    const cryptoAmount =
      val === 0 || !cryptoCurrencyAbbreviation
        ? '0'
        : dispatch(
            ParseAmount(
              primaryIsFiat ? val / rate : val,
              cryptoCurrencyAbbreviation.toLowerCase(),
              fromChain,
              tokenAddress,
            ),
          ).amount;

    const fiatAmount = formatFiatAmount(val * rate, fiatCurrency, {
      currencyDisplay: 'symbol',
      currencyAbbreviation: primaryIsFiat
        ? undefined
        : cryptoCurrencyAbbreviation,
    });

    updateAmountConfig(current => ({
      ...current,
      displayAmount: _val,
      displayEquivalentAmount: primaryIsFiat ? cryptoAmount : fiatAmount,
      amount: cryptoAmount,
    }));
  };
  const updateAmountRef = useRef(updateAmount);
  updateAmountRef.current = updateAmount;

  const onCellPress = useCallback((val: string) => {
    haptic('soft');
    setUseSendMax(false);
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

  const sellCryptoSendMax = () => {
    logger.debug(
      `Handling sellCryptoSendMax with: ${JSON.stringify(limitsOpts)}`,
    );

    let sendMaxAmount: string;
    if (limitsOpts?.limits?.maxAmount && limitsOpts?.maxWalletAmount) {
      if (limitsOpts.limits.maxAmount >= Number(limitsOpts.maxWalletAmount)) {
        sendMaxAmount = limitsOpts.maxWalletAmount;
        if (primaryIsFiat && rate) {
          sendMaxAmount = (+limitsOpts.maxWalletAmount * rate).toFixed(2);
        }
        setUseSendMax(true);
      } else {
        sendMaxAmount = limitsOpts.limits.maxAmount.toString();
        if (primaryIsFiat && rate) {
          sendMaxAmount = (+limitsOpts.limits.maxAmount * rate).toFixed(2);
        }
        curValRef.current = sendMaxAmount;
        updateAmountRef.current(sendMaxAmount);
        setUseSendMax(false);
      }
      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);
    } else if (limitsOpts?.maxWalletAmount) {
      sendMaxAmount = limitsOpts.maxWalletAmount;
      if (primaryIsFiat && rate) {
        sendMaxAmount = (+limitsOpts.maxWalletAmount * rate).toFixed(2);
      }
      setUseSendMax(true);
      curValRef.current = sendMaxAmount;
      updateAmountRef.current(sendMaxAmount);
    } else {
      setUseSendMax(false);
    }
  };

  useEffect(() => {
    if (selectedOffer && buttonState !== 'loading' && !openingBrowser) {
      setContinueEnabled(true);
    }
  }, [selectedOffer, buttonState, openingBrowser]);

  const getWarnMsg = useMemo<string | undefined>(() => {
    let msg: string | undefined;
    if (+amount > 0) {
      if (limits.min && +amount < limits.min) {
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
          msg = t('MinAmountWarnMsg', {
            min: limits.min,
            currency: cryptoCurrencyAbbreviation,
          });
        }
      } else if (
        (!limits?.min || (limits.min && +amount >= limits.min)) &&
        limitsOpts?.maxWalletAmount &&
        +amount > Number(limitsOpts.maxWalletAmount)
      ) {
        msg = t('Not enough funds');
      } else if (limits.max && +amount > limits.max) {
        if (context === 'buyCrypto' && fiatCurrency) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: fiatCurrency,
          });
        } else if (context !== 'buyCrypto' && cryptoCurrencyAbbreviation) {
          msg = t('MaxAmountWarnMsg', {
            max: limits.max,
            currency: cryptoCurrencyAbbreviation,
          });
        }
      }
    }

    return msg;
  }, [amount, limits, context]);

  const initAmount = () => {
    if (!currency) {
      return;
    }
    updateAmount('0');
    // if added for dev (hot reload)
    if (
      !primaryIsFiat &&
      getRateByCurrencyName(allRates, currency.toLowerCase(), fromChain!)
    ) {
      const rateByCurrencyName = getRateByCurrencyName(
        allRates,
        currency.toLowerCase(),
        fromChain!,
        tokenAddress,
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
  };
  const initAmountRef = useRef(initAmount);
  initAmountRef.current = initAmount;

  const initLimits = (): void => {
    if (context === 'buyCrypto') {
      setLimits(dispatch(getBuyCryptoFiatLimits(undefined, fiatCurrency)));
    } else if (limitsOpts?.limits) {
      setLimits({
        min: limitsOpts.limits.minAmount,
        max: limitsOpts.limits.maxAmount,
      });
    }
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
      await sleep(100);
      dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
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
      dispatch(dismissOnGoingProcessModal());
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
      dispatch(dismissOnGoingProcessModal());
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

    if (fromWallet?.id || fromCurrencyAbbreviation) {
      // TODO: selectFirstAvailableWallet
      // selectFirstAvailableWallet();
    } else {
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
    }
  };

  useMount(() => {
    if (context === 'buyCrypto') {
      try {
        initBuyCrypto();
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logger.error(`[Buy] could not initialize view: ${errStr}`);
      }
    } else if (context === 'sellCrypto') {
      // TODO initSellCrypto();
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
        onSubmit?.(+curValRef.current);
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
      selectedPillValue !== null &&
      curValRef.current !== selectedPillValue.toString()
    ) {
      setSelectedPillValue(null);
    }
  }, [curValRef.current]);

  useEffect(() => {
    if (selectedWallet) {
      navigation.setParams({wallet: selectedWallet});
    }
  }, [selectedWallet, navigation]);

  const goTo = (offer: CryptoOffer, paymentMethod: PaymentMethod): void => {
    setButtonState('loading');
    setOpeningBrowser(true);
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
      data = await selectedWallet.banxaCreateOrder(quoteData);
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
      data = (await selectedWallet.moonpayGetSignedPaymentUrl(
        quoteData,
      )) as MoonpayGetSignedPaymentUrlData;
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
      data = await selectedWallet.rampGetSignedPaymentUrl(quoteData);
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
      authTokenData = await selectedWallet.sardineGetToken(quoteData);
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
      .then(async req => {
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
      data = await selectedWallet.transakGetSignedPaymentUrl(quoteData);
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

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    setOpeningBrowser(false);
    navigation.goBack();
  };

  const showError = (title: string, msg: string, reason: string) => {
    logger.error(
      selectedOffer?.label + ' error: ' + msg + ' | Reason: ' + reason,
    );

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: selectedOffer?.key || 'unknown',
        context: 'BuyCryptoOffers',
        reason: reason || 'unknown',
        paymentMethod: selectedPaymentMethod?.method || '',
        amount: Number(selectedOffer?.fiatAmount) || '',
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
              bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
              {displayAmount || 0}
            </AmountText>
            <CurrencySuperScript>
              <CurrencyText
                bigAmount={_isSmallScreen ? true : displayAmount?.length > 8}>
                {formatCurrencyAbbreviation(currency) || 'USD'}
              </CurrencyText>
            </CurrencySuperScript>
          </Row>
          {customAmountSublabel ? (
            <>{customAmountSublabel(+amount)}</>
          ) : cryptoCurrencyAbbreviation ? (
            <Row>
              <AmountEquivText>
                {displayEquivalentAmount || 0}{' '}
                {primaryIsFiat &&
                  formatCurrencyAbbreviation(cryptoCurrencyAbbreviation)}
              </AmountEquivText>
            </Row>
          ) : null}
          {selectedOffer?.amountReceiving ? (
            <Row>
              <SelectedOfferAmountText>
                {'≈ '}
                {Number(selectedOffer.amountReceiving)
                  .toFixed(8)
                  .replace(/\.?0+$/, '')}{' '}
                {selectedWallet?.currencyAbbreviation.toUpperCase()}
              </SelectedOfferAmountText>
            </Row>
          ) : null}

          <ExternalServicesWalletSelector
            navigation={navigation}
            route={route}
            buyCryptoSupportedCoins={buyCryptoSupportedCoins ?? []}
            buyCryptoSupportedCoinsFullObj={buyCryptoSupportedCoinsFullObj}
            fromWallet={fromWallet}
            currencyAbbreviation={fromCurrencyAbbreviation}
            chain={fromChain}
            partner={preSetPartner}
            onWalletSelected={setSelectedWallet}
          />

          <CtaContainer isSmallScreen={_isSmallScreen}>
            {context === 'sellCrypto' && limitsOpts?.maxWalletAmount ? (
              <SwapButtonContainer
                isSmallScreen={_isSmallScreen}
                onPress={() => sellCryptoSendMax()}>
                <CurrencySymbol />
                <ButtonText isSmallScreen={_isSmallScreen}>MAX</ButtonText>
              </SwapButtonContainer>
            ) : (
              <Row />
            )}
            {swapList.length > 1 ? (
              <SwapButton
                swapList={swapList}
                onChange={(toCurrency: string) => {
                  curValRef.current = '';
                  updateAmountRef.current('0');
                  updateAmountConfig(current => ({
                    ...current,
                    currency: toCurrency,
                    primaryIsFiat: !primaryIsFiat,
                    displayAmount: '0',
                    displayEquivalentAmount: primaryIsFiat
                      ? formatFiatAmount(0, fiatCurrency, {
                          currencyDisplay: 'symbol',
                        })
                      : '0',
                  }));
                }}
              />
            ) : null}
          </CtaContainer>
        </AmountHeroContainer>

        <ActionContainer>
          {selectedWallet ? (
            <ExternalServicesOfferSelector
              selectedWallet={selectedWallet}
              amount={+amount}
              amountLimits={limits}
              getWarnMsg={getWarnMsg}
              fiatCurrency={
                defaultAltCurrency?.isoCode ? defaultAltCurrency.isoCode : 'USD'
              }
              coin={selectedWallet?.currencyAbbreviation || ''}
              chain={selectedWallet?.chain || ''}
              country={country}
              preSetPartner={preSetPartner}
              buyCryptoConfig={externalServicesConfig?.buyCrypto}
              onSelectOffer={setSelectedOffer}
              onSelectPaymentMethod={setSelectedPaymentMethod}
            />
          ) : null}
          {['USD', 'EUR'].includes(defaultAltCurrency.isoCode) ? (
            <ExternalServicesAmountPills
              fiatCurrency={defaultAltCurrency.isoCode}
              selectedValue={selectedPillValue}
              onPillPress={(pillValue: number) => {
                const pillValueStr = pillValue?.toString();
                if (pillValueStr) {
                  curValRef.current = pillValueStr;
                  updateAmountRef.current(pillValueStr);
                  setSelectedPillValue(pillValue);
                }
              }}
            />
          ) : null}

          <VirtualKeyboardContainer>
            <VirtualKeyboard
              onCellPress={onCellPress}
              showDot={currency !== 'JPY'}
              context={'buyCrypto'}
            />
          </VirtualKeyboardContainer>
          <ButtonContainer>
            <Button
              state={buttonState}
              disabled={!continueEnabled}
              onPress={() => {
                selectedOffer && selectedPaymentMethod
                  ? goTo(selectedOffer, selectedPaymentMethod)
                  : {};
              }}>
              {selectedOffer
                ? t('Continue with ') + selectedOffer.label
                : t('Continue')}
            </Button>
          </ButtonContainer>
          {showArchaxBanner && <ArchaxFooter isSmallScreen={_isSmallScreen} />}
        </ActionContainer>
      </ViewContainer>
    </AmountContainer>
  );
};

export default BuyAndSellRoot;
