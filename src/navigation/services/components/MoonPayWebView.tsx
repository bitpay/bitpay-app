import React, {
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {View, ViewStyle, StyleSheet} from 'react-native';
import {WebView, WebViewMessageEvent} from 'react-native-webview';

type MoonPayWebViewProps = {
  url: string;
  channelId: string;
  onMessage: (data: FrameMessage) => void;
  onHandshake: () => void;
  style?: ViewStyle;
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
>(({url, channelId, onMessage, onHandshake, style}, ref) => {
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
      try {
        const data: FrameMessage = JSON.parse(event.nativeEvent.data);
        if (data.meta?.channelId !== channelId) return;

        if (data.kind === 'handshake') {
          sendMessage('ack');
          onHandshake();
        }

        onMessage(data);
      } catch {
        // Ignore malformed messages
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
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {flex: 1},
  webview: {flex: 1},
});
