import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {TransakKyc, TransakKycRef} from '@transak/ui-components-rn';
import type {KycError, KycFlowState} from '@transak/ui-components-core';
import {useTheme} from '../../../contexts';
import {useAppDispatch, useLogger} from '../../../utils/hooks';
import {Black, Slate30, SlateDark, White} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import TransakLogo from '../../../components/icons/external-services/transak/transak-logo';
import {getErrorString, sleep} from '../../../utils/helper-methods';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {BuyCryptoActions} from '../../../store/buy-crypto';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  TransakHeadlessGetQuoteRequestData,
  TransakHeadlessUserAuthData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {
  getTransakHeadlessKycStatus,
  isTransakHeadlessKycApproved,
  isTransakHeadlessUnauthorized,
  transakHeadlessGetQuoteAndKyc,
  TransakHeadlessUnavailableError,
} from '../../../store/buy-crypto/effects/transak/transak-headless';
import {
  transakEnv,
  transakHeadlessEnvironment,
} from '../buy-crypto/utils/transak-utils';

const KYC_FORM_LOAD_TIMEOUT_MS = 30 * 1000;
// Transak does not document how long a review takes; the customer waits on
// this screen for up to two minutes.
const KYC_REVIEW_POLL_INTERVAL_MS = 5 * 1000;
const KYC_REVIEW_POLL_ATTEMPTS = 24;

// The module shows these on the form itself and lets the customer retry.
const RECOVERABLE_KYC_ERRORS = ['STEP_SUBMIT_FAILED', 'FILE_UPLOAD_FAILED'];

