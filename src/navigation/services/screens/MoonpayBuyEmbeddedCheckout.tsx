import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, View, StyleSheet} from 'react-native';
import Modal from 'react-native-modal';
import {
  useTheme,
  RouteProp,
  useRoute,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import styled from 'styled-components/native';
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
  getMoonpayFixedCurrencyAbbreviation,
  getMoonpayPaymentMethodFormat,
  moonpayEnv,
} from '../buy-crypto/utils/moonpay-utils';
import {
  MoonpayGetQuoteEmbeddedRequestData,
  MoonpayPaymentData,
  MoonpayPaymentType,
  MoonpayQuoteEmbeddedData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {moonpayGetQuoteEmbedded} from '../../../store/buy-crypto/effects/moonpay/moonpay';
import {
  MoonPayApplePayFrame,
  ApplePayCompletePayload,
  ApplePayErrorPayload,
  ApplePayFrameRef,
} from '../components/MoonPayApplePayFrame';
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

// Styled
export const MoonpayEmbeddedCheckoutContainer = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

const RowLabel = styled(BaseText)`
  font-size: 13px;
`;

const RowData = styled(BaseText)`
  font-size: 13px;
`;

const HeaderContainer = styled.View`
  align-items: center;
  margin-bottom: 24px;
`;

const IconRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled(BaseText)`
  font-size: 39px;
  font-weight: 700;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 10px;
`;

const Subtitle = styled(BaseText)`
  font-size: 13px;
  line-height: 22px;
  font-weight: 400;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const TotalContainer = styled.View`
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
`;

const CryptoTotalText = styled(BaseText)`
  font-size: 13px;
  font-weight: 700;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 12px;
`;

const FiatTotalText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

export const RowDataContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
`;

const BottomSection = styled.View`
  padding-top: 16px;
`;

const LegalText = styled(BaseText)`
  font-size: 13px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-bottom: 16px;
  line-height: 20px;
`;

const LegalLink = styled.Text`
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
`;

const DisclosureText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-bottom: 12px;
  line-height: 18px;
`;

const PoweredByContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
`;

const PoweredByText = styled(BaseText)`
  font-size: 11px;
  margin-right: 4px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const PoweredByPartner = styled(BaseText)`
  font-size: 11px;
  font-weight: 700;
  color: ${({theme: {dark}}) => (dark ? White : '#565656')};
`;

const WebViewModalContainer = styled.View`
  flex: 1;
  justify-content: center;
  overflow: scroll;
`;

const WebViewModalHeader = styled.View<{topInset: number}>`
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  margin-top: ${({topInset}) => topInset}px;
  height: 50px;
  background-color: ${({theme: {dark}}) => (dark ? '#1a1a1a' : '#f8f8f8')};
  justify-content: center;
  align-items: flex-start;
  padding-horizontal: 15px;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? '#333' : '#ddd')};
`;

const WebViewCloseButton = styled(TouchableOpacity)`
  padding: 10px;
`;

const WebViewCloseText = styled(BaseText)`
  font-size: 24px;
  color: ${({theme: {dark}}) => (dark ? '#ccc' : '#333')};
`;

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
        // setQuoteSignature(newQuoteData.signature);
        applePayFrameRef.current?.updateQuote(newQuoteData.signature);
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
        offer.fiatCurrency,
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

    const externalTransactionId = `${wallet.id}-${Date.now()}`;
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
      external_id: externalTransactionId,
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
        externalId: externalTransactionId,
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
              {t('MoonPay using')} {paymentMethod?.label || 'Apple Pay'}
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
                {!!remainingTimeStr && (
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
          {!isLoading && !paymentExpired && initialQuoteSignature ? (
            <MoonPayApplePayFrame
              ref={applePayFrameRef}
              clientToken={credentials.clientToken}
              signature={initialQuoteSignature}
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
                  cancelQuoteRefresh();
                  logger.error(
                    'MoonPay Apple Pay Challenge frame error: [' +
                      error.code +
                      '] ' +
                      error.message,
                  );
                  showError(error, error.code, error.message);
                }}
              />
            ) : null}
          </WebViewModalContainer>
        </Modal>
      </MoonpayEmbeddedCheckoutContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
});

export default MoonpayBuyEmbeddedCheckout;
