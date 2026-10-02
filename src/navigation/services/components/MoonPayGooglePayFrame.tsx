import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  MoonPayWebView,
  MoonPayWebViewRef,
  FrameMessage,
} from './MoonPayWebView';
import {generateChannelId} from '../utils/moonpayFrameCrypto';
import {MOONPAY_DEFAULT_FRAME_ORIGIN} from '../buy-crypto/utils/moonpay-utils';

export interface GooglePayCompletePayload {
  transaction: {
    id: string;
    status: string;
  };
}

export interface GooglePayErrorPayload {
  code: string;
  message: string;
}

export interface GooglePayUnsupportedDetails {
  source: 'unsupportedEvent' | 'googlePayUnavailableError';
  code?: string;
  message?: string;
  // Whatever MoonPay sent, kept whole: the 'unsupported' event has no
  // documented payload, so nothing is assumed about its shape.
  payload?: unknown;
}

export type GooglePayFrameRef = {
  updateQuote: (signature: string) => void;
};

interface MoonPayGooglePayFrameProps {
  clientToken: string;
  signature: string;
  externalTransactionId?: string;
  theme?: 'dark' | 'light';
  onReady?: () => void;
  onComplete: (payload: GooglePayCompletePayload) => void;
  onChallenge: (url: string) => void;
  onError: (error: GooglePayErrorPayload) => void;
  onQuoteExpired?: () => void;
  // Customer dismissed the Google Pay sheet. The frame stays usable, so this is
  // an abandonment signal rather than an error.
  onCancelled?: (code?: string) => void;
  // The WebView cannot run the Payment Request API, so Google Pay can never
  // complete here: the button has to be hidden and another method offered.
  onUnsupported?: (details: GooglePayUnsupportedDetails) => void;
  // Fired the instant the button is tapped, before the Google Pay sheet opens.
  // Not an outcome: it also fires when the customer then cancels the sheet.
  onButtonPressed?: () => void;
}

export const MoonPayGooglePayFrame = forwardRef<
  GooglePayFrameRef,
  MoonPayGooglePayFrameProps
>(
  (
    {
      clientToken,
      signature,
      externalTransactionId,
      theme,
      onReady,
      onComplete,
      onChallenge,
      onError,
      onQuoteExpired,
      onCancelled,
      onUnsupported,
      onButtonPressed,
    },
    ref,
  ) => {
    const [channelId] = useState(generateChannelId);
    const webViewRef = useRef<MoonPayWebViewRef>(null);

    const frameUrl = `${MOONPAY_DEFAULT_FRAME_ORIGIN}/platform/v1/google-pay?${new URLSearchParams(
      {
        clientToken,
        channelId,
        signature,
        ...(externalTransactionId && {externalTransactionId}),
        ...(theme && {theme}),
      },
    ).toString()}`;

    useImperativeHandle(
      ref,
      () => ({
        updateQuote: (newSignature: string) => {
          webViewRef.current?.sendMessage('setQuote', {
            quote: {signature: newSignature},
          });
        },
      }),
      [],
    );

    const handleMessage = useCallback(
      (data: FrameMessage) => {
        switch (data.kind) {
          case 'ready':
            onReady?.();
            break;
          case 'complete': {
            const payload = data.payload as {
              transaction:
                | {id: string; status: string}
                | {
                    status: 'failed';
                    failureReason: string;
                    failureCode?:
                      | 'transactionNotAllowed'
                      | 'validationError'
                      | 'serviceUnavailable'
                      | 'authorizationDeclined'
                      | 'unknown';
                  };
            };
            if (payload.transaction.status === 'failed') {
              const failed = payload.transaction as {
                failureReason: string;
                failureCode?: string;
              };
              onError({
                code: failed.failureCode ?? 'transactionFailed',
                message: failed.failureReason,
              });
            } else {
              onComplete({
                transaction: payload.transaction as {
                  id: string;
                  status: string;
                },
              });
            }
            break;
          }
          case 'challenge': {
            const challengePayload = data.payload as {
              kind: string;
              url: string;
            };
            onChallenge(challengePayload.url);
            break;
          }
          case 'buttonPressed':
            onButtonPressed?.();
            break;
          case 'cancelled': {
            const payload = data.payload as {code?: string} | undefined;
            onCancelled?.(payload?.code);
            break;
          }
          case 'unsupported': {
            const payload = data.payload as
              | {code?: string; message?: string}
              | undefined;
            onUnsupported?.({
              source: 'unsupportedEvent',
              code: payload?.code,
              message: payload?.message,
              payload: data.payload,
            });
            break;
          }
          case 'error': {
            const error = data.payload as GooglePayErrorPayload;
            if (error.code === 'quoteExpired') {
              onQuoteExpired?.();
            } else if (error.code === 'googlePayUnavailable') {
              // Reported as an error, but it means the same as the
              // 'unsupported' event: the environment cannot run Google Pay, so
              // there is nothing to retry.
              onUnsupported?.({
                source: 'googlePayUnavailableError',
                code: error.code,
                message: error.message,
                payload: data.payload,
              });
            } else {
              onError(error);
            }
            break;
          }
        }
      },
      [
        onReady,
        onComplete,
        onChallenge,
        onError,
        onQuoteExpired,
        onCancelled,
        onUnsupported,
        onButtonPressed,
      ],
    );

    return (
      <MoonPayWebView
        ref={webViewRef}
        url={frameUrl}
        channelId={channelId}
        onMessage={handleMessage}
        onHandshake={() => {}}
        paymentRequestEnabled={true}
        // Required by Google, and by MoonPay's frame docs, for Google Pay inside
        // an Android WebView whose user agent is set by the app, which
        // react-native-webview always does.
        // https://developers.google.com/pay/api/android/guides/recipes/using-android-webview
        userAgentSuffix={'GOOGLE_PAY_SUPPORTED'}
        style={{height: 56, flex: undefined}}
      />
    );
  },
);
