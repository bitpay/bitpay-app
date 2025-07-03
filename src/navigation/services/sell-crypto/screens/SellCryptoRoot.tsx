import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Platform, ScrollView} from 'react-native';
import _ from 'lodash';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled, {useTheme} from 'styled-components/native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../../utils/hooks';
import {SellCryptoScreens, SellCryptoGroupParamList} from '../SellCryptoGroup';
import {WithdrawalMethod} from '../../sell-crypto/constants/SellCryptoConstants';
import PaymentMethodsModal from '../../buy-crypto/components/PaymentMethodModal';
import AmountModal from '../../../../components/amount/AmountModal';
import {
  BuyCryptoItemCard,
  BuyCryptoItemTitle,
  ActionsContainer,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
  DataText,
} from '../../buy-crypto/styled/BuyCryptoCard';
import Button from '../../../../components/button/Button';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {SendMaxInfo, Wallet} from '../../../../store/wallet/wallet.models';
import {
  Action,
  White,
  Slate,
  DisabledDark,
  Disabled,
  DisabledTextDark,
  DisabledText,
  ProgressBlue,
} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  getBadgeImg,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  getRateByCurrencyName,
  sleep,
} from '../../../../utils/helper-methods';
import {AppActions} from '../../../../store/app';
import {
  IsERCToken,
  IsSVMChain,
  IsVMChain,
} from '../../../../store/wallet/utils/currency';
import {
  SellCryptoSupportedExchanges,
  getAvailableSellCryptoFiatCurrencies,
  isWithdrawalMethodSupported,
  SellCryptoExchangeKey,
  getDefaultPaymentMethod,
  isCoinSupportedToSellBy,
} from '../utils/sell-crypto-utils';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {
  BitpaySupportedCoins,
  SUPPORTED_COINS,
  SUPPORTED_TOKENS,
} from '../../../../constants/currencies';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {orderBy, uniqBy} from 'lodash';
import {showWalletError} from '../../../../store/wallet/effects/errors/errors';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {
  SellCryptoConfig,
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
} from '../../../../store/external-services/external-services.types';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {moonpayGetCurrencies} from '../../../../store/buy-crypto/effects/moonpay/moonpay';
import FromWalletSelectorModal from '../../swap-crypto/components/FromWalletSelectorModal';
import {MoonpayGetCurrenciesRequestData} from '../../../../store/buy-crypto/buy-crypto.models';
import {
  getChainFromMoonpayNetworkCode,
  getMoonpaySellCurrenciesFixedProps,
  moonpaySellEnv,
} from '../utils/moonpay-sell-utils';
import {SellCryptoLimits} from '../../../../store/sell-crypto/sell-crypto.models';
import {
  MoonpayCurrency,
  MoonpayCurrencyMetadata,
} from '../../../../store/sell-crypto/models/moonpay-sell.models';
import {
  AccountChainsContainer,
  CurrencyColumn,
  CurrencyImageContainer,
  ExternalServicesItemTopTitle,
  ExternalServicesTitleContainer,
  Row,
} from '../../../../components/styled/Containers';
import {
  SellBalanceContainer,
  SellBottomDataText,
} from '../styled/SellCryptoCard';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import InfoSvg from '../../../../../assets/img/info.svg';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import BalanceDetailsModal from '../../../../navigation/wallet/components/BalanceDetailsModal';
import SellCryptoBalanceSkeleton from './SellCryptoBalanceSkeleton';
import {buildUIFormattedWallet} from '../../../../store/wallet/utils/wallet';
import {SatToUnit} from '../../../../store/wallet/effects/amount/amount';
import {
  getExternalServiceSymbol,
  getSendMaxData,
} from '../../utils/external-services-utils';
import {H5, H7, ListItemSubText} from '../../../../components/styled/Text';
import Blockie from '../../../../components/blockie/Blockie';
import {
  SimplexCurrency,
  SimplexGetCurrenciesRequestData,
} from '../../../../store/buy-crypto/models/simplex.models';
import {
  getChainFromSimplexNetworkCode,
  getSimplexSellFiatAmountLimits,
  simplexSellEnv,
} from '../utils/simplex-sell-utils';
import {simplexGetCurrencies} from '../../../../store/buy-crypto/effects/simplex/simplex';
import {isEuCountry} from '../../../../store/location/location.effects';
import ArchaxFooter from '../../../../components/archax/archax-footer';
import {rampGetAssets} from '../../../../store/buy-crypto/effects/ramp/ramp';
import {
  getChainFromRampChainFormat,
  getCoinFromRampCoinFormat,
  getRampSellCurrenciesFixedProps,
  rampSellEnv,
} from '../utils/ramp-sell-utils';
import cloneDeep from 'lodash.clonedeep';
import {
  RampAssetInfo,
  RampGetAssetsData,
  RampGetAssetsRequestData,
} from '../../../../store/buy-crypto/models/ramp.models';

