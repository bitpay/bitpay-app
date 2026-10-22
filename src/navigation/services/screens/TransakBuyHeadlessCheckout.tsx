import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewProps,
} from 'react-native';
import Modal from 'react-native-modal';
import WebView from 'react-native-webview';
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import cloneDeep from 'lodash.clonedeep';
import {TransakCard, TransakCardRef} from '@transak/ui-components-rn';
import {useTheme, usePaymentSent} from '../../../contexts';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {
  Black,
  Caution,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import Checkbox from '../../../components/checkbox/Checkbox';
import Button, {ButtonState} from '../../../components/button/Button';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {HEIGHT, WIDTH} from '../../../components/styled/Containers';
import TransakLogo from '../../../components/icons/external-services/transak/transak-logo';
import {
  formatFiatAmount,
  getBadgeImg,
  getCurrencyAbbreviation,
  getErrorString,
  sleep,
} from '../../../utils/helper-methods';
import {
  ItemDivisor,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
} from '../swap-crypto/styled/SwapCryptoCheckout.styled';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {BuyCryptoActions} from '../../../store/buy-crypto';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  TransakHeadlessGetQuoteRequestData,
  TransakHeadlessOrderData,
  TransakHeadlessQuoteData,
  TransakHeadlessSavedCard,
  TransakHeadlessUserAuthData,
  TransakPaymentData,
  TransakStatusKey,
} from '../../../store/buy-crypto/buy-crypto.models';
import {
  isTransakHeadlessUnauthorized,
  TransakHeadlessError,
  transakHeadlessCreateCardSession,
  transakHeadlessCreateOrder,
  transakHeadlessGetOrderDetails,
  transakHeadlessGetQuote,
  TransakHeadlessPreparation,
} from '../../../store/buy-crypto/effects/transak/transak-headless';
import {
  getTransakHeadlessRedirectResult,
  getTransakHeadlessRedirectUrls,
  transakEnv,
  transakHeadlessEnvironment,
} from '../buy-crypto/utils/transak-utils';
import {PaymentMethod} from '../buy-crypto/constants/BuyCryptoConstants';
import {CryptoOffer} from '../components/externalServicesOfferSelector';
import {TransakSettingsProps} from '../../tabs/settings/external-services/screens/TransakSettings';
import {ExternalServicesSettingsScreens} from '../../tabs/settings/external-services/ExternalServicesGroup';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {APP_DEEPLINK_PREFIX} from '../../../constants/config';

// Transak refreshes quotes every minute; anything older is re-fetched before
// it is used to create a card session or a saved-card order.
const QUOTE_MAX_AGE_MS = 30 * 1000;
// Same as the SDK's own iframe timeout on web, which the RN component lacks.
const CARD_FORM_LOAD_TIMEOUT_MS = 30 * 1000;
const CARD_FORM_HEIGHT = 340;
// The order may come back without the 3DS URL yet.
const ORDER_POLL_INTERVAL_MS = 2000;
const ORDER_POLL_ATTEMPTS = 10;

const FINAL_FAILED_STATUSES: TransakStatusKey[] = [
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
];

