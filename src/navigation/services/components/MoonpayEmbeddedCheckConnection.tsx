import React, {useState, useCallback} from 'react';
import {MoonPayWebView, FrameMessage} from './MoonPayWebView';
import {
  decryptClientCredentials,
  generateChannelId,
  generateKeyPair,
  MoonpayClientCredentials,
} from '../utils/moonpayFrameCrypto';

const FRAME_ORIGIN = 'https://blocks.moonpay.com';

interface CheckFrameProps {
  sessionToken: string;
  onActive: (credentials: MoonpayClientCredentials, channelId: string) => void;
  onConnectionRequired: (credentials: MoonpayClientCredentials) => void;
  onError: (error: {code: string; message: string}) => void;
  onPending?: () => void;
  onUnavailable?: () => void;
}

export function MoonPayCheckFrame({
  sessionToken,
  onActive,
  onConnectionRequired,
  onError,
  onPending,
  onUnavailable,
}: CheckFrameProps) {
  const [channelId] = useState(generateChannelId);
  const [keyPair] = useState(generateKeyPair);

  const frameUrl = `${FRAME_ORIGIN}/platform/v1/check-connection?${new URLSearchParams(
    {
      sessionToken,
      publicKey: keyPair.publicKeyHex,
      channelId,
    },
  ).toString()}`;

  const handleMessage = useCallback(
    (data: FrameMessage) => {
      switch (data.kind) {
        case 'complete':
          const payload = data.payload as {
            status: string;
            credentials?: string;
            reason?: string;
          };

          switch (payload.status) {
            case 'active':
              const credentials = decryptClientCredentials(
                payload.credentials!,
                keyPair.privateKeyHex,
              );
              // Check payload.capabilities.ramps.requirements.paymentDisclosures
              // to determine if payment disclosures are required before transacting
              onActive(credentials, channelId);
              break;
            case 'connectionRequired':
              const anonymousCredentials = decryptClientCredentials(
                payload.credentials!,
                keyPair.privateKeyHex,
              );
              onConnectionRequired(anonymousCredentials);
              break;
            case 'pending':
              onPending?.();
              break;
            case 'unavailable':
              onUnavailable?.();
              break;
            case 'failed':
              onError({
                code: 'failed',
                message: payload.reason || 'Check failed',
              });
              break;
          }
          break;

        case 'error':
          onError(data.payload as {code: string; message: string});
          break;
      }
    },
    [
      keyPair,
      onActive,
      onConnectionRequired,
      onError,
      onPending,
      onUnavailable,
    ],
  );

  return (
    <MoonPayWebView
      url={frameUrl}
      channelId={channelId}
      onMessage={handleMessage}
      onHandshake={() => {}}
      style={{width: 0, height: 0, position: 'absolute'}}
    />
  );
}
