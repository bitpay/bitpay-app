/**
 * MoonpayEmbeddedCredentialManager
 *
 * Global, invisible component mounted at the app root. It runs the
 * MoonPay check-connection frame as soon as the user conditions are met
 * (iOS, US, user with eid, Apple Pay supported) and stores the
 * resulting credentials in the module-level cache in buy-crypto.effects.ts.
 *
 * BuyAndSellRoot (and any other screen) can then read those credentials
 * synchronously without having to run the frame themselves.
 *
 * Lifecycle:
 *  1. Detect conditions met → call moonpayCreateSession → get sessionToken
 *  2. Render <MoonPayCheckFrame> with that token (invisible WebView)
 *  3a. onActive        → store credentials + schedule expiry refresh
 *  3b. onConnectionRequired → store anonymous credentials (user needs to connect
 *                             via the onboarding flow in BuyAndSellRoot)
 *  3c. onError "failed/unexpected" → render <MoonPayResetFrame>, then restart from 1
 *  4. Before credentials expire → clear + restart from 1
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import ApplePushProvisioningModule from '../../../lib/apple-push-provisioning/ApplePushProvisioning';
import {useAppSelector} from '../../../utils/hooks';
import {
  clearMoonpayEmbeddedCredentials,
  isMoonpayEmbeddedCredentialsValid,
  registerMoonpayEmbeddedRecheckListener,
  setMoonpayEmbeddedAnonymousCredentials,
  setMoonpayEmbeddedCredentials,
  setMoonpayEmbeddedEnabled,
  setMoonpayEmbeddedStatus,
} from '../../../store/buy-crypto/buy-crypto.effects';
import {MoonPayCheckFrame} from './MoonpayEmbeddedCheckConnection';
import {MoonPayResetFrame} from './MoonPayResetFrame';
import {moonpayEnv} from '../buy-crypto/utils/moonpay-utils';
import {MoonpayClientCredentials} from '../utils/moonpayFrameCrypto';
import {logManager} from '../../../managers/LogManager';
import {
  MoonpayCreateSessionData,
  MoonpayCreateSessionRequestData,
} from '../../../store/buy-crypto/buy-crypto.models';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import {BwcProvider} from '../../../lib/bwc';

const BWC = BwcProvider.getInstance();

/** Refresh credentials this many ms before expiry. */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 min

