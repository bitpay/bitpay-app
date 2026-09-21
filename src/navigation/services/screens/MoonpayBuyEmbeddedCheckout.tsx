import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ViewProps,
  TextProps,
} from 'react-native';
import Modal from 'react-native-modal';
import {
  useTheme,
  RouteProp,
  useRoute,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import {useTheme as useStyledTheme} from '../../../contexts';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import {
  Black,
  White,
  Caution,
  SlateDark,
  Slate30,
  LinkBlue,
  Action,
  ProgressBlue,
} from '../../../styles/colors';
import {BaseText, H7} from '../../../components/styled/Text';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../utils/helper-methods';
import {
  ItemDivisor,
  SelectedOptionContainer,
  SelectedOptionText,
  SelectedOptionCol,
} from '../swap-crypto/styled/SwapCryptoCheckout.styled';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../store/app/app.actions';
import {useTranslation} from 'react-i18next';
import {
  PaymentMethod,
  PaymentMethodKey,
} from '../buy-crypto/constants/BuyCryptoConstants';
import {
  getMoonpayCardBrandLabel,
  getMoonpayFixedCurrencyAbbreviation,
  getMoonpayPaymentMethodFormat,
  moonpayEnv,
} from '../buy-crypto/utils/moonpay-utils';
import {
  MoonpayEmbeddedCardPaymentMethod,
  MoonpayGetPaymentMethodsEmbeddedRequestData,
  MoonpayGetQuoteEmbeddedRequestData,
  MoonpayPaymentData,
  MoonpayPaymentType,
  MoonpayQuoteEmbeddedData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {
  moonpayGetPaymentMethodsEmbedded,
  moonpayGetQuoteEmbedded,
} from '../../../store/buy-crypto/effects/moonpay/moonpay';
import {
  MoonPayApplePayFrame,
  ApplePayCompletePayload,
  ApplePayErrorPayload,
  ApplePayFrameRef,
} from '../components/MoonPayApplePayFrame';
import {
  MoonPayAddCardFrame,
  AddCardErrorPayload,
} from '../components/MoonPayAddCardFrame';
import MoonpaySelectCardModal from '../components/MoonpaySelectCardModal';
import {
  MoonPayBuyFrame,
  BuyFrameCompletePayload,
  BuyFrameErrorPayload,
  BuyFrameRef,
} from '../components/MoonPayBuyFrame';
import {
  MoonPayChallengeFrame,
  ChallengeCompletePayload,
} from '../components/MoonPayChallengeFrame';
import {AppEffects} from '../../../store/app';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import MoonpayLogo from '../../../components/icons/external-services/moonpay/moonpay-logo';
import {SpinnerContainer} from '../swap-crypto/styled/SwapCryptoRoot.styled';
import cloneDeep from 'lodash.clonedeep';
import {BuyCryptoActions} from '../../../store/buy-crypto';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {CryptoOffer} from '../components/externalServicesOfferSelector';
import {MoonpayClientCredentials} from '../utils/moonpayFrameCrypto';
import {usePaymentSent} from '../../../contexts';
import {MoonpaySettingsProps} from '../../../navigation/tabs/settings/external-services/screens/MoonpaySettings';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {ExternalServicesSettingsScreens} from '../../tabs/settings/external-services/ExternalServicesGroup';
import MoonpayEmbeddedCheckoutSkeleton from '../components/MoonpayEmbeddedCheckoutSkeleton';
import {
  getMoonpayDisclosureCopy,
  getMoonpayDefaultDisclosure,
} from '../buy-crypto/constants/MoonpayDisclosures';
import {HEIGHT, WIDTH} from '../../../components/styled/Containers';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Button, {ButtonState} from '../../../components/button/Button';

// Styled
const styles = StyleSheet.create({
  root: {flex: 1},
  moonpayEmbeddedCheckoutContainer: {
    flex: 1,
    margin: 14,
  },
  rowText: {
    fontSize: 13,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 39,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cryptoTotalText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  fiatTotalText: {
    fontSize: 13,
    fontWeight: '400',
  },
  rowDataContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 0,
  },
  bottomSection: {
    paddingTop: 16,
  },
  legalText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  disclosureText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  poweredByContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  poweredByText: {
    fontSize: 11,
    marginRight: 4,
  },
  poweredByPartner: {
    fontSize: 11,
    fontWeight: '700',
  },
  webViewModalContainer: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'scroll',
  },
  webViewModalHeader: {
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  webViewCloseButton: {
    padding: 10,
  },
  webViewCloseText: {
    fontSize: 24,
  },
});

export const MoonpayEmbeddedCheckoutContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => (
  <SafeAreaView
    style={[styles.moonpayEmbeddedCheckoutContainer, style]}
    {...rest}
  />
);

const RowLabel = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.rowText, style]} {...rest} />
  ),
);
RowLabel.displayName = 'RowLabel';

const RowData = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => (
    <BaseText ref={ref} style={[styles.rowText, style]} {...rest} />
  ),
);
RowData.displayName = 'RowData';

const HeaderContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.headerContainer, style]} {...rest} />
);

const IconRow: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.iconRow, style]} {...rest} />
);

const Title = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useStyledTheme();
    return (
      <BaseText
        ref={ref}
        style={[styles.title, {color: theme.dark ? White : SlateDark}, style]}
        {...rest}
      />
    );
  },
);
Title.displayName = 'Title';

const Subtitle = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useStyledTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.subtitle,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
Subtitle.displayName = 'Subtitle';

const TotalContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.totalContainer, style]} {...rest} />
);

const CryptoTotalText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.cryptoTotalText,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
});
CryptoTotalText.displayName = 'CryptoTotalText';

const FiatTotalText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.fiatTotalText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
FiatTotalText.displayName = 'FiatTotalText';

export const RowDataContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.rowDataContainer, style]} {...rest} />
);

const BottomSection: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.bottomSection, style]} {...rest} />
);

const LegalText = React.forwardRef<Text, React.ComponentProps<typeof BaseText>>(
  ({style, ...rest}, ref) => {
    const theme = useStyledTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.legalText,
          {color: theme.dark ? Slate30 : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
LegalText.displayName = 'LegalText';

const LegalLink = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <Text
      ref={ref}
      style={[{color: theme.dark ? LinkBlue : Action}, style]}
      {...rest}
    />
  );
});
LegalLink.displayName = 'LegalLink';