const styles = StyleSheet.create({
  root: {flex: 1},
  container: {
    flex: 1,
    margin: 14,
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
  rowText: {
    fontSize: 13,
  },
  rowDataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardOptionText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  cardForm: {
    height: CARD_FORM_HEIGHT,
    marginTop: 8,
  },
  cardFormLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardError: {
    fontSize: 12,
    color: Caution,
    marginTop: 6,
  },
  bottomSection: {
    paddingTop: 16,
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  poweredByText: {
    fontSize: 11,
    marginRight: 4,
  },
  webViewModalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  webViewModalHeader: {
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

const ThemedText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText> & {secondary?: boolean}
>(({style, secondary, ...rest}, ref) => {
  const theme = useTheme();
  const color = secondary
    ? theme.dark
      ? Slate30
      : SlateDark
    : theme.dark
    ? White
    : Black;
  return <BaseText ref={ref} style={[{color}, style]} {...rest} />;
});
ThemedText.displayName = 'ThemedText';

const RowDataContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.rowDataContainer, style]} {...rest} />
);

export interface TransakBuyHeadlessCheckoutProps {
  wallet: Wallet;
  toAddress: string;
  offer: CryptoOffer;
  paymentMethod: PaymentMethod;
  userAuth: TransakHeadlessUserAuthData;
  transakExternalId: string;
  quoteRequestData: TransakHeadlessGetQuoteRequestData;
  preparation: Extract<TransakHeadlessPreparation, {status: 'ready'}>;
  // Leaves this screen and continues with the Transak widget.
  onFallback: (reason: string) => void;
}

const isSavedCardExpired = (card: TransakHeadlessSavedCard): boolean => {
  if (!card.expiryMonth || !card.expiryYear) {
    return false;
  }
  const now = new Date();
  const year = card.expiryYear < 100 ? 2000 + card.expiryYear : card.expiryYear;
  return (
    year < now.getFullYear() ||
    (year === now.getFullYear() && card.expiryMonth < now.getMonth() + 1)
  );
};

const getSavedCardLabel = (card: TransakHeadlessSavedCard): string =>
  `${card.scheme ? card.scheme.toUpperCase() : 'CARD'} •••• ${card.last4}`;

const getOrderRedirectUrl = (
  order: TransakHeadlessOrderData | undefined,
): string | undefined =>
  order?.paymentDetails?.find(detail => !!detail?.redirectUrl)?.redirectUrl;

const TransakBuyHeadlessCheckout: React.FC = () => {
  const {
    params: {
      wallet,
      toAddress,
      offer,
      paymentMethod,
      userAuth,
      transakExternalId,
      quoteRequestData,
      preparation,
      onFallback,
    },
  } = useRoute<RouteProp<{params: TransakBuyHeadlessCheckoutProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {showPaymentSent, hidePaymentSent} = usePaymentSent();

  const coin = cloneDeep(wallet.currencyAbbreviation).toLowerCase();
  const usableSavedCards = preparation.savedCards.filter(
    card => !isSavedCardExpired(card),
  );
  const {successUrl, failureUrl} =
    getTransakHeadlessRedirectUrls(transakExternalId);

  const [quote, setQuote] = useState<TransakHeadlessQuoteData>(
    preparation.quote,
  );
  const quoteFetchedAtRef = useRef<number>(preparation.quoteFetchedAt);
  const [selectedCardId, setSelectedCardId] = useState<string>(
    usableSavedCards[0]?.paymentIdentifierId ?? 'new',
  );
  const [cardSessionId, setCardSessionId] = useState<string>();
  const [cardFormReady, setCardFormReady] = useState(false);
  const [cardValid, setCardValid] = useState(false);
  const [cardStateError, setCardStateError] = useState<string>();
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [redirectUrl, setRedirectUrl] = useState<string>();

  const cardRef = useRef<TransakCardRef>(null);
  const creatingSessionRef = useRef(false);
  const sessionRetriedRef = useRef(false);
  const submittingCardRef = useRef(false);
  const orderRef = useRef<TransakHeadlessOrderData | undefined>(undefined);
  const finalizingRef = useRef(false);
  const mountedRef = useRef(true);

  const isNewCard = selectedCardId === 'new';

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const forgetUserSession = () => {
    dispatch(
      BuyCryptoActions.updateHeadlessUserAuthTransak({
        env: transakEnv,
        userAuth: undefined,
      }),
    );
  };

  const showError = async ({
    err,
    reason,
    title,
    allowFallback,
  }: {
    err?: unknown;
    reason: string;
    title?: string;
    allowFallback: boolean;
  }) => {
    const errMsg = err === undefined ? '' : getErrorString(err);
    logger.error(`[TransakHeadlessCheckout] ${reason}: ${errMsg}`);
    if (isTransakHeadlessUnauthorized(err)) {
      forgetUserSession();
    }
    setButtonState(undefined);
    submittingCardRef.current = false;

    dispatch(
      Analytics.track('Failed Buy Crypto', {
        exchange: 'transak',
        context: 'TransakBuyHeadlessCheckout',
        reason: errMsg ? `[${reason}]: ${errMsg}` : reason,
        paymentMethod: paymentMethod?.method || '',
        amount: Number(offer.fiatAmount) || '',
        coin,
        chain: wallet.chain?.toLowerCase() || '',
        fiatCurrency: offer.fiatCurrency || '',
        isHeadless: true,
      }),
    );

    await sleep(700);
    if (!mountedRef.current) {
      return;
    }
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ?? t('Error'),
        message: allowFallback
          ? t(
              'We could not complete your purchase in the app. You can continue on Transak instead.',
            )
          : t('Your card payment was not completed.'),
        enableBackdropDismiss: false,
        actions: [
          ...(allowFallback
            ? [
                {
                  text: t('Continue on Transak'),
                  action: () => {
                    dispatch(dismissBottomNotificationModal());
                    onFallback(reason);
                  },
                  primary: true,
                },
              ]
            : []),
          {
            text: allowFallback ? t('Cancel') : t('OK'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(500);
              navigation.goBack();
            },
            primary: !allowFallback,
          },
        ],
      }),
    );
  };

  const getFreshQuote = async (): Promise<TransakHeadlessQuoteData> => {
    if (Date.now() - quoteFetchedAtRef.current < QUOTE_MAX_AGE_MS) {
      return quote;
    }
    const newQuote = await transakHeadlessGetQuote(wallet, quoteRequestData);
    if (!newQuote?.quoteId) {
      throw new Error('No quoteId returned');
    }
    quoteFetchedAtRef.current = Date.now();
    if (mountedRef.current) {
      setQuote(newQuote);
    }
    return newQuote;
  };

  const createCardSession = async () => {
    if (creatingSessionRef.current) {
      return;
    }
    creatingSessionRef.current = true;
    setCardSessionId(undefined);
    setCardFormReady(false);
    setCardValid(false);
    setCardStateError(undefined);
    try {
      const freshQuote = await getFreshQuote();
      const session = await transakHeadlessCreateCardSession(wallet, {
        env: transakEnv,
        userAccessToken: userAuth.accessToken,
        quoteId: freshQuote.quoteId,
        walletAddress: toAddress,
        successUrl,
        failureUrl,
        config: {colorMode: theme.dark ? 'DARK' : 'LIGHT'},
      });
      if (!session?.sessionId) {
        throw new Error('No sessionId returned');
      }
      if (mountedRef.current) {
        setCardSessionId(session.sessionId);
      }
    } catch (err) {
      showError({err, reason: 'createCardSession', allowFallback: true});
    } finally {
      creatingSessionRef.current = false;
    }
  };

  // Only when the new card option gets selected: a failed session is not
  // retried on its own, the customer is offered the widget instead.
  useEffect(() => {
    if (isNewCard && !cardSessionId) {
      createCardSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewCard]);

  useEffect(() => {
    if (!cardSessionId || cardFormReady) {
      return;
    }
    const timeout = setTimeout(() => {
      showError({
        reason: 'card form load timeout',
        allowFallback: true,
      });
    }, CARD_FORM_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardSessionId, cardFormReady]);

  const recordOrder = (order: TransakHeadlessOrderData) => {
    const fiatTotalAmount = order.fiatAmount ?? quote.fiatAmount;
    const fee = order.totalFeeInFiat ?? quote.totalFee;
    const newData: TransakPaymentData = {
      address: toAddress,
      chain: wallet.chain,
      created_on: Date.now(),
      crypto_amount: order.cryptoAmount ?? quote.cryptoAmount,
      coin: coin.toUpperCase(),
      env: __DEV__ ? 'dev' : 'prod',
      fiat_base_amount: fiatTotalAmount - fee,
      fiat_total_amount: fiatTotalAmount,
      fiat_total_amount_currency: offer.fiatCurrency,
      external_id: transakExternalId,
      status: order.status ?? 'AWAITING_PAYMENT_FROM_USER',
      user_id: wallet.id,
      order_id: order.orderId,
      payment_method: paymentMethod?.method,
      is_headless: true,
    };
    dispatch(
      BuyCryptoActions.successPaymentRequestTransak({
        transakPaymentData: newData,
      }),
    );
  };

  const goToTransakSettings = (status?: string) => {
    const transakSettingsParams: TransakSettingsProps = {
      incomingPaymentRequest: {
        transakExternalId,
        walletId: wallet.id,
        status,
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
            name: ExternalServicesSettingsScreens.TRANSAK_SETTINGS,
            params: transakSettingsParams,
          },
        ],
      }),
    );
  };

  const finalize = async (
    result: 'success' | 'failure' | 'cancelled' | 'unconfirmed',
  ) => {
    const order = orderRef.current;
    if (finalizingRef.current || !order) {
      return;
    }
    finalizingRef.current = true;
    setRedirectUrl(undefined);
    logger.debug(
      `[TransakHeadlessCheckout] order ${order.orderId} finished: ${result}`,
    );

    let status = order.status;
    try {
      const details = await transakHeadlessGetOrderDetails(wallet, {
        env: transakEnv,
        userAccessToken: userAuth.accessToken,
        orderId: order.orderId,
      });
      status = details?.status ?? status;
    } catch (err) {
      logger.warn(
        `[TransakHeadlessCheckout] could not refresh order ${
          order.orderId
        }: ${getErrorString(err)}`,
      );
    }

    dispatch(
      BuyCryptoActions.updatePaymentRequestTransak({
        transakIncomingData: {
          transakExternalId,
          status,
          order_id: order.orderId,
        },
      }),
    );

    if (result === 'unconfirmed') {
      goToTransakSettings(status);
      return;
    }

    // Closing the 3DS page after paying, but before Transak redirected, still
    // leaves a paid order behind.
    const paid =
      !FINAL_FAILED_STATUSES.includes(status) &&
      (result === 'success' ||
        (result === 'cancelled' && status !== 'AWAITING_PAYMENT_FROM_USER'));

    if (paid) {
      const cryptoAmount = order.cryptoAmount ?? quote.cryptoAmount;
      const fiatTotalAmount = order.fiatAmount ?? quote.fiatAmount;
      const fee = order.totalFeeInFiat ?? quote.totalFee;
      dispatch(
        Analytics.track('Purchased Buy Crypto', {
          exchange: 'transak',
          fiatAmount: fiatTotalAmount || '',
          feeAmount: fee || '',
          fiatCurrency: offer.fiatCurrency || '',
          coin,
          chain: wallet.chain?.toLowerCase() || '',
          cryptoAmount: cryptoAmount || '',
          paymentMethod: paymentMethod?.method || '',
          exchangeRate:
            (cryptoAmount && (fiatTotalAmount - fee) / cryptoAmount) || '',
          isHeadless: true,
        }),
      );
      showPaymentSent({
        onCloseModal: () => hidePaymentSent(),
        title: t('Transaction Submitted'),
      });
      await sleep(1200);
      goToTransakSettings(status);
      return;
    }

    showError({
      reason: `order ${result} (${status})`,
      title: t('Payment not completed'),
      allowFallback: false,
    });
  };

  const handleOrderCreated = async (order: TransakHeadlessOrderData) => {
    if (!order?.orderId) {
      throw new Error('No orderId returned');
    }
    orderRef.current = order;
    recordOrder(order);

    let url = getOrderRedirectUrl(order);
    let status = order.status;
    for (
      let attempt = 0;
      !url &&
      !FINAL_FAILED_STATUSES.includes(status) &&
      attempt < ORDER_POLL_ATTEMPTS;
      attempt++
    ) {
      await sleep(ORDER_POLL_INTERVAL_MS);
      if (!mountedRef.current) {
        return;
      }
      try {
        const details = await transakHeadlessGetOrderDetails(wallet, {
          env: transakEnv,
          userAccessToken: userAuth.accessToken,
          orderId: order.orderId,
        });
        orderRef.current = {...order, ...details};
        url = getOrderRedirectUrl(details);
        status = details?.status ?? status;
      } catch (err) {
        logger.warn(
          `[TransakHeadlessCheckout] order poll failed: ${getErrorString(err)}`,
        );
      }
    }

    if (url) {
      setRedirectUrl(url);
    } else {
      finalize(
        FINAL_FAILED_STATUSES.includes(status) ? 'failure' : 'unconfirmed',
      );
    }
  };

  const payWithSavedCard = async (card: TransakHeadlessSavedCard) => {
    setButtonState('loading');
    try {
      const freshQuote = await getFreshQuote();
      const order = await transakHeadlessCreateOrder(wallet, {
        env: transakEnv,
        userAccessToken: userAuth.accessToken,
        quoteId: freshQuote.quoteId,
        walletAddress: toAddress,
        paymentIdentifierId: card.paymentIdentifierId,
        successUrl,
        failureUrl,
      });
      await handleOrderCreated(order);
    } catch (err) {
      showError({
        err,
        reason: 'createOrder (saved card)',
        allowFallback: !orderRef.current,
      });
    }
  };

  const payWithNewCard = () => {
    if (!cardFormReady || !cardValid) {
      return;
    }
    setButtonState('loading');
    submittingCardRef.current = true;
    cardRef.current?.submit();
  };

  const onCardSuccess = async ({requestId}: {requestId: string}) => {
    if (!submittingCardRef.current) {
      return;
    }
    submittingCardRef.current = false;
    try {
      const order = await transakHeadlessCreateOrder(wallet, {
        env: transakEnv,
        userAccessToken: userAuth.accessToken,
        requestId,
      });
      await handleOrderCreated(order);
    } catch (err) {
      showError({
        err,
        reason: 'createOrder (new card)',
        allowFallback: !orderRef.current,
      });
    }
  };

  const onCardError = ({code}: {code: string}) => {
    // An expired or invalid session: one new session is worth a try before
    // giving up, since the customer has not paid anything yet.
    if (code === 'CONFIG_LOAD_FAILED' && !sessionRetriedRef.current) {
      sessionRetriedRef.current = true;
      logger.warn(
        '[TransakHeadlessCheckout] card form config failed, new session',
      );
      createCardSession();
      return;
    }
    showError({
      err: new TransakHeadlessError(code),
      reason: 'card form error',
      allowFallback: true,
    });
  };

  const onPressBuy = () => {
    if (isNewCard) {
      payWithNewCard();
      return;
    }
    const card = usableSavedCards.find(
      c => c.paymentIdentifierId === selectedCardId,
    );
    if (card) {
      payWithSavedCard(card);
    }
  };

  const handleRedirectNavigation = (url: string): boolean => {
    const result = getTransakHeadlessRedirectResult(url);
    if (result) {
      finalize(result);
      return false;
    }
    // Nothing on the 3DS page may take the customer out of the app.
    return !url.startsWith(APP_DEEPLINK_PREFIX);
  };

  const buyDisabled =
    !!buttonState ||
    (isNewCard ? !cardFormReady || !cardValid : !selectedCardId);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps={'handled'}
          automaticallyAdjustKeyboardInsets={true}>
          <View style={styles.headerContainer}>
            <View style={styles.iconRow}>
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
            </View>
            <ThemedText style={styles.title}>
              {formatFiatAmount(Number(quote.fiatAmount), offer.fiatCurrency)}
            </ThemedText>
            <ThemedText secondary style={styles.subtitle}>
              {quote.cryptoAmount} {coin.toUpperCase()}
            </ThemedText>
          </View>

          <RowDataContainer style={{paddingTop: 10, paddingBottom: 10}}>
            <ThemedText style={styles.rowText}>{t('Destination')}</ThemedText>
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
          <RowDataContainer>
            <ThemedText style={styles.rowText}>{t('Fees')}</ThemedText>
            <ThemedText style={styles.rowText}>
              {formatFiatAmount(Number(quote.totalFee), offer.fiatCurrency)}
            </ThemedText>
          </RowDataContainer>
          <ItemDivisor />
          <RowDataContainer>
            <ThemedText style={[styles.rowText, {fontWeight: '700'}]}>
              {t('Total')}
            </ThemedText>
            <ThemedText style={[styles.rowText, {fontWeight: '700'}]}>
              {formatFiatAmount(Number(quote.fiatAmount), offer.fiatCurrency)}
            </ThemedText>
          </RowDataContainer>
          <ItemDivisor />

          <ThemedText secondary style={styles.sectionLabel}>
            {t('Pay with')}
          </ThemedText>
          {usableSavedCards.length > 0 ? (
            <>
              {usableSavedCards.map(card => (
                <TouchableOpacity
                  key={card.paymentIdentifierId}
                  disabled={!!buttonState}
                  onPress={() => setSelectedCardId(card.paymentIdentifierId)}>
                  <View style={styles.cardOption}>
                    <Checkbox
                      radio={true}
                      disabled={!!buttonState}
                      checked={selectedCardId === card.paymentIdentifierId}
                      onPress={() =>
                        setSelectedCardId(card.paymentIdentifierId)
                      }
                    />
                    <ThemedText style={styles.cardOptionText}>
                      {getSavedCardLabel(card)}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                disabled={!!buttonState}
                onPress={() => setSelectedCardId('new')}>
                <View style={styles.cardOption}>
                  <Checkbox
                    radio={true}
                    disabled={!!buttonState}
                    checked={isNewCard}
                    onPress={() => setSelectedCardId('new')}
                  />
                  <ThemedText style={styles.cardOptionText}>
                    {t('Use a new card')}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </>
          ) : null}

          {isNewCard ? (
            <View style={styles.cardForm}>
              {cardSessionId ? (
                <TransakCard
                  key={cardSessionId}
                  ref={cardRef}
                  sessionId={cardSessionId}
                  environment={transakHeadlessEnvironment}
                  onReady={() => setCardFormReady(true)}
                  onChange={({isValid, errorCode}) => {
                    setCardValid(isValid);
                    setCardStateError(
                      errorCode === 'BIN_BLOCKED'
                        ? t(
                            'This card is not supported. Please use a different card.',
                          )
                        : undefined,
                    );
                  }}
                  onSuccess={onCardSuccess}
                  onError={onCardError}
                />
              ) : null}
              {!cardFormReady ? (
                <View style={styles.cardFormLoading}>
                  <ActivityIndicator />
                </View>
              ) : null}
            </View>
          ) : null}
          {isNewCard && cardStateError ? (
            <Text style={styles.cardError}>{cardStateError}</Text>
          ) : null}
        </ScrollView>

        <View style={styles.bottomSection}>
          <Button
            onPress={onPressBuy}
            disabled={buyDisabled}
            state={buttonState}
            borderRadius={100}
            height={50}>
            {t('Buy')}
          </Button>
          <View style={styles.poweredByContainer}>
            <ThemedText secondary style={styles.poweredByText}>
              {t('Powered by')}
            </ThemedText>
            <TransakLogo width={64} height={16} />
          </View>
        </View>
      </SafeAreaView>

      <Modal
        deviceHeight={HEIGHT}
        deviceWidth={WIDTH}
        backdropTransitionOutTiming={0}
        backdropOpacity={0.85}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        isVisible={!!redirectUrl}
        onBackButtonPress={() => finalize('cancelled')}
        style={{margin: 0, padding: 0}}>
        <View style={styles.webViewModalContainer}>
          <View
            style={[
              styles.webViewModalHeader,
              {
                marginTop: insets.top,
                backgroundColor: theme.dark ? '#1a1a1a' : '#f8f8f8',
                borderBottomColor: theme.dark ? '#333' : '#ddd',
              },
            ]}>
            <TouchableOpacity
              style={styles.webViewCloseButton}
              onPress={() => finalize('cancelled')}>
              <ThemedText style={styles.webViewCloseText}>✕</ThemedText>
            </TouchableOpacity>
          </View>
          {redirectUrl ? (
            <WebView
              source={{uri: redirectUrl}}
              style={{paddingBottom: insets.bottom}}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={event =>
                handleRedirectNavigation(event.url)
              }
              // Android does not always ask before following a redirect.
              onNavigationStateChange={event => {
                if (getTransakHeadlessRedirectResult(event.url)) {
                  handleRedirectNavigation(event.url);
                }
              }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

export default TransakBuyHeadlessCheckout;
