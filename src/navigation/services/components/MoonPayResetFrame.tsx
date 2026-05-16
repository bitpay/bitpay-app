import React, {useState, useCallback} from 'react';
import {MoonPayWebView, FrameMessage} from './MoonPayWebView';
import {generateChannelId} from '../utils/moonpayFrameCrypto';

const FRAME_ORIGIN = 'https://blocks.moonpay.com';

interface MoonPayResetFrameProps {
  onComplete: () => void;
  onError: (error: {code: string; message: string}) => void;
  theme?: 'light' | 'dark';
}

export function MoonPayResetFrame({
  onComplete,
  onError,
  theme,
}: MoonPayResetFrameProps) {
  const [channelId] = useState(generateChannelId);

  const params: Record<string, string> = {channelId};
  if (theme) {
    params.theme = theme;
  }

  const frameUrl = `${FRAME_ORIGIN}/platform/v1/reset?${new URLSearchParams(
    params,
  ).toString()}`;

  const handleMessage = useCallback(
    (data: FrameMessage) => {
      switch (data.kind) {
        case 'complete':
          onComplete();
          break;
        case 'error':
          onError(data.payload as {code: string; message: string});
          break;
      }
    },
    [onComplete, onError],
  );

  // The reset frame is headless — render it invisibly (0×0) so it can
  // complete the postMessage handshake without affecting the UI.
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
