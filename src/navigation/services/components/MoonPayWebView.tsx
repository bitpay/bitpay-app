import React, {
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {View, ViewStyle, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';
import {logManager} from '../../../managers/LogManager';

type MoonPayWebViewProps = {
  url: string;
  channelId: string;
  onMessage: (data: FrameMessage) => void;
  onHandshake: () => void;
  style?: ViewStyle;
  // Google Pay runs on the Payment Request API, which Android WebViews keep
  // disabled by default. Opt-in per frame so the other frames are untouched.
  paymentRequestEnabled?: boolean;
};

export type MoonPayWebViewRef = {
  sendMessage: (kind: string, payload?: object) => void;
};

export type FrameMessage = {
  version: number;
  meta: {channelId: string};
  kind: string;
  payload?: unknown;
};

export const MoonPayWebView = forwardRef<
  MoonPayWebViewRef,
  MoonPayWebViewProps
>(
  (
    {url, channelId, onMessage, onHandshake, style, paymentRequestEnabled},
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);

    const sendMessage = useCallback(
      (kind: string, payload?: object) => {
        const message = {
          version: 2,
          meta: {channelId},
          kind,
          ...(payload && {payload}),
        };

        webViewRef.current?.postMessage(JSON.stringify(message));
      },
      [channelId],
    );

    useImperativeHandle(ref, () => ({sendMessage}), [sendMessage]);

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const raw = event.nativeEvent.data;

        let data: FrameMessage;
        try {
          data = JSON.parse(raw);
        } catch {
          // Anything running in the frame can post to this bridge, so a message
          // that is not the frames protocol is expected rather than a failure.
          logManager.debug(
            `[MoonPayWebView]: ignored a non-JSON message: ${String(raw).slice(
              0,
              100,
            )}`,
          );
          return;
        }

        if (data.meta?.channelId !== channelId) {
          logManager.debug(
            `[MoonPayWebView]: ignored '${data.kind}' from another channel (${data.meta?.channelId})`,
          );
          return;
        }

        // Kept separate from the parsing above: a handler throwing is a bug on
        // our side, not a malformed message, and swallowing it silently is what
        // made those failures invisible.
        try {
          if (data.kind === 'handshake') {
            sendMessage('ack');
            onHandshake();
          }

          onMessage(data);
        } catch (err) {
          logManager.error(
            `[MoonPayWebView]: handler for '${data.kind}' threw: ${
              err instanceof Error ? err.message : JSON.stringify(err)
            }`,
          );
        }
      },
      [channelId, sendMessage, onMessage, onHandshake],
    );

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          key={'frame-' + url}
          source={{uri: url}}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          automaticallyAdjustContentInsets
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          paymentRequestEnabled={paymentRequestEnabled}
          style={styles.webview}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {flex: 1},
  webview: {flex: 1},
});
