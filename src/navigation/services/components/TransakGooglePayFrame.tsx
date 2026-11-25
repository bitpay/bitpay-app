import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {
  buildGooglePayUrl,
  dispatchGooglePayEvent,
  GooglePayCallbacks,
  GooglePayEnvironment,
  translateGooglePayEvent,
} from '@transak/ui-components-core';

type TransakGooglePayFrameProps = GooglePayCallbacks & {
  sessionId: string;
  environment: GooglePayEnvironment;
};

// TransakGooglePay from @transak/ui-components-rn, plus the Payment Request
// API that Google Pay needs in an Android WebView: the component leaves it
// disabled, as Android WebViews do by default.
const TransakGooglePayFrame = ({
  sessionId,
  environment,
  onReady,
  onSuccess,
  onError,
}: TransakGooglePayFrameProps) => {
  const callbacksRef = useRef<GooglePayCallbacks>({
    onReady,
    onSuccess,
    onError,
  });
  useEffect(() => {
    callbacksRef.current = {onReady, onSuccess, onError};
  }, [onReady, onSuccess, onError]);

  const uri = useMemo(
    () => buildGooglePayUrl({sessionId, environment}),
    [sessionId, environment],
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: unknown;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    const translated = translateGooglePayEvent(data);
    if (translated) {
      dispatchGooglePayEvent(translated, callbacksRef.current);
    }
  };

  return (
    <WebView
      source={{uri}}
      onMessage={handleMessage}
      paymentRequestEnabled={true}
      style={styles.webview}
    />
  );
};

const styles = StyleSheet.create({
  webview: {flex: 1, backgroundColor: 'transparent'},
});

export default TransakGooglePayFrame;