const styles = StyleSheet.create({
  root: {flex: 1},
  kycContainer: {
    flex: 1,
  },
  formLoading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  actionSpacer: {
    width: 12,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusIndicator: {
    marginTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomSection: {
    padding: 16,
  },
  reviewOkButton: {
    marginBottom: 12,
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

export interface TransakBuyHeadlessKycProps {
  wallet: Wallet;
  userAuth: TransakHeadlessUserAuthData;
  quoteRequestData: TransakHeadlessGetQuoteRequestData;
  sessionId: string;
  // Kept loading until it resolves, while the checkout is prepared.
  onApproved: () => Promise<void> | void;
  // Leaves this screen and continues with the Transak widget.
  onFallback: (reason: string) => void;
}

const TransakBuyHeadlessKyc: React.FC = () => {
  const {
    params: {
      wallet,
      userAuth,
      quoteRequestData,
      sessionId,
      onApproved,
      onFallback,
    },
  } = useRoute<RouteProp<{params: TransakBuyHeadlessKycProps}>>();
  const {t} = useTranslation();
  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const [step, setStep] = useState<'form' | 'verifying' | 'review'>('form');
  const [formReady, setFormReady] = useState(false);
  const [flowState, setFlowState] = useState<KycFlowState>();

  const kycRef = useRef<TransakKycRef>(null);
  const mountedRef = useRef(true);
  const submittedRef = useRef(false);
  const failedRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    dispatch(Analytics.track('Transak Headless KYC: started'));
  }, [dispatch]);

  const showFallbackError = async (reason: string, err?: unknown) => {
    if (failedRef.current) {
      return;
    }
    failedRef.current = true;
    const errMsg = err === undefined ? '' : `: ${getErrorString(err)}`;
    logger.error(`[TransakHeadlessKyc] ${reason}${errMsg}`);
    if (isTransakHeadlessUnauthorized(err)) {
      dispatch(
        BuyCryptoActions.updateHeadlessUserAuthTransak({
          env: transakEnv,
          userAuth: undefined,
        }),
      );
    }
    dispatch(Analytics.track('Transak Headless KYC: failed', {reason}));

    await sleep(700);
    if (!mountedRef.current) {
      return;
    }
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: t('Error'),
        message: t(
          'We could not complete your purchase in the app. You can continue on Transak instead.',
        ),
        enableBackdropDismiss: false,
        actions: [
          {
            text: t('Continue on Transak'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
              onFallback(reason);
            },
            primary: true,
          },
          {
            text: t('Cancel'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
              await sleep(500);
              navigation.goBack();
            },
          },
        ],
      }),
    );
  };

  useEffect(() => {
    if (formReady || step !== 'form') {
      return;
    }
    const timeout = setTimeout(() => {
      showFallbackError('kyc form load timeout');
    }, KYC_FORM_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formReady, step]);

  const showCameraPermissionInfo = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Camera permission disabled'),
        message: t(
          'Grant camera permission so Transak can verify your identity. Go to Settings and tap Allow Camera.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('Change Settings'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
              Linking.openSettings();
            },
            primary: true,
          },
          {
            text: t('Cancel'),
            action: () => dispatch(dismissBottomNotificationModal()),
          },
        ],
      }),
    );
  };

  const onKycError = ({code, message}: KycError) => {
    if (RECOVERABLE_KYC_ERRORS.includes(code)) {
      logger.warn(`[TransakHeadlessKyc] ${code}: ${message ?? '-'}`);
      return;
    }
    if (code === 'CAMERA_PERMISSION_DENIED') {
      showCameraPermissionInfo();
      return;
    }
    showFallbackError(
      `kyc form error (${code})`,
      message ? new Error(message) : undefined,
    );
  };

  // Submitted is not approved: Transak reviews the forms, and only the KYC
  // requirement tells when the order can be placed.
  const onKycSubmitted = async () => {
    if (submittedRef.current || failedRef.current) {
      return;
    }
    submittedRef.current = true;
    dispatch(Analytics.track('Transak Headless KYC: submitted'));
    setStep('verifying');

    let status: string | undefined;
    for (let attempt = 0; attempt < KYC_REVIEW_POLL_ATTEMPTS; attempt++) {
      await sleep(KYC_REVIEW_POLL_INTERVAL_MS);
      if (!mountedRef.current) {
        return;
      }
      try {
        const {kyc} = await transakHeadlessGetQuoteAndKyc(
          wallet,
          quoteRequestData,
          userAuth.accessToken,
        );
        if (isTransakHeadlessKycApproved(kyc)) {
          dispatch(Analytics.track('Transak Headless KYC: approved'));
          if (mountedRef.current) {
            await onApproved();
          }
          return;
        }
        status = getTransakHeadlessKycStatus(kyc);
        if (status !== 'SUBMITTED') {
          break;
        }
      } catch (err) {
        if (
          isTransakHeadlessUnauthorized(err) ||
          err instanceof TransakHeadlessUnavailableError
        ) {
          showFallbackError('kyc review check', err);
          return;
        }
        logger.warn(
          `[TransakHeadlessKyc] review check failed: ${getErrorString(err)}`,
        );
      }
    }

    if (!mountedRef.current) {
      return;
    }
    if (status === 'SUBMITTED') {
      dispatch(Analytics.track('Transak Headless KYC: in review'));
      setStep('review');
      return;
    }
    showFallbackError(`kyc ${status ?? 'unknown'} after submit`);
  };

  const onKycDismiss = () => {
    dispatch(Analytics.track('Transak Headless KYC: dismissed'));
    navigation.goBack();
  };

  if (step !== 'form') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.statusContainer}>
          <TransakLogo width={120} height={40} />
          {step === 'verifying' ? (
            <ActivityIndicator style={styles.statusIndicator} />
          ) : null}
          <ThemedText style={styles.title}>
            {step === 'verifying'
              ? t('Verifying your identity')
              : t('Verification in review')}
          </ThemedText>
          <ThemedText secondary style={styles.subtitle}>
            {step === 'verifying'
              ? t(
                  'Transak is reviewing your information. This can take a couple of minutes.',
                )
              : t(
                  'Transak is still reviewing your information. You can complete your purchase once your identity is verified.',
                )}
          </ThemedText>
        </View>
        {step === 'review' ? (
          <View style={styles.bottomSection}>
            <Button
              onPress={() => navigation.goBack()}
              borderRadius={100}
              style={styles.reviewOkButton}
              height={50}>
              {t('OK')}
            </Button>
            <Button
              onPress={() => onFallback('kyc in review')}
              buttonStyle={'secondary'}
              borderRadius={100}
              height={50}>
              {t('Continue on Transak')}
            </Button>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.kycContainer}>
        <TransakKyc
          ref={kycRef}
          sessionId={sessionId}
          environment={transakHeadlessEnvironment}
          onReady={() => setFormReady(true)}
          onStateChange={setFlowState}
          onSubmitted={onKycSubmitted}
          onError={onKycError}
          onDismiss={onKycDismiss}
        />
        {!formReady ? (
          <View
            style={[
              styles.formLoading,
              {backgroundColor: theme.colors.background},
            ]}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
      {formReady && flowState ? (
        <View style={styles.actions}>
          <Button
            onPress={() => kycRef.current?.back()}
            disabled={!flowState.canGoBack || flowState.isSubmitting}
            buttonStyle={'secondary'}
            borderRadius={100}
            style={styles.actionButton}
            height={50}>
            {t('Back')}
          </Button>
          {flowState.ctaText !== null ? (
            <>
              <View style={styles.actionSpacer} />
              <Button
                onPress={() => kycRef.current?.next()}
                disabled={!flowState.canGoNext || flowState.isSubmitting}
                state={flowState.isSubmitting ? 'loading' : undefined}
                borderRadius={100}
                style={styles.actionButton}
                height={50}>
                {flowState.ctaText}
              </Button>
            </>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default TransakBuyHeadlessKyc;
