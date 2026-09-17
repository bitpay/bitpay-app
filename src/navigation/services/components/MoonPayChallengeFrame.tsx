import React, {useMemo, useState, useCallback} from 'react';
import {MoonPayWebView, FrameMessage} from './MoonPayWebView';
import {generateChannelId} from '../utils/moonpayFrameCrypto';

export interface ChallengeCompletePayload {
  transaction: {
    id: string;
    status: string;
  };
}

export interface ChallengeErrorPayload {
  code: string;
  message: string;
}

interface MoonPayChallengeFrameProps {
  challengeUrl: string;
  clientToken: string;
  theme?: 'dark' | 'light';
  onReady?: () => void;
  onComplete: (payload: ChallengeCompletePayload) => void;
  onCancelled: () => void;
  onError: (error: ChallengeErrorPayload) => void;
}

export function MoonPayChallengeFrame({
  challengeUrl,
  clientToken,
  theme,
  onReady,
  onComplete,
  onCancelled,
  onError,
}: MoonPayChallengeFrameProps) {
  const [channelId] = useState(generateChannelId);

  const frameUrl = useMemo(() => {
    const url = new URL(challengeUrl);
    url.searchParams.set('channelId', channelId);
    // Required for manual integrations: the same clientToken used for the
    // other frames has to be appended to the challenge URL.
    url.searchParams.set('clientToken', clientToken);
    if (theme) {
      url.searchParams.set('theme', theme);
    }
    return url.toString();
  }, [challengeUrl, channelId, clientToken, theme]);

  const handleMessage = useCallback(
    (data: FrameMessage) => {
      switch (data.kind) {
        case 'ready':
          onReady?.();
          break;
        case 'complete': {
          const payload = data.payload as {
            flow: string;
            transaction: {id: string; status: string};
          };
          onComplete({transaction: payload.transaction});
          break;
        }
        case 'cancelled':
          onCancelled();
          break;
        case 'error':
          onError(data.payload as ChallengeErrorPayload);
          break;
      }
    },
    [onReady, onComplete, onCancelled, onError],
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