const DisclosureText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.disclosureText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
DisclosureText.displayName = 'DisclosureText';

const PoweredByContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.poweredByContainer, style]} {...rest} />
);

const PoweredByText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.poweredByText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
PoweredByText.displayName = 'PoweredByText';

const PoweredByPartner = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.poweredByPartner,
        {color: theme.dark ? White : '#565656'},
        style,
      ]}
      {...rest}
    />
  );
});
PoweredByPartner.displayName = 'PoweredByPartner';

const WebViewModalContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.webViewModalContainer, style]} {...rest} />
);

const WebViewModalHeader: React.FC<ViewProps & {topInset: number}> = ({
  style,
  topInset,
  ...rest
}) => {
  const theme = useStyledTheme();
  return (
    <View
      style={[
        styles.webViewModalHeader,
        {
          marginTop: topInset,
          backgroundColor: theme.dark ? '#1a1a1a' : '#f8f8f8',
          borderBottomColor: theme.dark ? '#333' : '#ddd',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const WebViewCloseButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.webViewCloseButton, style]} {...rest} />
);

const WebViewCloseText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useStyledTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.webViewCloseText,
        {color: theme.dark ? '#ccc' : '#333'},
        style,
      ]}
      {...rest}
    />
  );
});
WebViewCloseText.displayName = 'WebViewCloseText';

export interface MoonpayBuyEmbeddedCheckoutProps {
  wallet: Wallet;
  toAddress: string;
  offer: CryptoOffer;
  moonpayFormatData: {
    currencyCodeMoonpayFormat: string;
    paymentMethodMoonpayFormat: MoonpayPaymentType | undefined;
  };
  credentials: MoonpayClientCredentials;
  paymentMethod: PaymentMethod;
}

let countDown: NodeJS.Timeout | undefined;

// Fixed height for the card-selector sheet (bottom-anchored, compact). The
// add-card frame instead grows the same modal to fill the full screen.
const CARD_SELECTOR_MODAL_HEIGHT = Math.min(560, HEIGHT * 0.55);