export type SellCryptoRootScreenParams =
  | {
      amount?: number;
      fromWallet?: Wallet;
      currencyAbbreviation?: string | undefined; // used from charts and deeplinks.
      chain?: string | undefined; // used from charts and deeplinks.
      partner?: SellCryptoExchangeKey | undefined; // used from deeplinks.
      fromDeeplink?: boolean;
    }
  | undefined;

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

export interface SellLimits {
  minAmount?: number;
  maxAmount?: number;
}

const SellCryptoRootContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

let sellCryptoConfig: SellCryptoConfig | undefined;

const SellCryptoRoot = ({
  route,
  navigation,
}: NativeStackScreenProps<
  SellCryptoGroupParamList,
  SellCryptoScreens.ROOT
>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const tokenDataByAddress = useAppSelector(
    ({WALLET}: RootState) => WALLET.tokenDataByAddress,
  );
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const allRates = useAppSelector(({RATE}) => RATE.rates);

  const tokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenOptionsByAddress,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainFromTokenByAddressKey(k);
      return getCurrencyAbbreviation(symbol.toLowerCase(), chain);
    },
  );
  const SupportedChains: string[] = SUPPORTED_COINS;

  const fromWallet = route.params?.fromWallet;
  const fromAmount = Number(route.params?.amount || 0); // deeplink params are strings, ensure this is number so offers will work
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();
  const fromChain = route.params?.chain?.toLowerCase();
  const preSetPartner = route.params?.partner?.toLowerCase() as
    | SellCryptoExchangeKey
    | undefined;
  const fromDeeplink = route.params?.fromDeeplink;
  const [amount, setAmount] = useState<number>(fromAmount);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [disabledWalletFrom, setDisabledWalletFrom] = useState(true);
  const [loadingEnterAmountBtn, setLoadingEnterAmountBtn] =
    useState<boolean>(false);
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [balanceDetailsModalVisible, setBalanceDetailsModalVisible] =
    useState<boolean>(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<WithdrawalMethod>();
  const [sellCryptoSupportedCoins, setSellCryptoSupportedCoins] =
    useState<SellCryptoCoin[]>();
  const [moonpaySelectedCoin, setMoonpaySelectedCoin] =
    useState<SellCryptoCoin>();
  const [fiatCurrency, setFiatCurrency] = useState<string>(
    getAvailableSellCryptoFiatCurrencies().includes(defaultAltCurrency.isoCode)
      ? defaultAltCurrency.isoCode
      : 'USD',
  );
  const [sellLimits, setSellLimits] = useState<SellLimits>({
    minAmount: undefined,
    maxAmount: undefined,
  });
  const [uiFormattedWallet, setUiFormattedWallet] = useState<WalletRowProps>();
  const [useSendMax, setUseSendMax] = useState<boolean>(false);
  const [sendMaxInfo, setSendMaxInfo] = useState<SendMaxInfo | undefined>();

  const showModal = (id: string) => {
    switch (id) {
      case 'paymentMethod':
        setPaymentMethodModalVisible(true);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(true);
        break;
      case 'amount':
        setAmountModalVisible(true);
        break;
      default:
        break;
    }
  };

  const hideModal = (id: string) => {
    switch (id) {
      case 'paymentMethod':
        setPaymentMethodModalVisible(false);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(false);
        break;
      case 'amount':
        setAmountModalVisible(false);
        break;
      default:
        break;
    }
  };

  const walletError = async (
    type?: string,
    fromCurrencyAbbreviation?: string,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    dispatch(showWalletError(type, fromCurrencyAbbreviation));
  };

  const getEVMAccountName = (wallet: Wallet) => {
    const selectedKey = allKeys[wallet.keyId];
    const evmAccountInfo =
      selectedKey.evmAccountsInfo?.[wallet.receiveAddress!];
    return evmAccountInfo?.name;
  };

  const selectFirstAvailableWallet = async () => {
    if (!sellCryptoSupportedCoins || !sellCryptoSupportedCoins[0]) {
      return;
    }

    const keysList = Object.values(allKeys).filter(key => key.backupComplete);

    if (!keysList[0]) {
      walletError('emptyKeyList');
      return;
    }

    if (fromWallet?.id) {
      // Selected wallet from Wallet Details
      setWallet(fromWallet);
      await sleep(500);
      dispatch(dismissOnGoingProcessModal());
      setDisabledWalletFrom(false);
    } else {
      const availableKeys = keysList.filter(key => {
        return key.wallets && keyHasSupportedWallets(key.wallets);
      });

      if (availableKeys[0]) {
        const firstKey = availableKeys[0];

        const firstKeyAllWallets: Wallet[] = firstKey.wallets;
        let allowedWallets = firstKeyAllWallets.filter(wallet =>
          walletIsSupported(wallet),
        );

        if (
          fromCurrencyAbbreviation &&
          sellCryptoSupportedCoins.some(coin => {
            const symbol = fromChain
              ? getExternalServiceSymbol(fromCurrencyAbbreviation, fromChain)
              : fromCurrencyAbbreviation;
            return coin.symbol === symbol;
          })
        ) {
          allowedWallets = allowedWallets.filter(
            wallet =>
              wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
              (fromChain ? wallet.chain === fromChain : true),
          );
        }
        if (allowedWallets[0]) {
          await sleep(500);
          dispatch(dismissOnGoingProcessModal());
          setDisabledWalletFrom(false);
        } else {
          walletError('walletNotSupported', fromCurrencyAbbreviation);
          await sleep(300);
          setDisabledWalletFrom(false);
        }
      } else {
        dispatch(dismissOnGoingProcessModal());
        setDisabledWalletFrom(false);
      }
    }
  };

  const keyHasSupportedWallets = (wallets: Wallet[]): boolean => {
    const supportedWallets = wallets.filter(wallet =>
      walletIsSupported(wallet),
    );
    return !!supportedWallets[0];
  };

  const walletIsSupported = (wallet: Wallet): boolean => {
    return (
      wallet.credentials &&
      (wallet.network === 'livenet' ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          ['btc', 'eth'].includes(
            getExternalServiceSymbol(
              wallet.currencyAbbreviation.toLowerCase(),
              wallet.chain,
            ),
          ))) &&
      wallet.balance?.satSpendable > 0 &&
      sellCryptoSupportedCoins &&
      sellCryptoSupportedCoins.some(coin => {
        const symbol = getExternalServiceSymbol(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        );
        return coin.symbol === symbol;
      }) &&
      wallet.isComplete() &&
      !wallet.hideWallet &&
      !wallet.hideWalletByAccount &&
      (!fromCurrencyAbbreviation ||
        (wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
          (fromChain ? wallet.chain === fromChain : true)))
    );
  };

  const setWallet = (wallet: Wallet) => {
    if (
      wallet.credentials &&
      (wallet.network === 'livenet' ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          ['btc', 'eth'].includes(
            getExternalServiceSymbol(
              wallet.currencyAbbreviation.toLowerCase(),
              wallet.chain,
            ),
          ))) &&
      sellCryptoSupportedCoins &&
      sellCryptoSupportedCoins.some(coin => {
        const symbol = getExternalServiceSymbol(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        );
        return coin.symbol === symbol;
      })
    ) {
      if (wallet.isComplete()) {
        if (allKeys[wallet.keyId].backupComplete) {
          if (wallet.balance?.satSpendable > 0) {
            setSelectedWallet(wallet);
          } else {
            walletError('noSpendableFunds');
          }
        } else {
          walletError('needsBackup');
        }
      } else {
        walletError('walletNotCompleted');
      }
    } else {
      walletError('walletNotSupported');
    }
  };

  const getLinkedWallet = () => {
    if (!selectedWallet) {
      return;
    }

    const linkedWallet = allKeys[selectedWallet.keyId].wallets.find(
      ({tokens}) => tokens?.includes(selectedWallet.id),
    );

    return linkedWallet;
  };

  const showTokensInfoSheet = () => {
    const linkedWallet = getLinkedWallet();
    if (!linkedWallet) {
      return;
    }

    const linkedWalletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;

    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Reminder'),
        message: t('linkedWalletSellWarnMsg', {
          chain: BitpaySupportedCoins[linkedWallet.chain.toLowerCase()].name,
          chainCoin: linkedWallet.currencyAbbreviation.toUpperCase(),
          selectedWallet: selectedWallet?.currencyAbbreviation.toUpperCase(),
          linkedWalletName: linkedWalletName
            ? '(' + linkedWalletName + ')'
            : ' ',
        }),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {
              continueToViewOffers();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const checkIfErc20Token = () => {
    const tokensWarn = async () => {
      await sleep(600);
      showTokensInfoSheet();
    };
    if (
      !!selectedWallet &&
      IsERCToken(selectedWallet.currencyAbbreviation, selectedWallet.chain)
    ) {
      tokensWarn();
    } else {
      continueToViewOffers();
    }
  };

  const continueToViewOffers = () => {
    if (!selectedWallet) {
      return;
    }

    dispatch(
      Analytics.track('Sell Crypto "View Offers"', {
        coin: selectedWallet.currencyAbbreviation.toLowerCase(),
        chain: selectedWallet.chain?.toLowerCase(),
        cryptoAmount: amount,
        fiatCurrency,
        paymentMethod: selectedPaymentMethod!.method,
      }),
    );

    navigation.navigate(SellCryptoScreens.SELL_CRYPTO_OFFERS, {
      amount,
      fiatCurrency,
      coin: selectedWallet.currencyAbbreviation || '',
      chain: selectedWallet.chain || '',
      country: locationData?.countryShortCode || 'US',
      selectedWallet: selectedWallet,
      paymentMethod: selectedPaymentMethod!,
      sellCryptoConfig,
      preSetPartner,
      preLoadPartnersData: sellCryptoExchangesDefault,
      useSendMax: IsERCToken(
        selectedWallet!.currencyAbbreviation,
        selectedWallet!.chain,
      )
        ? false
        : useSendMax,
      sendMaxInfo: sendMaxInfo,
    });
  };

  const setDefaultPaymentMethod = () => {
    const defaultPaymentMethod: WithdrawalMethod = getDefaultPaymentMethod(
      locationData?.countryShortCode,
    );
    setSelectedPaymentMethod(defaultPaymentMethod);
  };

  const checkPaymentMethod = () => {
    if (!selectedWallet || !selectedPaymentMethod) {
      return;
    }
    if (
      (preSetPartner &&
        SellCryptoSupportedExchanges.includes(preSetPartner) &&
        isWithdrawalMethodSupported(
          preSetPartner,
          selectedPaymentMethod,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
          user?.country,
        )) ||
      (!preSetPartner &&
        (isWithdrawalMethodSupported(
          'moonpay',
          selectedPaymentMethod,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
          user?.country,
        ) ||
          isWithdrawalMethodSupported(
            'ramp',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
            user?.country,
          ) ||
          isWithdrawalMethodSupported(
            'simplex',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
            user?.country,
          )))
    ) {
      logger.debug(
        `Selected withdrawal method available for ${selectedWallet.currencyAbbreviation} and ${fiatCurrency}`,
      );
      return;
    } else {
      logger.debug(
        `Selected withdrawal method not available for ${selectedWallet.currencyAbbreviation} and ${fiatCurrency}. Set to default.`,
      );
      setDefaultPaymentMethod();
    }
  };
  const checkPaymentMethodRef = useRef(checkPaymentMethod);
  checkPaymentMethodRef.current = checkPaymentMethod;

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = Object.values(tokenDataByAddress).find(
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
            minAmount: minMinAmount,
            maxAmount: maxMaxAmount,
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
      dispatch(dismissOnGoingProcessModal());
      await sleep(200);
      showError(msg);
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

  const init = async () => {
    try {
      if (fromDeeplink) {
        await sleep(200);
      }
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
      sellCryptoConfig = config?.sellCrypto;
      logger.debug('sellCryptoConfig: ' + JSON.stringify(sellCryptoConfig));
    } catch (err) {
      logger.error('getSellCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (sellCryptoConfig?.disabled) {
      dispatch(dismissOnGoingProcessModal());
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
      dispatch(dismissOnGoingProcessModal());
      await sleep(300);
      showError(msg);
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
          setSellCryptoSupportedCoins(allSupportedCoinsOrdered);
        } else {
          logger.error(
            'Sell crypto getCurrencies Error: allSupportedCoins array is empty',
          );
          const msg = t(
            'Sell Crypto feature is not available at this moment. Please try again later.',
          );
          dispatch(dismissOnGoingProcessModal());
          await sleep(500);
          showError(msg, undefined, undefined, true);
        }
      }
    } catch (err) {
      logger.error('Sell crypto getCurrencies Error: ' + JSON.stringify(err));
      const msg = t(
        'Sell Crypto feature is not available at this moment. Please try again later.',
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      showError(msg, undefined, undefined, true);
    }
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

  const openWalletBalanceModal = () => {
    if (!selectedWallet) {
      return;
    }
    const uiFormattedWallet = buildUIFormattedWallet(
      selectedWallet,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      'symbol',
    );

    setUiFormattedWallet(uiFormattedWallet);
    setBalanceDetailsModalVisible(true);
  };

  const showError = async (
    msg?: string,
    title?: string,
    reason?: string,
    actions?: any,
    goBack?: boolean,
  ) => {
    logger.debug('Sell crypto Root Error. Reason: ' + reason);
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setLoadingQuote(false);
    await sleep(600);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ? title : t('Error'),
        message: msg ? msg : t('Unknown Error'),
        enableBackdropDismiss: goBack ? false : true,
        actions: actions
          ? actions
          : [
              {
                text: t('OK'),
                action: () => {
                  if (goBack) {
                    navigation.goBack();
                  }
                },
                primary: true,
              },
            ],
      }),
    );
  };

  useMount(() => {
    init();
    setDefaultPaymentMethod();
  });

  useEffect(() => {
    if (sellCryptoSupportedCoins && sellCryptoSupportedCoins.length > 0) {
      selectFirstAvailableWallet();
    }
  }, [sellCryptoSupportedCoins]);

  useEffect(() => {
    if (!selectedWallet) {
      return;
    }

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
      setMoonpaySelectedCoin(selectedCoin);
      sellCryptoExchangesDefault.moonpay.precision = selectedCoin?.precision;

      sellGetLimits();
    }

    // Set limits
    if (sellCryptoSupportedCoins && sellCryptoSupportedCoins.length > 0) {
      sellGetLimits();
    }

    setAmount(0);
    setUseSendMax(false);
    setSendMaxInfo(undefined);

    checkPaymentMethodRef.current();
  }, [selectedWallet]);

  return (
    <SellCryptoRootContainer>
      <ScrollView>
        {selectedWallet && (
          <ExternalServicesTitleContainer>
            <ExternalServicesItemTopTitle>
              {t('Sell from')}
            </ExternalServicesItemTopTitle>
            {IsVMChain(selectedWallet.chain) ? (
              <AccountChainsContainer>
                <Blockie size={19} seed={selectedWallet.receiveAddress} />
                <H7
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={{flexShrink: 1}}>
                  {getEVMAccountName(selectedWallet)
                    ? getEVMAccountName(selectedWallet)
                    : `${
                        IsSVMChain(selectedWallet.chain)
                          ? 'Solana Account'
                          : 'EVM Account'
                      }${
                        Number(selectedWallet.credentials.account) === 0
                          ? ''
                          : ` (${selectedWallet.credentials.account})`
                      }`}
                </H7>
              </AccountChainsContainer>
            ) : null}
          </ExternalServicesTitleContainer>
        )}
        <BuyCryptoItemCard
          onPress={() => {
            if (disabledWalletFrom) {
              return;
            }
            showModal('walletSelector');
          }}>
          {!selectedWallet && (
            <>
              <BuyCryptoItemTitle>{t('Sell from')}</BuyCryptoItemTitle>
              <SelectedOptionContainer
                style={{
                  backgroundColor: disabledWalletFrom
                    ? theme.dark
                      ? DisabledDark
                      : Disabled
                    : Action,
                }}>
                <SelectedOptionText
                  style={{
                    color: disabledWalletFrom
                      ? theme.dark
                        ? DisabledTextDark
                        : DisabledText
                      : White,
                  }}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  {t('Choose Crypto')}
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowRight
                    {...{
                      width: 13,
                      height: 13,
                      color: disabledWalletFrom
                        ? theme.dark
                          ? DisabledTextDark
                          : DisabledText
                        : White,
                    }}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </>
          )}
          {selectedWallet && (
            <>
              <ActionsContainer>
                <CurrencyImageContainer>
                  <CurrencyImage
                    img={selectedWallet.img}
                    badgeUri={getBadgeImg(
                      getCurrencyAbbreviation(
                        selectedWallet.currencyAbbreviation,
                        selectedWallet.chain,
                      ),
                      selectedWallet.chain,
                    )}
                    size={45}
                  />
                </CurrencyImageContainer>
                <CurrencyColumn>
                  <Row>
                    <H5 ellipsizeMode="tail" numberOfLines={1}>
                      {selectedWallet.walletName
                        ? selectedWallet.walletName
                        : selectedWallet.currencyName}
                    </H5>
                  </Row>
                  <Row style={{alignItems: 'center'}}>
                    <ListItemSubText
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={{marginTop: Platform.OS === 'ios' ? 2 : 0}}>
                      {selectedWallet.currencyAbbreviation.toUpperCase()}
                    </ListItemSubText>
                  </Row>
                </CurrencyColumn>
                <SelectedOptionCol>
                  <ArrowContainer>
                    <SelectorArrowRight
                      {...{
                        width: 13,
                        height: 13,
                        color: theme.dark ? White : Slate,
                      }}
                    />
                  </ArrowContainer>
                </SelectedOptionCol>
              </ActionsContainer>

              {selectedWallet?.balance?.cryptoSpendable &&
              !loadingWalletFromStatus ? (
                <SellBalanceContainer style={{marginTop: 14}}>
                  <SellBottomDataText>
                    {selectedWallet.balance.cryptoSpendable}{' '}
                    {selectedWallet.currencyAbbreviation.toUpperCase()}{' '}
                    {t('available to sell')}
                  </SellBottomDataText>
                  {selectedWallet.balance.cryptoSpendable !==
                  selectedWallet.balance.crypto ? (
                    <TouchableOpacity
                      onPress={() => {
                        logger.debug('Balance info clicked');
                        openWalletBalanceModal();
                      }}
                      style={{marginLeft: 8}}>
                      <InfoSvg width={20} height={20} />
                    </TouchableOpacity>
                  ) : null}
                </SellBalanceContainer>
              ) : null}

              {loadingWalletFromStatus && <SellCryptoBalanceSkeleton />}
            </>
          )}
        </BuyCryptoItemCard>

        {selectedWallet ? (
          <BuyCryptoItemCard
            onPress={() => {
              showModal('paymentMethod');
            }}>
            <BuyCryptoItemTitle>{t('Withdrawal Method')}</BuyCryptoItemTitle>
            {!selectedPaymentMethod && (
              <ActionsContainer>
                <SelectedOptionContainer style={{backgroundColor: Action}}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    t{'Select Withdrawal Method'}
                  </SelectedOptionText>
                  <ArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </ArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {selectedPaymentMethod && (
              <ActionsContainer>
                <DataText>{selectedPaymentMethod.label}</DataText>
                <SelectedOptionCol>
                  {selectedPaymentMethod.imgSrc}
                  <ArrowContainer>
                    <SelectorArrowRight
                      {...{
                        width: 13,
                        height: 13,
                        color: theme.dark ? White : Slate,
                      }}
                    />
                  </ArrowContainer>
                </SelectedOptionCol>
              </ActionsContainer>
            )}
          </BuyCryptoItemCard>
        ) : null}

        {selectedWallet ? (
          <BuyCryptoItemCard
            onPress={() => {
              showModal('amount');
            }}>
            <BuyCryptoItemTitle>{t('Sell Amount')}</BuyCryptoItemTitle>
            <ActionsContainer>
              <SelectedOptionContainer>
                <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                  {selectedWallet?.currencyAbbreviation.toUpperCase()}
                </SelectedOptionText>
              </SelectedOptionContainer>
              <SelectedOptionCol>
                {loadingEnterAmountBtn ? (
                  <SpinnerContainer>
                    <ActivityIndicator color={ProgressBlue} />
                  </SpinnerContainer>
                ) : (
                  <>
                    {amount && amount > 0 ? (
                      <>
                        {useSendMax ? (
                          <DataText>{t('Maximum Amount')}</DataText>
                        ) : (
                          <DataText>{Number(amount.toFixed(8))}</DataText>
                        )}
                        <ArrowContainer>
                          <SelectorArrowRight
                            {...{
                              width: 13,
                              height: 13,
                              color: theme.dark ? White : Slate,
                            }}
                          />
                        </ArrowContainer>
                      </>
                    ) : (
                      <SelectedOptionContainer
                        style={{backgroundColor: Action}}>
                        <SelectedOptionCol>
                          <SelectedOptionText
                            style={{color: White}}
                            numberOfLines={1}
                            ellipsizeMode={'tail'}>
                            {t('Enter Amount')}
                          </SelectedOptionText>
                        </SelectedOptionCol>
                      </SelectedOptionContainer>
                    )}
                  </>
                )}
              </SelectedOptionCol>
            </ActionsContainer>
          </BuyCryptoItemCard>
        ) : null}

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={!selectedWallet || !amount || amount <= 0}
            onPress={() => {
              checkIfErc20Token();
            }}>
            {t('Continue')}
          </Button>
        </CtaContainer>
      </ScrollView>
      {showArchaxBanner && <ArchaxFooter />}

      {uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={balanceDetailsModalVisible}
          closeModal={() => setBalanceDetailsModalVisible(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      <FromWalletSelectorModal
        route={route}
        navigation={navigation}
        isVisible={walletSelectorModalVisible}
        customSupportedCurrencies={sellCryptoSupportedCoins}
        livenetOnly={!__DEV__}
        modalContext={'sell'}
        modalTitle={t('Crypto to Sell')}
        onDismiss={(selectedWallet: Wallet) => {
          hideModal('walletSelector');
          if (selectedWallet?.currencyAbbreviation) {
            setSelectedWallet(selectedWallet);
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        modalTitle={t('Sell Amount')}
        limitsOpts={{
          maxWalletAmount:
            // @ts-ignore
            selectedWallet?.balance?.cryptoSpendable?.replaceAll(',', ''),
          limits: sellLimits,
        }}
        cryptoCurrencyAbbreviation={selectedWallet?.currencyAbbreviation.toUpperCase()}
        tokenAddress={selectedWallet?.tokenAddress}
        chain={selectedWallet?.chain}
        context={'sellCrypto'}
        onClose={() => hideModal('amount')}
        onSubmit={newAmount => {
          if (newAmount) {
            setAmount(newAmount);
            setUseSendMax(false);
            setSendMaxInfo(undefined);
          }
          hideModal('amount');
        }}
        onSendMaxPressed={async () => {
          hideModal('amount');

          if (!selectedWallet) {
            return;
          }

          let maxAmount: number | undefined;

          if (
            IsERCToken(
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
            )
          ) {
            setUseSendMax(true);
            setSendMaxInfo(undefined);
            maxAmount = Number(
              // @ts-ignore
              selectedWallet.balance.cryptoSpendable.replaceAll(',', ''),
            );
          } else {
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

          if (maxAmount) {
            setAmount(maxAmount);
          }
        }}
      />

      <PaymentMethodsModal
        context={'sellCrypto'}
        onPress={paymentMethod => {
          setSelectedPaymentMethod(paymentMethod);
          hideModal('paymentMethod');
          setAmount(0);
          setUseSendMax(false);
          setSendMaxInfo(undefined);
          setLoadingQuote(false);
        }}
        isVisible={paymentMethodModalVisible}
        onBackdropPress={() => hideModal('paymentMethod')}
        selectedPaymentMethod={selectedPaymentMethod}
        coin={selectedWallet?.currencyAbbreviation}
        chain={selectedWallet?.chain}
        currency={fiatCurrency}
        preSetPartner={preSetPartner}
      />
    </SellCryptoRootContainer>
  );
};

export default SellCryptoRoot;
