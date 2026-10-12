import {Alert, AppState, Linking, Platform} from 'react-native';
import i18n from 'i18next';
import {URL} from '../constants';
import {safeVaultError, vaultDiagnostic} from './vault-diagnostics';

// One failed bootstrap owns one controller. Browser-request completion is not
// foreground return: openURL can resolve before Android pauses the Activity.
export const vaultStartupAlert = (error: unknown, retry: () => void) => {
  const diagnostic = vaultDiagnostic(safeVaultError(error))!;
  const id = `${diagnostic.code}/${diagnostic.phase}`;
  let disposed = false;
  let visible = false;
  let waitingForSupport = false;
  let departed = false;
  let blurred = false;
  let presentationId = 0;
  let supportId = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const returned = () => {
    if (disposed || !waitingForSupport) return;
    supportId++; // Ignore a browser result arriving after foreground return.
    cancelTimer();
    // Native Activity resume/dialog dismissal must finish before showing again.
    timer = setTimeout(() => {
      timer = undefined;
      if (AppState.currentState !== 'active') return;
      waitingForSupport = false;
      present();
    }, 0);
  };
  const present = (supportFallback = false) => {
    if (
      disposed ||
      visible ||
      (waitingForSupport && !supportFallback) ||
      AppState.currentState !== 'active'
    )
      return;
    visible = true;
    const shown = ++presentationId;
    const current = () =>
      !disposed &&
      shown === presentationId &&
      AppState.currentState === 'active';
    Alert.alert(
      i18n.t('Wallet data could not be opened'),
      i18n.t(
        'Your local data was preserved. Retry or contact support. Do not uninstall the app or clear its data. Reference: {{id}}.',
        {id},
      ),
      [
        {
          text: i18n.t('Retry'),
          onPress: () => {
            if (!current()) return;
            dispose();
            retry();
          },
        },
        {
          text: i18n.t('Help & Support'),
          onPress: () => {
            if (!current()) return;
            visible = false;
            presentationId++;
            waitingForSupport = true;
            departed = false;
            blurred = false;
            cancelTimer();
            const request = ++supportId;
            Promise.resolve()
              .then(() => Linking.openURL(URL.HELP_AND_SUPPORT))
              .then(
                () => {
                  if (disposed || request !== supportId) return;
                  // Fulfillment alone is not foreground return.
                  if (departed && AppState.currentState === 'active')
                    returned();
                  else if (
                    !departed &&
                    !blurred &&
                    AppState.currentState === 'active'
                  ) {
                    // One bounded UI fallback for a successful intent that
                    // produces no lifecycle event. This delay proves nothing
                    // about departure: keep watching this request so a later
                    // background transition invalidates this presentation and
                    // a real return presents again. Never retry bootstrap here.
                    timer = setTimeout(() => {
                      timer = undefined;
                      if (request === supportId && !departed && !blurred)
                        present(true);
                    }, 1000);
                  }
                },
                () => {
                  if (disposed || request !== supportId) return;
                  if (!departed || AppState.currentState === 'active')
                    returned();
                },
              );
          },
        },
      ],
      {cancelable: false},
    );
  };
  const subscription = AppState.addEventListener('change', state => {
    if (disposed) return;
    if (!waitingForSupport) {
      if (state === 'active' && !visible) {
        cancelTimer();
        timer = setTimeout(() => {
          timer = undefined;
          present();
        }, 0);
      }
      return;
    }
    if (state !== 'active') {
      departed = true;
      visible = false;
      presentationId++;
      cancelTimer();
    } else if (departed) returned();
  });
  const focusSubscriptions =
    Platform.OS === 'android'
      ? [
          AppState.addEventListener('blur', () => {
            // A visible native Alert itself takes window focus. Only count a blur
            // while awaiting support, after the clicked dialog has been retired.
            if (disposed || !waitingForSupport || visible) return;
            blurred = true;
            cancelTimer();
          }),
          AppState.addEventListener('focus', () => {
            if (blurred && AppState.currentState === 'active') returned();
          }),
        ]
      : [];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    presentationId++;
    supportId++;
    cancelTimer();
    subscription.remove();
    focusSubscriptions.forEach(listener => listener.remove());
  };
  present();
  return dispose;
};
