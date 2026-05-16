import React, {useLayoutEffect, useRef, useState} from 'react';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import Button, {ButtonState} from '../../../components/button/Button';
import {BaseText} from '../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LinkBlue,
  NeutralSlate,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {AppEffects} from '../../../store/app';
import WebView, {
  WebViewMessageEvent,
  WebViewNavigation,
} from 'react-native-webview';
import Modal from 'react-native-modal';
import {HEIGHT, WIDTH} from '../../../components/styled/Containers';
import {IS_ANDROID} from '../../../constants';
import {useTheme} from 'styled-components/native';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  decryptClientCredentials,
  generateChannelId,
  generateKeyPair,
  MoonpayClientCredentials,
  MoonpayKeyPair,
} from '../utils/moonpayFrameCrypto';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import {APP_DEEPLINK_PREFIX} from '../../../constants/config';
import {Linking, ScrollView} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ExternalServicesGroupParamList,
  ExternalServicesScreens,
} from '../ExternalServicesGroup';
import MoonpayConnectImage from '../../../components/icons/external-services/moonpay/moonpay-connect';
import MoonpayConnectIcon from '../../../components/icons/external-services/moonpay/moonpay-connect-icons';

const MOONPAY_TERMS_URL = 'https://www.moonpay.com/legal/terms_of_use_usa';
const MOONPAY_PRIVACY_URL = 'https://www.moonpay.com/legal/privacy_policy';

const Container = styled.SafeAreaView`
  flex: 1;
  margin: 14px;
`;

const HeaderContainer = styled.View`
  align-items: left;
  margin-bottom: 32px;
`;

const IconRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled(BaseText)`
  font-size: 31px;
  font-weight: 700;
  text-align: left;
  line-height: 38px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 12px;
`;

const Subtitle = styled(BaseText)`
  font-size: 16px;
  line-height: 22px;
  font-weight: 400;
  text-align: left;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const FeaturesCard = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 24px;
`;

const FeatureRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 10px 0;
`;

const FeatureIcon = styled.View`
  margin-right: 6px;
  width: 28px;
  align-items: center;
  justify-content: center;
`;

const FeatureText = styled(BaseText)`
  font-size: 13px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  flex: 1;
`;

const BottomSection = styled.View`
  padding: 16px;
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

export interface MoonpayBuyEmbeddedOnboardingProps {
  route?: any;
  user: User | undefined;
  anonymousCredentials: MoonpayClientCredentials;
  onConnectAccount: (newCredentials: MoonpayClientCredentials) => void;
  onSkipConnection: () => void;
}