export function MoonpayEmbeddedCredentialManager() {
  const network = useAppSelector(({APP}) => APP.network);
  const user: User = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const country = locationData?.countryShortCode || 'US';

  const [applePaySupported, setApplePaySupported] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>();
  const [runReset, setRunReset] = useState(false);
  // Incremented to re-trigger session creation after reset / expiry
  const [checkTrigger, setCheckTrigger] = useState(0);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const userEid = user?.eid;

  const moonpayEmbeddedEnabled =
    Platform.OS === 'ios' &&
    (country === 'US' || user?.country === 'US') &&
    !!userEid &&
    applePaySupported;

  // -------------------------------------------------------------------------
  // Keep module-level cache in sync with the derived flag
  // -------------------------------------------------------------------------
  useEffect(() => {
    setMoonpayEmbeddedEnabled(moonpayEmbeddedEnabled);
  }, [moonpayEmbeddedEnabled]);

  // -------------------------------------------------------------------------
  // Register recheck listener so external screens (e.g. MoonpayConnectionSettings)
  // can trigger a new session after an unlink/reset.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unregister = registerMoonpayEmbeddedRecheckListener(() => {
      clearMoonpayEmbeddedCredentials();
      setMoonpayEmbeddedAnonymousCredentials(undefined);
      setMoonpayEmbeddedStatus(undefined);
      setSessionToken(undefined);
      setCheckTrigger(t => t + 1);
    });
    return unregister;
  }, []);

  // -------------------------------------------------------------------------
  // Check Apple Pay availability once (or when context changes)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    ApplePushProvisioningModule.canAddPaymentPass()
      .then((can: boolean) => {
        if (mounted) setApplePaySupported(!!can);
      })
      .catch(() => {
        if (mounted) setApplePaySupported(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Schedule a credentials refresh before they expire
  // -------------------------------------------------------------------------
  const scheduleRefresh = useCallback(
    (credentials: MoonpayClientCredentials) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (!credentials.expiresAt) return;

      const expiresMs = new Date(credentials.expiresAt).getTime();
      const refreshIn = expiresMs - Date.now() - EXPIRY_BUFFER_MS;

      if (refreshIn <= 0) {
        // Already near or past expiry — refresh immediately
        clearMoonpayEmbeddedCredentials();
        setMoonpayEmbeddedAnonymousCredentials(undefined);
        setMoonpayEmbeddedStatus(undefined);
        setSessionToken(undefined);
        setCheckTrigger(t => t + 1);
        return;
      }

      refreshTimerRef.current = setTimeout(() => {
        logManager.debug(
          '[MoonpayEmbeddedCredentialManager]: credentials near expiry — refreshing.',
        );
        clearMoonpayEmbeddedCredentials();
        setMoonpayEmbeddedAnonymousCredentials(undefined);
        setMoonpayEmbeddedStatus(undefined);
        setSessionToken(undefined);
        setCheckTrigger(t => t + 1);
      }, refreshIn);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Create a session token and render the check frame
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!moonpayEmbeddedEnabled || !userEid) return;

    // Skip if we already have valid credentials
    if (isMoonpayEmbeddedCredentialsValid()) return;

    // Skip if a session token is already loaded and waiting for the frame
    if (sessionToken) return;

    // Skip if currently resetting
    if (runReset) return;

    let cancelled = false;

    const createSession = async () => {
      try {
        setMoonpayEmbeddedStatus('checking');
        let reqData: MoonpayCreateSessionRequestData = {
          env: moonpayEnv,
          externalCustomerId: userEid,
        };

        if (user?.email && user?.phone) {
          reqData.phoneNumber = user.phone;
          reqData.email = user.email;
        }

        const walletClient = BWC.getClient();
        const data: MoonpayCreateSessionData =
          await walletClient.moonpayCreateSession(reqData);

        if (!cancelled) {
          setSessionToken(data.sessionToken);
        }
      } catch (err) {
        if (!cancelled) {
          logManager.debug(
            `MoonpayEmbeddedCredentialManager: session creation failed. ${
              err instanceof Error ? err.message : JSON.stringify(err)
            }`,
          );
          setMoonpayEmbeddedStatus(undefined);
        }
      }
    };

    createSession();

    return () => {
      cancelled = true;
    };
    // checkTrigger is intentionally included so a reset / expiry re-runs this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moonpayEmbeddedEnabled, userEid, checkTrigger]);

  // -------------------------------------------------------------------------
  // Cleanup timer on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Nothing to render if conditions aren't met
  if (!moonpayEmbeddedEnabled) return null;

  // Reset frame — headless, clears the user's MoonPay session
  if (runReset) {
    return (
      <MoonPayResetFrame
        onComplete={() => {
          logManager.debug(
            '[MoonpayEmbeddedCredentialManager]: reset complete — restarting check.',
          );
          setRunReset(false);
          clearMoonpayEmbeddedCredentials();
          setMoonpayEmbeddedStatus(undefined);
          setSessionToken(undefined);
          setCheckTrigger(t => t + 1);
        }}
        onError={error => {
          logManager.error(
            `MoonpayEmbeddedCredentialManager: reset error [${error.code}] ${error.message}`,
          );
          setRunReset(false);
          setMoonpayEmbeddedStatus(undefined);
        }}
      />
    );
  }

  // Check-connection frame — invisible WebView
  if (!sessionToken) return null;

  return (
    <MoonPayCheckFrame
      sessionToken={sessionToken}
      onActive={(credentials, _channelId) => {
        logManager.debug(
          '[MoonpayEmbeddedCredentialManager]: active — credentials stored.',
        );
        setSessionToken(undefined); // token consumed (single-use)
        setMoonpayEmbeddedCredentials(credentials);
        setMoonpayEmbeddedStatus('active');
        scheduleRefresh(credentials);
      }}
      onConnectionRequired={anonymousCredentials => {
        logManager.debug(
          '[MoonpayEmbeddedCredentialManager]: connectionRequired — anonymous credentials stored.',
        );
        setSessionToken(undefined); // token consumed (single-use)
        setMoonpayEmbeddedAnonymousCredentials(anonymousCredentials);
        setMoonpayEmbeddedStatus('connectionRequired');
        // Schedule re-check when anonymous credentials expire
        scheduleRefresh(anonymousCredentials);
      }}
      onError={error => {
        logManager.debug(
          `[MoonpayEmbeddedCredentialManager]: error [${error.code}] ${error.message}`,
        );
        setSessionToken(undefined);
        if (
          error.code === 'failed' &&
          error.message === 'Current customer unexpected response'
        ) {
          setRunReset(true);
        } else {
          setMoonpayEmbeddedStatus('failed');
        }
      }}
      onPending={() => {
        setSessionToken(undefined);
        setMoonpayEmbeddedStatus('pending');
      }}
      onUnavailable={() => {
        setSessionToken(undefined);
        setMoonpayEmbeddedStatus('unavailable');
      }}
    />
  );
}
