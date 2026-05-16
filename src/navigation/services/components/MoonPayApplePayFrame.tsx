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

const FRAME_ORIGIN = 'https://blocks.moonpay.com';

export interface ApplePayCompletePayload {
  transaction: {
    id: string;
    status: string;
  };
}

export interface ApplePayErrorPayload {
  code: string;
  message: string;
}

export type ApplePayFrameRef = {
  updateQuote: (signature: string) => void;
};

interface MoonPayApplePayFrameProps {
  clientToken: string;
  signature: string;
  onReady?: () => void;
  onComplete: (payload: ApplePayCompletePayload) => void;
  onError: (error: ApplePayErrorPayload) => void;
  onQuoteExpired?: () => void;
}

export const MoonPayApplePayFrame = forwardRef<
  ApplePayFrameRef,
  MoonPayApplePayFrameProps
>(
  (
    {clientToken, signature, onReady, onComplete, onError, onQuoteExpired},
    ref,
  ) => {
    const [channelId] = useState(generateChannelId);
    const webViewRef = useRef<MoonPayWebViewRef>(null);

    const frameUrl = `${FRAME_ORIGIN}/platform/v1/apple-pay?${new URLSearchParams(
      {
        clientToken,
        channelId,
        signature,
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
                | {status: 'failed'; failureReason: string};
            };
            if (payload.transaction.status === 'failed') {
              onError({
                code: 'transactionFailed',
                message: (payload.transaction as {failureReason: string})
                  .failureReason,
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
          case 'error': {
            const error = data.payload as ApplePayErrorPayload;
            if (error.code === 'quoteExpired') {
              onQuoteExpired?.();
            } else {
              onError(error);
            }
            break;
          }
        }
      },
      [onReady, onComplete, onError, onQuoteExpired],
    );

    return (
      <MoonPayWebView
        ref={webViewRef}
        url={frameUrl}
        channelId={channelId}
        onMessage={handleMessage}
        onHandshake={() => {}}
        style={{height: __DEV__ ? 44 : 56, flex: undefined}}
      />
    );
  },
);
