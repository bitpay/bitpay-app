import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  MoonPayWebView,
  MoonPayWebViewRef,
  FrameMessage,
} from './MoonPayWebView';
import {generateChannelId} from '../utils/moonpayFrameCrypto';

const FRAME_ORIGIN = 'https://blocks.moonpay.com';

export interface BuyFrameCompletePayload {
  transaction: {
    id: string;
    status: string;
  };
}

export interface BuyFrameErrorPayload {
  code: string;
  message: string;
}

export type BuyFrameRef = {
  updateQuote: (signature: string) => void;
};

interface MoonPayBuyFrameProps {
  clientToken: string;
  signature: string;
  externalTransactionId?: string;
  onReady?: () => void;
  onComplete: (payload: BuyFrameCompletePayload) => void;
  onChallenge: (url: string) => void;
  onError: (error: BuyFrameErrorPayload) => void;
  onQuoteExpired?: () => void;
}

// Headless "buy" frame used to execute a purchase from a quote signature that
// already carries the payment method (e.g. a saved card). Used by the Cards
// embedded flow the same way MoonPayApplePayFrame is used for Apple Pay,
// except it has no visible button of its own: the app renders its own "Pay"
// button and mounts this frame once the user taps it.
export const MoonPayBuyFrame = forwardRef<BuyFrameRef, MoonPayBuyFrameProps>(
  (
    {
      clientToken,
      signature,
      externalTransactionId,
      onReady,
      onComplete,
      onChallenge,
      onError,
      onQuoteExpired,
    },
    ref,
  ) => {
    const [channelId] = useState(generateChannelId);
    const webViewRef = useRef<MoonPayWebViewRef>(null);

    const [frameUrl] = useState(
      () =>
        `${FRAME_ORIGIN}/platform/v1/buy?${new URLSearchParams({
          clientToken,
          channelId,
          signature,
          ...(externalTransactionId && {externalTransactionId}),
        }).toString()}`,
    );

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
            const payload = data.payload as BuyFrameCompletePayload;
            onComplete(payload);
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
          case 'error': {
            const error = data.payload as BuyFrameErrorPayload;
            if (error.code === 'quoteExpired') {
              onQuoteExpired?.();
            } else {
              onError(error);
            }
            break;
          }
        }
      },
      [onReady, onComplete, onChallenge, onError, onQuoteExpired],
    );

    return (
      <MoonPayWebView
        ref={webViewRef}
        url={frameUrl}
        channelId={channelId}
        onMessage={handleMessage}
        onHandshake={() => {}}
        style={{width: 0, height: 0, position: 'absolute'}}
      />
    );
  },
);