const MoonpayBuyEmbeddedOnboarding = ({
  route,
}: NativeStackScreenProps<
  ExternalServicesGroupParamList,
  ExternalServicesScreens.MOONPAY_BUY_EMBEDDED_ONBOARDING
>) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const anonymousCredentials = route.params?.anonymousCredentials;
  const onConnectAccount = route.params?.onConnectAccount;
  const onSkipConnection = route.params?.onSkipConnection;

  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>();

  const connectWebViewRef = useRef<WebView>(null);

  const [moonpayConnectSession, setMoonpayConnectSession] = useState<
    | {
        keyPair: MoonpayKeyPair;
        channelId: string;
      }
    | undefined
  >();

  const [connectModalWebView, setConnectModalWebView] = useState<{
    open: boolean;
    url: string | undefined;
  }>({open: false, url: undefined});

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
    });
  }, [navigation]);

  const initConnection = async () => {
    try {
      logger.debug(`Moonpay initConnection: opening connect frame`);

      // Generate a fresh ephemeral keypair and channelId for the connect frame
      const connectKeyPair = generateKeyPair();
      const connectChannelId = generateChannelId();
      setMoonpayConnectSession({
        keyPair: connectKeyPair,
        channelId: connectChannelId,
      });

      const connectParams = new URLSearchParams({
        clientToken: anonymousCredentials.clientToken,
        publicKey: connectKeyPair.publicKeyHex,
        channelId: connectChannelId,
        theme: theme.dark ? 'dark' : 'light',
      });
      const connectUrl = `https://blocks.moonpay.com/platform/v1/connect?${connectParams.toString()}`;

      setConnectModalWebView(current => ({
        open: true,
        url: connectUrl,
      }));
    } catch (err) {
      logger.error(
        `[MoonpayConnectFrame] initConnection failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      setConnectModalWebView({open: false, url: undefined});
      setOpeningBrowser(false);
      setButtonState(undefined);
    }
  };

  const skipConnection = () => {
    onSkipConnection ? onSkipConnection() : null;
  };

  const openUrl = (url: string) => {
    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  const handleMoonpayConnectionMessage = async (event: WebViewMessageEvent) => {
    const rawData = event?.nativeEvent?.data;
    if (!rawData || typeof rawData !== 'string') {
      return;
    }

    let message: any;
    try {
      message = JSON.parse(rawData);
    } catch {
      return;
    }

    if (!message?.meta?.channelId || !message?.kind) {
      return;
    }

    // Validate frames protocol v2 envelope
    if (message?.version !== 2) {
      logger.warn(
        `[MoonpayConnectFrame] possible invalid message format - missing or unsupported version: ${message?.version}`,
      );
    }

    // Ignore messages from a different channel
    if (
      moonpayConnectSession &&
      message.meta.channelId !== moonpayConnectSession.channelId
    ) {
      return;
    }

    const {kind, payload} = message;

    switch (kind) {
      case 'handshake': {
        // The frame requests a bi-directional channel — reply with ack
        const ack = JSON.stringify({
          version: 2,
          meta: {channelId: message.meta.channelId},
          kind: 'ack',
        });
        connectWebViewRef.current?.postMessage(ack);
        break;
      }

      case 'complete': {
        const {
          status,
          credentials,
          reason,
        }: {status?: string; credentials?: string; reason?: string} =
          payload ?? {};

        switch (status) {
          case 'active': {
            // An active status means the connection is valid and can be used. Active connections typically remain live for 180 days without revalidation. If the connection expires, refresh it via the connect flow.
            if (!credentials || !moonpayConnectSession?.keyPair.privateKeyHex) {
              logger.error(
                `[MoonpayConnectFrame]: missing credentials or private key`,
              );
              setConnectModalWebView({open: false, url: undefined});
              setOpeningBrowser(false);
              setButtonState(undefined);
              break;
            }
            try {
              const decrypted: MoonpayClientCredentials =
                decryptClientCredentials(
                  credentials,
                  moonpayConnectSession.keyPair.privateKeyHex,
                );
              logger.debug(
                `[MoonpayConnectFrame] complete: status=active, has accessToken=${!!decrypted.accessToken}`,
              );

              setConnectModalWebView(current => ({
                open: false,
                url: undefined,
              }));

              onConnectAccount ? onConnectAccount(decrypted) : null;
            } catch (err) {
              logger.error(
                `[MoonpayConnectFrame]: decryption failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
              setConnectModalWebView({open: false, url: undefined});
              setOpeningBrowser(false);
              setButtonState(undefined);
            }
            break;
          }

          case 'pending': {
            // A pending status typically occurs for customers whose KYC decisions are delayed. Often these cases are resolved out of band and the customer can connect on a subsequent visit to the app.
            // TODO: show pending state UI
            setConnectModalWebView({open: false, url: undefined});
            setOpeningBrowser(false);
            setButtonState(undefined);
            break;
          }

          case 'unavailable': {
            // An unavailable status means the connection cannot be used at the current time. This typically occurs when a KYC-verified customer is using a device or application from a restricted location.
            setConnectModalWebView({open: false, url: undefined});
            setOpeningBrowser(false);
            setButtonState(undefined);
            break;
          }

          case 'failed': {
            // A failed status is a terminal state. This usually happens if the customer fails KYC or cannot be onboarded to MoonPay. It can also happen if the customer rejects the connection. In these cases, direct the customer to an alternate flow in the app.
            // TODO: for failed status we should get the user to the kayak model
            logger.error(
              `[MoonpayConnectFrame] failed: ${reason ?? 'Unknown reason'}`,
            );
            setConnectModalWebView({open: false, url: undefined});
            setOpeningBrowser(false);
            setButtonState(undefined);
            break;
          }
        }
        break;
      }

      case 'error': {
        const {code, message: errMessage} = payload ?? {};
        logger.error(`[MoonpayConnectFrame] error: ${code} - ${errMessage}`);
        setConnectModalWebView({open: false, url: undefined});
        setOpeningBrowser(false);
        setButtonState(undefined);
        break;
      }
    }
  };

  const handleMoonpayBuyNavigation = (event: WebViewNavigation): boolean => {
    const {url} = event;
    if (url.startsWith(APP_DEEPLINK_PREFIX)) {
      setConnectModalWebView({open: false, url: undefined});
      Linking.openURL(url);
      navigation.goBack();
      return false;
    }
    return true;
  };

  return (
    <Container>
      <ScrollView>
        <HeaderContainer>
          <IconRow>
            <MoonpayConnectImage width={120} height={70} />
          </IconRow>

          <Title>{t('Connect a MoonPay account')}</Title>
          <Subtitle>
            {t(
              'BitPay partners with MoonPay so you can use your saved payment methods and verified identity at MoonPay. No need to re-enter your details each time.',
            )}
          </Subtitle>
        </HeaderContainer>

        <FeaturesCard>
          <FeatureRow>
            <FeatureIcon>
              <MoonpayConnectIcon icon="wallet" />
            </FeatureIcon>
            <FeatureText>{t('Secure card & bank payments')}</FeatureText>
          </FeatureRow>
          <FeatureRow>
            <FeatureIcon>
              <MoonpayConnectIcon icon="verified" />
            </FeatureIcon>
            <FeatureText>{t('Verified identity where required')}</FeatureText>
          </FeatureRow>
          <FeatureRow>
            <FeatureIcon>
              <MoonpayConnectIcon icon="favorite" />
            </FeatureIcon>
            <FeatureText>{t('Global support & fast checkout')}</FeatureText>
          </FeatureRow>
        </FeaturesCard>
      </ScrollView>

      <BottomSection>
        <LegalText>
          {t('By creating an account, you agree to')}{' '}
          <LegalLink onPress={() => openUrl(MOONPAY_TERMS_URL)}>
            {t("MoonPay's Terms of Use")}
          </LegalLink>{' '}
          {t('and')}{' '}
          <LegalLink onPress={() => openUrl(MOONPAY_PRIVACY_URL)}>
            {t('Privacy Policy')}
          </LegalLink>
          {'.'}
        </LegalText>

        <Button
          onPress={initConnection}
          disabled={openingBrowser}
          state={buttonState}
          borderRadius={100}
          style={{borderRadius: 100, marginBottom: 12}}
          backgroundColor={'#7D00FF'}
          height={50}>
          {t('Connect a MoonPay Account')}
        </Button>
        <Button
          onPress={skipConnection}
          disabled={openingBrowser}
          buttonStyle={'secondary'}
          borderRadius={100}
          height={50}
          backgroundColor={'#7D00FF'}>
          {t('Skip')}
        </Button>
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
        isVisible={connectModalWebView.open}
        style={{
          margin: 0,
          padding: 0,
        }}>
        <WebViewModalContainer>
          <WebViewModalHeader topInset={insets.top}>
            <WebViewCloseButton
              onPress={() => {
                setConnectModalWebView({open: false, url: undefined});
                setOpeningBrowser(false);
                setButtonState(undefined);
              }}>
              <WebViewCloseText>✕</WebViewCloseText>
            </WebViewCloseButton>
          </WebViewModalHeader>
          <WebView
            // Re-mount the WebView when the URL changes (e.g. check → connect → apple-pay
            // frames), so each frame starts with a clean state and no shared history/cache.
            key={connectModalWebView.url}
            ref={connectWebViewRef}
            style={{
              paddingBottom: insets.bottom,
            }}
            source={{uri: connectModalWebView.url ?? ''}}
            scrollEnabled={true}
            onShouldStartLoadWithRequest={event => {
              // On iOS, window.open() triggers a navigation with
              // navigationType === 'other'. Allow those navigations to load
              // inside the same WebView instead of being blocked, so that
              // MoonPay can open popups / new pages it needs (e.g. 3DS, oauth).
              // We only do this when the URL is different from the current one
              // to avoid re-loading the frame itself.
              if (
                event.navigationType === 'other' &&
                event.url !== connectModalWebView.url
              ) {
                return true;
              }
              // For all other navigations (deeplinks, redirects, etc.)
              // delegate to the existing handler which intercepts bitpay://
              // deeplinks and lets normal https navigations through.
              return handleMoonpayBuyNavigation(event);
            }}
            onMessage={(e: WebViewMessageEvent) => {
              handleMoonpayConnectionMessage(e);
            }}
            originWhitelist={['*']}
            automaticallyAdjustContentInsets
            allowsInlineMediaPlayback={true}
            // autoplay
            mediaPlaybackRequiresUserAction={false}
            // camera — iOS: grant automatically for the same host (accelerometer/gyroscope included)
            mediaCapturePermissionGrantType={'grantIfSameHostElsePrompt'}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={false}
            cacheMode={IS_ANDROID ? 'LOAD_NO_CACHE' : undefined}
            forceDarkOn={IS_ANDROID && theme.dark}
            injectedJavaScriptBeforeContentLoaded={`
                document.documentElement.style.colorScheme = '${
                  theme.dark ? 'dark' : 'light'
                }';
                true;
              `}
          />
        </WebViewModalContainer>
      </Modal>
    </Container>
  );
};

export default MoonpayBuyEmbeddedOnboarding;
