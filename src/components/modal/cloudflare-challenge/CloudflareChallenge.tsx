import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator} from 'react-native';
import {WebView, WebViewNavigation} from 'react-native-webview';
import CookieManager from '@preeternal/react-native-cookie-manager';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {IS_ANDROID} from '../../../constants';
import {LightBlack, SlateDark, White} from '../../../styles/colors';
import {BaseText} from '../../styled/Text';
import SheetModal from '../base/sheet/SheetModal';
import {logManager} from '../../../managers/LogManager';
import {
  cloudflareChallengeManager,
  CloudflareChallengeState,
} from '../../../managers/CloudflareChallengeManager';
import {challengeOriginFor} from '../../../utils/cloudflare';

// Cookie Cloudflare sets once a challenge is cleared.
const CLEARANCE_COOKIE = 'cf_clearance';

// How often to re-check for the clearance cookie while the challenge is up.
// Turnstile can set the cookie without a navigation event, so load callbacks
// alone aren't a reliable success signal.
const CLEARANCE_POLL_MS = 1000;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const Title = styled(BaseText)`
  font-size: 16px;
  font-weight: 700;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
`;

const CancelButton = styled.TouchableOpacity`
  padding: 8px;
`;

const CancelText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme}) => (theme.dark ? White : SlateDark)};
`;

const Loader = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  align-items: center;
  justify-content: center;
`;

const CloudflareChallengeModal: React.FC = () => {
  const {t} = useTranslation();
  const [state, setState] = useState<CloudflareChallengeState>(
    cloudflareChallengeManager.getState(),
  );
  const [loading, setLoading] = useState(true);
  // The URL being solved. Kept in local state rather than read straight off
  // the manager so the WebView survives the hide animation after resolve()
  // clears the manager's url, and so the sheet stays mounted through hide
  // rather than being torn out mid-animation.
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  // Guards against resolving twice when the cookie check and a navigation
  // event land together.
  const settled = useRef(false);
  // cf_clearance value present BEFORE the user solved anything. A stale
  // clearance cookie (plausibly the reason Cloudflare challenged us at all)
  // must not read as success — only a new value counts. `undefined` means the
  // snapshot hasn't been taken yet, so success checks hold off.
  const priorClearance = useRef<string | null | undefined>(undefined);

  useEffect(() => cloudflareChallengeManager.subscribe(setState), []);

  // Cookies are host-scoped, so clearance is read against the origin — but the
  // WebView loads the challenged URL itself, which is what Cloudflare actually
  // has a rule for. Loading the bare origin may not re-trigger a path-scoped
  // challenge, leaving the user with nothing to solve.
  const origin = displayUrl ? challengeOriginFor(displayUrl) : null;

  const finish = useCallback((solved: boolean) => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    cloudflareChallengeManager.resolve(solved);
  }, []);

  useEffect(() => {
    if (!state.isVisible) {
      return;
    }

    settled.current = false;
    setLoading(true);

    const nextOrigin = state.url ? challengeOriginFor(state.url) : null;
    if (!state.url || !nextOrigin) {
      // Nothing solvable to show. Resolve instead of leaving the caller
      // awaiting present() forever.
      logManager.error(
        '[Cloudflare] Challenge URL missing or malformed:',
        String(state.url),
      );
      finish(false);
      return;
    }

    setDisplayUrl(state.url);

    // Snapshot any pre-existing clearance so it can't be mistaken for success.
    priorClearance.current = undefined;
    CookieManager.get(nextOrigin, false)
      .then(cookies => {
        priorClearance.current = cookies?.[CLEARANCE_COOKIE]?.value ?? null;
      })
      .catch(() => {
        priorClearance.current = null;
      });
  }, [state.isVisible, state.url, finish]);

  /**
   * Cloudflare clears a challenge by setting a fresh `cf_clearance`. On iOS the
   * WebView writes to the shared NSHTTPCookieStorage (via sharedCookiesEnabled)
   * that fetch/axios read, so useWebKit is false here; on Android the WebView
   * and OkHttp already share a cookie jar.
   */
  const checkCleared = useCallback(async () => {
    if (!origin || settled.current || priorClearance.current === undefined) {
      return;
    }
    try {
      const cookies = await CookieManager.get(origin, false);
      const clearance = cookies?.[CLEARANCE_COOKIE]?.value;
      if (clearance && clearance !== priorClearance.current) {
        logManager.debug('[Cloudflare] Challenge cleared.');
        finish(true);
      }
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error('[Cloudflare] Failed reading cookies:', errStr);
    }
  }, [origin, finish]);

  useEffect(() => {
    if (!state.isVisible) {
      return;
    }
    const poll = setInterval(checkCleared, CLEARANCE_POLL_MS);
    return () => clearInterval(poll);
  }, [state.isVisible, checkCleared]);

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      if (!nav.loading) {
        checkCleared();
      }
    },
    [checkCleared],
  );

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={state.isVisible && !!origin}
      fullscreen={true}
      backdropOpacity={0.85}
      // A stray backdrop tap must not abandon a challenge mid-solve. Matches
      // RecaptchaModal, the sibling bot-challenge sheet in this same flow.
      enableBackdropDismiss={false}
      onBackdropPress={() => {}}
      paddingTop={0}
      onModalHide={() => {
        // Keep the WebView if another present() raced in during the hide
        // animation; otherwise release it.
        if (!cloudflareChallengeManager.getState().isVisible) {
          setDisplayUrl(null);
        }
      }}>
      {displayUrl && origin ? (
        <Container>
          <Header>
            <Title>{t('Verifying your browser')}</Title>
            <CancelButton
              onPress={() => finish(false)}
              accessibilityLabel="Cancel verification">
              <CancelText>{t('Cancel')}</CancelText>
            </CancelButton>
          </Header>

          <WebView
            source={{uri: displayUrl}}
            // iOS: write to the cookie store fetch/axios read from.
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            // A cached challenge page is a stale challenge page.
            cacheEnabled={false}
            cacheMode={IS_ANDROID ? 'LOAD_NO_CACHE' : undefined}
            // No userAgent override on purpose. Cloudflare scores the UA against
            // the TLS/HTTP2 fingerprint, so claiming to be Safari from a WebView
            // makes a challenge likelier to fail, not likelier to clear.
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              checkCleared();
            }}
            onNavigationStateChange={onNavigationStateChange}
            onError={syntheticEvent => {
              const {nativeEvent} = syntheticEvent;
              logManager.error(
                '[Cloudflare] WebView error:',
                nativeEvent.description,
              );
            }}
          />

          {loading ? (
            <Loader pointerEvents={'none'}>
              <ActivityIndicator />
            </Loader>
          ) : null}
        </Container>
      ) : null}
    </SheetModal>
  );
};

export default CloudflareChallengeModal;
