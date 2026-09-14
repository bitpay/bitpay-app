import React, {useCallback} from 'react';
import {MoonPayWebView, FrameMessage} from './MoonPayWebView';
import {generateChannelId} from '../utils/moonpayFrameCrypto';
import {MOONPAY_DEFAULT_FRAME_ORIGIN} from '../buy-crypto/utils/moonpay-utils';
import {MoonpayEmbeddedCardPaymentMethod} from '../../../store/buy-crypto/buy-crypto.models';

export interface AddCardErrorPayload {
  code: 'configurationError' | 'generic';
  message: string;
}

interface MoonPayAddCardFrameProps {
  clientToken: string;
  theme?: 'dark' | 'light';
  onReady?: () => void;
  onComplete: (card: MoonpayEmbeddedCardPaymentMethod) => void;
  onError: (error: AddCardErrorPayload) => void;
}

export function MoonPayAddCardFrame({
  clientToken,
  theme,
  onReady,
  onComplete,
  onError,
}: MoonPayAddCardFrameProps) {
  const [channelId] = React.useState(generateChannelId);

  const frameUrl = `${MOONPAY_DEFAULT_FRAME_ORIGIN}/platform/v1/add-card?${new URLSearchParams(
    {
      clientToken,
      channelId,
      ...(theme && {theme}),
    },
  ).toString()}`;

  const handleMessage = useCallback(
    (data: FrameMessage) => {
      switch (data.kind) {
        case 'ready':
          onReady?.();
          break;
        case 'complete': {
          const payload = data.payload as {
            card: MoonpayEmbeddedCardPaymentMethod;
          };
          onComplete(payload.card);
          break;
        }
        case 'error':
          onError(data.payload as AddCardErrorPayload);
          break;
      }
    },
    [onReady, onComplete, onError],
  );

  return (
    <MoonPayWebView
      url={frameUrl}
      channelId={channelId}
      onMessage={handleMessage}
      onHandshake={() => {}}
      style={{flex: 1}}
    />
  );
}