const MoonpayBuyEmbeddedCheckout: React.FC = () => {
  let {
    params: {
      wallet,
      toAddress,
      offer,
      moonpayFormatData,
      credentials,
      paymentMethod,
    },
  } = useRoute<RouteProp<{params: MoonpayBuyEmbeddedCheckoutProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user: User | undefined = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.user[network],
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const applePayFrameRef = useRef<ApplePayFrameRef>(null);
  const buyFrameRef = useRef<BuyFrameRef>(null);
  const quoteRefreshTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const quoteReqDataRef = useRef<MoonpayGetQuoteEmbeddedRequestData | null>(
    null,
  );
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [expiredAnalyticSent, setExpiredAnalyticSent] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [embeddedQuoteData, setEmbeddedQuoteData] = useState<any>(null);
  const [totalFiatAmount, setTotalFiatAmount] = useState<number | null>(null);
  const [initialQuoteSignature, setInitialQuoteSignature] = useState<
    string | null
  >(null);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const {showPaymentSent, hidePaymentSent} = usePaymentSent();
  // Generated once per checkout and handed to MoonPay when the payment frame
  // mounts, so their transaction can be correlated with ours.
  const externalTransactionIdRef = useRef<string>(`${wallet.id}-${Date.now()}`);

  // Cards embedded flow — only relevant when paymentMethod is a card.
  const isCardPaymentMethod =
    paymentMethod?.method === 'creditCard' ||
    paymentMethod?.method === 'debitCard';

  const [cardPaymentMethods, setCardPaymentMethods] = useState<
    MoonpayEmbeddedCardPaymentMethod[]
  >([]);
  const [cardPaymentMethod, setCardPaymentMethod] = useState<
    MoonpayEmbeddedCardPaymentMethod | undefined
  >();
  const [loadingCardPaymentMethod, setLoadingCardPaymentMethod] =
    useState(false);
  const [cardPaymentMethodsFailed, setCardPaymentMethodsFailed] =
    useState(false);
  const [cardQuoteFailed, setCardQuoteFailed] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showSelectCardModal, setShowSelectCardModal] = useState(false);

  const cardModalHeightAnim = useRef(
    new Animated.Value(CARD_SELECTOR_MODAL_HEIGHT),
  ).current;
  const [cardQuoteSignature, setCardQuoteSignature] = useState<string | null>(
    null,
  );
  const [cardPaymentStarted, setCardPaymentStarted] = useState(false);
  const [cardPaymentButtonState, setCardPaymentButtonState] =
    useState<ButtonState>();

  // Whether there's at least one other usable saved card besides the
  // selected one — if not, "select a different card" has nothing to offer
  // and falls back to the single add-card action.
  const hasOtherSelectableCards = cardPaymentMethods.some(
    card => card.id !== cardPaymentMethod?.id && card.availability?.active,
  );

  const locatedInNYorWA =
    locationData?.countryShortCode === 'US' &&
    ['NY', 'WA'].includes(locationData?.stateShortCode || '');
  const userFromNYorWA =
    user?.country === 'US' && ['NY', 'WA'].includes(user?.state || '');
  const isNYorWA: boolean = locatedInNYorWA || userFromNYorWA;

  const paymentTimeControl = (expires: string | number): void => {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);

    setPaymentExpired(false);
    setExpirationTime(expirationTime);

    countDown = setInterval(() => {
      setExpirationTime(expirationTime, countDown);
    }, 1000);
  };

  const setExpirationTime = (
    expirationTime: number,
    countDown?: NodeJS.Timeout,
  ): void => {
    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      setPaymentExpired(true);
      setRemainingTimeStr('expired');
      if (countDown) {
        clearInterval(countDown);
      }
      return;
    }

    const totalSecs = expirationTime - now - 1; // Refresh the quote 1 second before expiration to account for any potential delays
    const m = Math.floor(totalSecs / 60) >= 0 ? Math.floor(totalSecs / 60) : 0;
    const s = totalSecs % 60 >= 0 ? totalSecs % 60 : 0;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  // Stops the scheduled refresh but keeps quoteReqDataRef, so the quote can
  // still be re-fetched on demand (e.g. when the buy frame reports the quote
  // expired mid-payment).
  const stopQuoteRefreshTimer = (): void => {
    if (quoteRefreshTimerRef.current) {
      clearTimeout(quoteRefreshTimerRef.current);
      quoteRefreshTimerRef.current = undefined;
    }
  };

  const cancelQuoteRefresh = (): void => {
    if (quoteRefreshTimerRef.current) {
      clearTimeout(quoteRefreshTimerRef.current);
      quoteRefreshTimerRef.current = undefined;
    }
    quoteReqDataRef.current = null;
  };

  const scheduleQuoteRefresh = (expiresAt: string): void => {
    if (quoteRefreshTimerRef.current) {
      clearTimeout(quoteRefreshTimerRef.current);
    }
    const refreshIn = new Date(expiresAt).getTime() - Date.now() - 1000;
    if (refreshIn <= 0) {
      refreshQuote();
      return;
    }
    quoteRefreshTimerRef.current = setTimeout(refreshQuote, refreshIn);
  };

  const refreshQuote = async (): Promise<void> => {
    const reqData = quoteReqDataRef.current;
    if (!reqData) {
      return;
    }
    try {
      const newQuoteData: MoonpayQuoteEmbeddedData =
        await moonpayGetQuoteEmbedded(reqData);
      if (newQuoteData?.signature) {
        applePayFrameRef.current?.updateQuote(newQuoteData.signature);
        if (reqData.paymentMethodId) {
          const executableSignature = newQuoteData.executable
            ? newQuoteData.signature
            : null;
          setCardQuoteSignature(executableSignature);
          if (executableSignature) {
            // Pushes the quote into an already-mounted buy frame instead of
            // remounting it (the signature is part of the frame URL).
            buyFrameRef.current?.updateQuote(executableSignature);
          }
        }
      }
      setEmbeddedQuoteData(newQuoteData);
      if (newQuoteData?.source?.amount && newQuoteData?.fees) {
        const receivingFiatAmount =
          Number(newQuoteData.source.amount) -
          Number(newQuoteData.fees.moonpay?.amount ?? 0) -
          Number(newQuoteData.fees.partner?.amount ?? 0) -
          Number(newQuoteData.fees.network?.amount ?? 0);
        setTotalFiatAmount(receivingFiatAmount);
      }
      if (newQuoteData?.expiresAt) {
        if (countDown) {
          clearInterval(countDown);
        }
        paymentTimeControl(new Date(newQuoteData.expiresAt).getTime());
        scheduleQuoteRefresh(newQuoteData.expiresAt);
      }
    } catch (err) {
      logger.error('Failed to refresh MoonPay quote: ' + JSON.stringify(err));
    }
  };

  const init = async () => {
    logger.debug(
      'MoonPay embedded checkout initializing: ' +
        wallet.currencyAbbreviation.toUpperCase() +
        ' on ' +
        wallet.chain +
        ', ' +
        offer.fiatAmount +
        ' ' +
        offer.fiatCurrency +
        ' | paymentMethod: ' +
        (paymentMethod?.method ?? 'unknown') +
        ' | moonpayFormat: ' +
        JSON.stringify(moonpayFormatData),
    );
    let _paymentMethod: MoonpayPaymentType | undefined =
      getMoonpayPaymentMethodFormat(
        (paymentMethod?.method as PaymentMethodKey) ?? 'applePay',
        true,
      );

    const reqData: MoonpayGetQuoteEmbeddedRequestData = {
      env: moonpayEnv,
      accessToken: credentials.accessToken,
      destinationAddress: toAddress,
      currencyAbbreviation: getMoonpayFixedCurrencyAbbreviation(
        wallet.currencyAbbreviation.toLowerCase(),
        wallet.chain,
      ),
      baseCurrencyAmount: offer.fiatAmount,
      baseCurrencyCode: offer.fiatCurrency.toLowerCase(),
      paymentMethod: _paymentMethod,
      areFeesIncluded: true,
    };
    quoteReqDataRef.current = reqData;

    const quoteData: MoonpayQuoteEmbeddedData = await moonpayGetQuoteEmbedded(
      reqData,
    );

    if (quoteData?.source?.amount && quoteData?.fees) {
      const receivingFiatAmount =
        Number(quoteData.source.amount) -
        Number(quoteData.fees.moonpay?.amount ?? 0) -
        Number(quoteData.fees.partner?.amount ?? 0) -
        Number(quoteData.fees.network?.amount ?? 0);
      setTotalFiatAmount(receivingFiatAmount);
    }
    if (quoteData.expiresAt) {
      const expirationTime = new Date(quoteData.expiresAt).getTime();
      paymentTimeControl(expirationTime);
    }
    setEmbeddedQuoteData(quoteData);
    if (quoteData?.signature) {
      setInitialQuoteSignature(quoteData.signature);
    }
    if (quoteData?.expiresAt) {
      scheduleQuoteRefresh(quoteData.expiresAt);
    }

    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  // Cards embedded flow — load an existing usable saved card, if any, so the
  // user can pay without going through the add-card frame again.
  const loadCardPaymentMethod = useCallback(async () => {
    setLoadingCardPaymentMethod(true);
    setCardPaymentMethodsFailed(false);
    try {
      const reqData: MoonpayGetPaymentMethodsEmbeddedRequestData = {
        accessToken: credentials.accessToken,
      };
      const data = await moonpayGetPaymentMethodsEmbedded(reqData);
      const cards =
        data?.paymentMethods?.filter(pm => pm.type === 'card') ?? [];
      setCardPaymentMethods(cards);
      setCardPaymentMethod(cards.find(card => card.availability?.active));
    } catch (err) {
      setCardPaymentMethodsFailed(true);
      logger.error(
        'Failed to load MoonPay saved cards: ' +
          (err instanceof Error ? err.message : JSON.stringify(err)),
      );
    } finally {
      setLoadingCardPaymentMethod(false);
    }
  }, [credentials.accessToken, logger]);

  useEffect(() => {
    if (!isCardPaymentMethod) {
      return;
    }
    loadCardPaymentMethod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardPaymentMethod]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const showSub = Keyboard.addListener('keyboardDidShow', e =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(cardModalHeightAnim, {
      toValue: showAddCardModal
        ? HEIGHT - keyboardHeight - (insets?.top ?? 0)
        : CARD_SELECTOR_MODAL_HEIGHT,
      duration: keyboardHeight ? 0 : 280,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // animating height — not supported by the native driver
    }).start();
  }, [showAddCardModal, keyboardHeight, insets?.top, cardModalHeightAnim]);

  // Re-quotes bound to the selected card. MoonPay evaluates card-specific
  // requirements (fees, limits, disclosures) from the card id, so this runs as
  // soon as a card is selected: the amounts, fees and disclosures on screen —
  // and the signature the buy frame will charge — all come from this quote.
  const loadCardQuote = useCallback(
    async (cardId: string) => {
      const baseReqData = quoteReqDataRef.current;
      if (!baseReqData) {
        return;
      }
      const reqData: MoonpayGetQuoteEmbeddedRequestData = {
        ...baseReqData,
        paymentMethodId: cardId,
      };
      quoteReqDataRef.current = reqData;
      setCardQuoteSignature(null);
      setCardQuoteFailed(false);
      try {
        const quote: MoonpayQuoteEmbeddedData = await moonpayGetQuoteEmbedded(
          reqData,
        );
        if (!quote?.signature || !quote.executable) {
          throw new Error(
            'MoonPay returned a non-executable quote for the selected card',
          );
        }
        setEmbeddedQuoteData(quote);
        if (quote.source?.amount && quote.fees) {
          setTotalFiatAmount(
            Number(quote.source.amount) -
              Number(quote.fees.moonpay?.amount ?? 0) -
              Number(quote.fees.partner?.amount ?? 0) -
              Number(quote.fees.network?.amount ?? 0),
          );
        }
        if (quote.expiresAt) {
          if (countDown) {
            clearInterval(countDown);
          }
          paymentTimeControl(new Date(quote.expiresAt).getTime());
          scheduleQuoteRefresh(quote.expiresAt);
        }
        setCardQuoteSignature(quote.signature);
      } catch (err) {
        setCardQuoteFailed(true);
        logger.error(
          'Failed to get MoonPay card quote: ' +
            (err instanceof Error ? err.message : JSON.stringify(err)),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logger],
  );

  useEffect(() => {
    if (!isCardPaymentMethod || !cardPaymentMethod?.id || isLoading) {
      return;
    }
    loadCardQuote(cardPaymentMethod.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardPaymentMethod, cardPaymentMethod?.id, isLoading]);

  // The quote was already fetched and approved on screen, so paying is just
  // mounting the buy frame with it. The refresh is stopped first so the quote
  // can't change under an in-flight payment.
  const startCardPayment = () => {
    if (!cardQuoteSignature) {
      return;
    }
    // Freeze the scheduled refresh so the total can't change under an
    // in-flight payment, but keep the request data: if MoonPay reports the
    // quote expired, onQuoteExpired re-quotes and pushes it with setQuote.
    stopQuoteRefreshTimer();
    if (countDown) {
      clearInterval(countDown);
    }
    setCardPaymentButtonState('loading');
    setCardPaymentStarted(true);
  };

  const getErrorMsgFromError = (err: any): string => {
    let msg = t('Something went wrong. Please try again later.');
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err.error && typeof err.error === 'string') {
          msg = err.error;
        } else if (err.error?.error && typeof err.error.error === 'string') {
          msg = err.error.error;
        }
      }
    }
    return msg;
  };

  const showError = async (
    err?: any,
    reason?: string,
    errorMsgLog?: string,
    title?: string,
    actions?: any[],
  ) => {
    setIsLoading(false);

    let msg = getErrorMsgFromError(err);

    logger.error('Moonpay error: ' + msg);

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'moonpay',
        context: 'MoonpayBuyEmbeddedCheckout',
        reason: reason ? `[${reason}]: ${msg}` : msg,
        paymentMethod: paymentMethod?.method || '',
        amount: Number((offer as CryptoOffer)?.fiatAmount) || '',
        coin: cloneDeep(wallet?.currencyAbbreviation)?.toLowerCase() || '',
        chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
        fiatCurrency: offer?.fiatCurrency || '',
      }),
    );

    await sleep(700);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ?? t('Error'),
        message:
          t(
            'An error occurred during payment processing. Reason for failure:',
          ) + (msg ? ` ${msg}` : t('Unknown Error')),
        onBackdropDismiss: () => navigation.goBack(),
        enableBackdropDismiss: true,
        actions: actions ?? [
          {
            text: t('OK'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(1000);
              navigation.goBack();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const onCloseModal = async () => {
    hidePaymentSent();
  };

  const handleTransactionComplete = async (transaction: {
    id: string;
    status: string;
  }) => {
    cancelQuoteRefresh();
    logger.debug(
      'MoonPay transaction complete: ' + JSON.stringify(transaction),
    );

    showPaymentSent({
      onCloseModal,
      title: t('Transaction Submitted'),
    });

    const destinationChain = wallet.chain;
    const coin = cloneDeep(wallet.currencyAbbreviation).toLowerCase();
    const cryptoAmountReceiving = embeddedQuoteData?.destination?.amount
      ? Number(embeddedQuoteData.destination.amount)
      : Number(offer.amountReceiving);

    const newData: MoonpayPaymentData = {
      address: toAddress,
      created_on: Date.now(),
      crypto_amount: cryptoAmountReceiving,
      chain: destinationChain,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: offer.buyAmount!,
      fiat_total_amount: offer.amountCost!,
      fiat_total_amount_currency: offer.fiatCurrency,
      external_id: externalTransactionIdRef.current,
      payment_method: paymentMethod?.method,
      status: 'embeddedPaymentRequestSent',
      user_id: wallet.id,
      user_eid: user?.eid,
      is_embedded: true,
      transaction_id: transaction.id,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestMoonpay({
        moonpayPaymentData: newData,
      }),
    );

    const analyticsData = {
      exchange: 'moonpay',
      fiatAmount: offer.amountCost || '',
      feeAmount:
        (offer.amountCost &&
          offer.buyAmount &&
          Number(offer.amountCost) - Number(offer.buyAmount)) ||
        '',
      fiatCurrency: offer.fiatCurrency || '',
      coin: coin?.toLowerCase() || '',
      chain: destinationChain.toLowerCase() || '',
      cryptoAmount: cryptoAmountReceiving || '',
      paymentMethod: paymentMethod?.method || '',
      exchangeRate:
        (cryptoAmountReceiving &&
          offer.buyAmount &&
          Number(offer.buyAmount) / cryptoAmountReceiving) ||
        '',
      isEmbedded: true,
    };

    dispatch(Analytics.track('Purchased Buy Crypto', analyticsData));

    await sleep(1200);
    const moonpaySettingsParams: MoonpaySettingsProps = {
      incomingPaymentRequest: {
        externalId: externalTransactionIdRef.current,
        transactionId: transaction.id,
        status: transaction.status ?? newData.status,
        flow: 'buy',
      },
    };

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: RootStacks.TABS,
            params: {screen: TabsScreens.HOME},
          },
          {
            name: ExternalServicesSettingsScreens.MOONPAY_SETTINGS,
            params: moonpaySettingsParams,
          },
        ],
      }),
    );
  };

  const handleChallengeCancel = async () => {
    setChallengeUrl(null);
    setCardPaymentStarted(false);
    setCardPaymentButtonState(undefined);
    setExpiredAnalyticSent(false);
    logger.debug('MoonPay challenge cancelled by user.');
    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'moonpay',
        context: 'MoonpayBuyEmbeddedCheckout',
        reason: 'Challenge cancelled by user',
        paymentMethod: paymentMethod?.method || '',
        amount: Number((offer as CryptoOffer)?.fiatAmount) || '',
        coin: cloneDeep(wallet?.currencyAbbreviation)?.toLowerCase() || '',
        chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
        fiatCurrency: offer?.fiatCurrency || '',
      }),
    );
    if (countDown) {
      clearInterval(countDown);
    }
    setIsLoading(true);
    try {
      await init();
    } catch (err) {
      showError(err);
    }
  };

  useEffect(() => {
    init().catch(err => {
      showError(err, 'initFailed');
    });

    return () => {
      if (countDown) {
        clearInterval(countDown);
      }
      if (quoteRefreshTimerRef.current) {
        clearTimeout(quoteRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const disclosures = embeddedQuoteData?.paymentDisclosures;
    if (!disclosures?.length) {
      return;
    }
    disclosures.forEach((d: {id: string; version: string}) => {
      const {isFallback} = getMoonpayDisclosureCopy(d as any);
      if (isFallback) {
        logger.warn(
          `[MoonpayEmbeddedCheckout] Unknown MoonPay payment disclosure (id: ${d.id}, version: ${d.version}). Rendering conservative fallback — update MoonpayDisclosures.ts.`,
        );
      }
    });
  }, [embeddedQuoteData?.paymentDisclosures]);

  useEffect(() => {
    if (
      remainingTimeStr === 'expired' &&
      !expiredAnalyticSent &&
      !challengeUrl
    ) {
      dispatch(
        Analytics.track('Failed Buy Crypto', {
          exchange: 'moonpay',
          context: 'MoonpayBuyEmbeddedCheckout',
          reason: 'Time to make the payment expired',
          paymentMethod: paymentMethod?.method || '',
          amount: Number((offer as CryptoOffer)?.fiatAmount) || '',
          coin: cloneDeep(wallet?.currencyAbbreviation)?.toLowerCase() || '',
          chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
          fiatCurrency: offer?.fiatCurrency || '',
        }),
      );
      setExpiredAnalyticSent(true);
    }
  }, [remainingTimeStr, expiredAnalyticSent, challengeUrl]);

  return (
    <View style={styles.root}>
      <MoonpayEmbeddedCheckoutContainer>
        <ScrollView ref={scrollViewRef}>
          <HeaderContainer>
            <IconRow>
              <CurrencyImage
                img={wallet.img}
                badgeUri={getBadgeImg(
                  getCurrencyAbbreviation(
                    wallet.currencyAbbreviation,
                    wallet.chain,
                  ),
                  wallet.chain,
                )}
                size={40}
              />
            </IconRow>

            <Title>
              {formatFiatAmount(Number(offer.fiatAmount), offer.fiatCurrency)}
            </Title>
            {isLoading || !embeddedQuoteData?.destination ? (
              <MoonpayEmbeddedCheckoutSkeleton context="amount" />
            ) : (
              <Subtitle>
                {embeddedQuoteData.destination.amount}{' '}
                {embeddedQuoteData.destination.asset.code}
              </Subtitle>
            )}
          </HeaderContainer>

          <RowDataContainer>
            <RowLabel>{t('Using')}</RowLabel>
            <RowData>
              {t('MoonPay using')}{' '}
              {isCardPaymentMethod && cardPaymentMethod
                ? getMoonpayCardBrandLabel(cardPaymentMethod.brand) +
                  ' •••• ' +
                  cardPaymentMethod.last4
                : paymentMethod?.label}
            </RowData>
          </RowDataContainer>
          <ItemDivisor />
          <RowDataContainer style={{paddingTop: 10, paddingBottom: 10}}>
            <RowLabel>{t('Destination')}</RowLabel>
            <SelectedOptionContainer style={{height: 30}}>
              <SelectedOptionCol>
                <CurrencyImage
                  img={wallet.img}
                  badgeUri={getBadgeImg(
                    getCurrencyAbbreviation(
                      wallet.currencyAbbreviation,
                      wallet.chain,
                    ),
                    wallet.chain,
                  )}
                  size={12}
                />
                <SelectedOptionText
                  numberOfLines={1}
                  ellipsizeMode={'tail'}
                  style={{marginLeft: 5}}>
                  {wallet.walletName ? wallet.walletName : wallet.currencyName}
                </SelectedOptionText>
              </SelectedOptionCol>
            </SelectedOptionContainer>
          </RowDataContainer>
          <ItemDivisor />
          {/* <RowDataContainer style={{paddingTop: 10, paddingBottom: 10}}>
          <RowLabel>{t('Deposit Address')}</RowLabel>
          <SendToPill
            icon={
              <CurrencyImage
                img={wallet.img}
                size={12}
                badgeUri={getBadgeImg(
                  getCurrencyAbbreviation(
                    wallet.currencyAbbreviation,
                    wallet.chain,
                  ),
                  wallet.chain,
                )}
              />
            }
            description={formatCryptoAddress(toAddress)}
            onPress={() => {
              // copyText(toAddress);
            }}
          />
        </RowDataContainer>
        <ItemDivisor />*/}
          {isLoading ? (
            <MoonpayEmbeddedCheckoutSkeleton context="data" />
          ) : (
            <>
              {embeddedQuoteData?.exchangeRate ? (
                <>
                  <RowDataContainer>
                    <RowLabel>{t('Exchange Rate')}</RowLabel>
                    {embeddedQuoteData?.exchangeRate ? (
                      <RowData>
                        {'1 ' +
                          embeddedQuoteData.destination.asset.code +
                          ' @ '}
                        {formatFiatAmount(
                          Number(embeddedQuoteData.exchangeRate),
                          embeddedQuoteData.source.asset.code,
                        )}
                      </RowData>
                    ) : (
                      <RowData>...</RowData>
                    )}
                  </RowDataContainer>
                  <ItemDivisor />
                </>
              ) : null}
              <RowDataContainer>
                <RowLabel>{t('New quote in')}</RowLabel>
                {cardPaymentStarted ? (
                  <ActivityIndicator color={ProgressBlue} size={'small'} />
                ) : (
                  !!remainingTimeStr && (
                    <RowData
                      style={{
                        color: paymentExpired
                          ? Caution
                          : theme.dark
                          ? White
                          : Black,
                      }}>
                      {remainingTimeStr === 'expired'
                        ? t('Expired')
                        : remainingTimeStr}
                    </RowData>
                  )
                )}
              </RowDataContainer>
              <ItemDivisor />
              {embeddedQuoteData?.fees?.network ? (
                <>
                  <RowDataContainer>
                    <RowLabel>{t('Network Fee')}</RowLabel>
                    {embeddedQuoteData?.fees?.network ? (
                      <RowData>
                        {formatFiatAmount(
                          Number(embeddedQuoteData.fees.network.amount),
                          embeddedQuoteData.fees.network.asset.code,
                        )}
                      </RowData>
                    ) : (
                      <RowData>...</RowData>
                    )}
                  </RowDataContainer>
                  <ItemDivisor />
                </>
              ) : null}
              {embeddedQuoteData?.fees?.moonpay ? (
                <>
                  <RowDataContainer>
                    <RowLabel>{t('Partner Fee')}</RowLabel>
                    {embeddedQuoteData?.fees?.moonpay?.amount ? (
                      <RowData>
                        {formatFiatAmount(
                          Number(embeddedQuoteData.fees.moonpay.amount),
                          embeddedQuoteData.fees.moonpay.asset.code,
                        )}
                      </RowData>
                    ) : (
                      <RowData>...</RowData>
                    )}
                  </RowDataContainer>
                  <ItemDivisor />
                </>
              ) : null}
              <ItemDivisor />
              {embeddedQuoteData?.fees?.partner ? (
                <>
                  <RowDataContainer>
                    <RowLabel>{t('BitPay Fee')}</RowLabel>
                    {embeddedQuoteData?.fees?.partner?.amount ? (
                      <RowData>
                        {formatFiatAmount(
                          Number(embeddedQuoteData.fees.partner.amount),
                          embeddedQuoteData.fees.partner.asset.code,
                        )}
                      </RowData>
                    ) : (
                      <RowData>...</RowData>
                    )}
                  </RowDataContainer>
                  <ItemDivisor />
                </>
              ) : null}
              {embeddedQuoteData && totalFiatAmount ? (
                <RowDataContainer>
                  <H7>{t('Receiving')}</H7>
                  {!!embeddedQuoteData?.destination && (
                    <TotalContainer>
                      <CryptoTotalText>
                        {embeddedQuoteData.destination.amount}{' '}
                        {embeddedQuoteData.destination.asset.code}
                      </CryptoTotalText>
                      <FiatTotalText>
                        {'≈ '}
                        {formatFiatAmount(
                          totalFiatAmount,
                          embeddedQuoteData.source.asset.code,
                        )}
                      </FiatTotalText>
                    </TotalContainer>
                  )}
                </RowDataContainer>
              ) : null}
            </>
          )}
        </ScrollView>

        <BottomSection>
          {(() => {
            if (!embeddedQuoteData) return null;
            // If the API returned specific disclosures, render only those.
            if (embeddedQuoteData?.paymentDisclosures?.length) {
              return embeddedQuoteData.paymentDisclosures.map(
                (disclosure: {id: string; version: string}) => {
                  const {segments} = getMoonpayDisclosureCopy(
                    disclosure as any,
                  );
                  return (
                    <DisclosureText
                      key={`${disclosure.id}-${disclosure.version}`}>
                      {segments.map((segment, i) =>
                        segment.type === 'link' ? (
                          <LegalLink
                            key={i}
                            onPress={() => openUrl(segment.url)}>
                            {segment.label}
                          </LegalLink>
                        ) : (
                          segment.value
                        ),
                      )}
                    </DisclosureText>
                  );
                },
              );
            } else {
              // No API disclosures — fall back to geo/generic legal text.
              const legalSegments = getMoonpayDefaultDisclosure(
                embeddedQuoteData?.paymentDisclosures,
                isNYorWA,
              );
              if (!legalSegments) return null;
              return (
                <LegalText>
                  {legalSegments.map((segment, i) =>
                    segment.type === 'link' ? (
                      <LegalLink key={i} onPress={() => openUrl(segment.url)}>
                        {segment.label}
                      </LegalLink>
                    ) : (
                      segment.value
                    ),
                  )}
                </LegalText>
              );
            }
          })()}
          {isCardPaymentMethod ? (
            cardPaymentStarted && cardQuoteSignature ? (
              <>
                <SpinnerContainer>
                  <ActivityIndicator color={ProgressBlue} />
                </SpinnerContainer>
                <MoonPayBuyFrame
                  ref={buyFrameRef}
                  clientToken={credentials.clientToken}
                  signature={cardQuoteSignature}
                  externalTransactionId={externalTransactionIdRef.current}
                  onReady={() => {
                    logger.debug('MoonPay Buy frame ready');
                  }}
                  onComplete={async (payload: BuyFrameCompletePayload) => {
                    await handleTransactionComplete(payload.transaction);
                  }}
                  onChallenge={(url: string) => {
                    cancelQuoteRefresh();
                    logger.debug(
                      'MoonPay Cards challenge required, opening challenge frame',
                    );
                    dispatch(
                      Analytics.track('Buy Crypto Challenge Started', {
                        exchange: 'moonpay',
                        context: 'MoonpayBuyEmbeddedCheckout',
                        paymentMethod: paymentMethod?.method || '',
                        amount:
                          Number((offer as CryptoOffer)?.fiatAmount) || '',
                        coin:
                          cloneDeep(
                            wallet?.currencyAbbreviation,
                          )?.toLowerCase() || '',
                        chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
                        fiatCurrency: offer?.fiatCurrency || '',
                      }),
                    );
                    setChallengeUrl(url);
                  }}
                  onQuoteExpired={refreshQuote}
                  onError={(error: BuyFrameErrorPayload) => {
                    setCardPaymentStarted(false);
                    setCardPaymentButtonState(undefined);
                    cancelQuoteRefresh();
                    logger.error(
                      'MoonPay Buy frame error: [' +
                        error.code +
                        '] ' +
                        error.message,
                    );
                    showError(error, error.code, error.message);
                  }}
                />
              </>
            ) : (
              <>
                {cardPaymentMethodsFailed || cardQuoteFailed ? (
                  <DisclosureText>
                    {t('Something went wrong. Please try again later.')}
                  </DisclosureText>
                ) : null}
                <Button
                  onPress={() =>
                    cardPaymentMethod
                      ? startCardPayment()
                      : setShowAddCardModal(true)
                  }
                  disabled={
                    isLoading ||
                    paymentExpired ||
                    loadingCardPaymentMethod ||
                    (!!cardPaymentMethod && !cardQuoteSignature)
                  }
                  state={
                    cardPaymentMethod
                      ? cardPaymentButtonState ??
                        (!cardQuoteSignature && !cardQuoteFailed
                          ? 'loading'
                          : undefined)
                      : loadingCardPaymentMethod
                      ? 'loading'
                      : undefined
                  }
                  borderRadius={100}
                  height={50}>
                  {cardPaymentMethod
                    ? t('Pay with card ending in') +
                      ' ' +
                      cardPaymentMethod.last4
                    : t('Add a card to continue')}
                </Button>
                {cardPaymentMethods.length ? (
                  <TouchableOpacity
                    onPress={() =>
                      hasOtherSelectableCards || !cardPaymentMethod
                        ? setShowSelectCardModal(true)
                        : setShowAddCardModal(true)
                    }
                    style={{alignItems: 'center', marginTop: 12}}>
                    <LegalLink>
                      {!cardPaymentMethod
                        ? t('MoonPay linked cards')
                        : hasOtherSelectableCards
                        ? t('Select a different card')
                        : t('Use a different card')}
                    </LegalLink>
                  </TouchableOpacity>
                ) : null}
              </>
            )
          ) : !isLoading && !paymentExpired && initialQuoteSignature ? (
            <MoonPayApplePayFrame
              ref={applePayFrameRef}
              clientToken={credentials.clientToken}
              signature={initialQuoteSignature}
              externalTransactionId={externalTransactionIdRef.current}
              theme={theme.dark ? 'dark' : 'light'}
              onReady={() => {
                logger.debug('MoonPay Apple Pay frame ready');
              }}
              onComplete={async (payload: ApplePayCompletePayload) => {
                await handleTransactionComplete(payload.transaction);
              }}
              onChallenge={(url: string) => {
                cancelQuoteRefresh();
                logger.debug(
                  'MoonPay Apple Pay challenge required, opening challenge frame',
                );
                dispatch(
                  Analytics.track('Buy Crypto Challenge Started', {
                    exchange: 'moonpay',
                    context: 'MoonpayBuyEmbeddedCheckout',
                    paymentMethod: paymentMethod?.method || '',
                    amount: Number((offer as CryptoOffer)?.fiatAmount) || '',
                    coin:
                      cloneDeep(wallet?.currencyAbbreviation)?.toLowerCase() ||
                      '',
                    chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
                    fiatCurrency: offer?.fiatCurrency || '',
                  }),
                );
                setChallengeUrl(url);
              }}
              onQuoteExpired={refreshQuote}
              onCancelled={(code?: string) => {
                // The sheet was dismissed but the frame is still usable, so we
                // only record the abandonment and leave the screen as it is.
                logger.debug(
                  'MoonPay Apple Pay sheet dismissed by user' +
                    (code ? ': ' + code : ''),
                );
                dispatch(
                  Analytics.track('Failed Buy Crypto', {
                    exchange: 'moonpay',
                    context: 'MoonpayBuyEmbeddedCheckout',
                    reason: 'Apple Pay sheet dismissed by user',
                    paymentMethod: paymentMethod?.method || '',
                    amount: Number((offer as CryptoOffer)?.fiatAmount) || '',
                    coin:
                      cloneDeep(wallet?.currencyAbbreviation)?.toLowerCase() ||
                      '',
                    chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
                    fiatCurrency: offer?.fiatCurrency || '',
                  }),
                );
              }}
              onError={(error: ApplePayErrorPayload) => {
                cancelQuoteRefresh();
                logger.error(
                  'MoonPay Apple Pay frame error: [' +
                    error.code +
                    '] ' +
                    error.message,
                );
                showError(error, error.code, error.message);
              }}
            />
          ) : (
            <SpinnerContainer>
              <ActivityIndicator color={ProgressBlue} />
            </SpinnerContainer>
          )}
          <PoweredByContainer>
            <PoweredByText>{t('Powered by')}</PoweredByText>
            <MoonpayLogo
              iconOnly={true}
              widthIcon={13}
              heightIcon={13}
              fillColorIcon={theme.dark ? White : '#565656'}
            />
            <PoweredByPartner>MoonPay Rails</PoweredByPartner>
          </PoweredByContainer>
        </BottomSection>

        <Modal
          deviceHeight={HEIGHT}
          deviceWidth={WIDTH}
          backdropTransitionOutTiming={0}
          backdropOpacity={0.85}
          useNativeDriverForBackdrop={true}
          useNativeDriver={true}
          animationIn={'fadeInUp'}
          animationOut={'fadeOutDown'}
          isVisible={!!challengeUrl}
          onBackButtonPress={handleChallengeCancel}
          style={{
            margin: 0,
            padding: 0,
          }}>
          <WebViewModalContainer>
            <WebViewModalHeader topInset={insets.top}>
              <WebViewCloseButton onPress={handleChallengeCancel}>
                <WebViewCloseText>✕</WebViewCloseText>
              </WebViewCloseButton>
            </WebViewModalHeader>
            {challengeUrl ? (
              <MoonPayChallengeFrame
                challengeUrl={challengeUrl}
                clientToken={credentials.clientToken}
                theme={theme.dark ? 'dark' : 'light'}
                onReady={() => {
                  logger.debug('MoonPay challenge frame ready');
                }}
                onComplete={async (payload: ChallengeCompletePayload) => {
                  setChallengeUrl(null);
                  if (payload?.transaction) {
                    logger.debug(
                      'MoonPay challenge completed, transaction: ' +
                        JSON.stringify(payload.transaction),
                    );
                    dispatch(
                      Analytics.track('Buy Crypto Challenge Completed', {
                        exchange: 'moonpay',
                        context: 'MoonpayBuyEmbeddedCheckout',
                        paymentMethod: paymentMethod?.method || '',
                        amount:
                          Number((offer as CryptoOffer)?.fiatAmount) || '',
                        coin:
                          cloneDeep(
                            wallet?.currencyAbbreviation,
                          )?.toLowerCase() || '',
                        chain: cloneDeep(wallet?.chain)?.toLowerCase() || '',
                        fiatCurrency: offer?.fiatCurrency || '',
                        transactionId: payload.transaction.id,
                        transactionStatus: payload.transaction.status,
                      }),
                    );
                    await handleTransactionComplete(payload.transaction);
                  } else {
                    setCardPaymentStarted(false);
                    setCardPaymentButtonState(undefined);
                    logger.error(
                      'MoonPay challenge completed but no transaction data received',
                    );
                    showError(
                      t(
                        'Transaction completed but no transaction data received.',
                      ),
                      'Challenge completed without transaction data',
                    );
                  }
                }}
                onCancelled={handleChallengeCancel}
                onError={error => {
                  setChallengeUrl(null);
                  setCardPaymentStarted(false);
                  setCardPaymentButtonState(undefined);
                  cancelQuoteRefresh();
                  logger.error(
                    'MoonPay ' +
                      paymentMethod?.method +
                      ' Challenge frame error: [' +
                      error?.code +
                      '] ' +
                      error?.message,
                  );
                  showError(error, error?.code, error?.message);
                }}
              />
            ) : null}
          </WebViewModalContainer>
        </Modal>

        {/* Single shared modal for both the card selector and the add-card
            frame — two separate react-native-modal instances presented at
            once don't reliably stack on iOS, so this one just swaps content
            between the two states instead of stacking a second Modal. */}
        <Modal
          deviceHeight={HEIGHT}
          deviceWidth={WIDTH}
          backdropTransitionOutTiming={0}
          backdropOpacity={0.85}
          useNativeDriverForBackdrop={true}
          useNativeDriver={true}
          animationIn={'fadeInUp'}
          animationOut={'fadeOutDown'}
          isVisible={showAddCardModal || showSelectCardModal}
          onBackButtonPress={() => {
            if (showAddCardModal) {
              setShowAddCardModal(false);
            } else {
              setShowSelectCardModal(false);
            }
          }}
          onBackdropPress={() => {
            // Only the compact card-selector dismisses on backdrop tap — the
            // add-card frame fills the screen (no visible backdrop) and
            // shouldn't lose in-progress card entry from a stray tap.
            if (showSelectCardModal && !showAddCardModal) {
              setShowSelectCardModal(false);
            }
          }}
          style={{
            margin: 0,
            padding: 0,
            justifyContent: 'flex-end',
          }}>
          <Animated.View style={{height: cardModalHeightAnim, width: '100%'}}>
            <WebViewModalContainer>
              <WebViewModalHeader topInset={showAddCardModal ? insets.top : 0}>
                <WebViewCloseButton
                  onPress={() => {
                    if (showAddCardModal) {
                      setShowAddCardModal(false);
                    } else {
                      setShowSelectCardModal(false);
                    }
                  }}>
                  <WebViewCloseText>✕</WebViewCloseText>
                </WebViewCloseButton>
              </WebViewModalHeader>
              {showAddCardModal ? (
                <MoonPayAddCardFrame
                  clientToken={credentials.clientToken}
                  theme={theme.dark ? 'dark' : 'light'}
                  onReady={() => {
                    logger.debug('MoonPay Add Card frame ready');
                  }}
                  onComplete={card => {
                    logger.debug('MoonPay card added: ' + card.id);
                    setShowAddCardModal(false);
                    setShowSelectCardModal(false);
                    setCardPaymentMethod(card);
                    setCardPaymentMethods(prev => [
                      ...prev.filter(c => c.id !== card.id),
                      card,
                    ]);
                  }}
                  onError={(error: AddCardErrorPayload) => {
                    setShowAddCardModal(false);
                    setShowSelectCardModal(false);
                    logger.error(
                      'MoonPay Add Card frame error: [' +
                        error.code +
                        '] ' +
                        error.message,
                    );
                    showError(error, error.code, error.message);
                  }}
                />
              ) : showSelectCardModal ? (
                <MoonpaySelectCardModal
                  cards={cardPaymentMethods}
                  selectedCardId={cardPaymentMethod?.id}
                  onSelectCard={card => {
                    setShowSelectCardModal(false);
                    setCardPaymentMethod(card);
                  }}
                  onAddCard={() => setShowAddCardModal(true)}
                />
              ) : null}
            </WebViewModalContainer>
          </Animated.View>
        </Modal>
      </MoonpayEmbeddedCheckoutContainer>
    </View>
  );
};

export default MoonpayBuyEmbeddedCheckout;
