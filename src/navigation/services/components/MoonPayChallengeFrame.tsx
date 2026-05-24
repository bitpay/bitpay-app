import React, {useMemo, useState, useCallback} from 'react';
import {StyleSheet} from 'react-native';
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
  onComplete: (payload: ChallengeCompletePayload) => void;
  onCancelled: () => void;
  onError: (error: ChallengeErrorPayload) => void;
}

export function MoonPayChallengeFrame({
  challengeUrl,
  onComplete,
  onCancelled,
  onError,
}: MoonPayChallengeFrameProps) {
  const [channelId] = useState(generateChannelId);

  const frameUrl = useMemo(() => {
    const url = new URL(challengeUrl);
    url.searchParams.set('channelId', channelId);
    return url.toString();
  }, [challengeUrl, channelId]);

  const handleMessage = useCallback(
    (data: FrameMessage) => {
      switch (data.kind) {
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
    [onComplete, onCancelled, onError],
  );

  return (
    <MoonPayWebView
      url={frameUrl}
      channelId={channelId}
      onMessage={handleMessage}
      onHandshake={() => {}}
      style={StyleSheet.absoluteFill}
    />
  );
}
