import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import styled from 'styled-components/native';
import Spinner from '../../../../components/spinner/Spinner';
import {BASE_BITPAY_URLS} from '../../../../constants/config';
import {AppActions} from '../../../../store/app';
import {CardActions, CardEffects} from '../../../../store/card';
import {LogActions} from '../../../../store/log';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {CardScreens, CardStackParamList} from '../../CardStack';

export type ResetPinScreenParamList = {
  id: string;
};

enum StatusCodes {
  SUCCESS = 0,
  BAD_SUBMITTER_ID = -1,
  INVALID_TOKEN = -10, // token is either expired or not found
  TOKEN_CHANGED = -11, // was assigned a token, then tried to load a different (valid) token
  SYSTEM_ERROR = -999,
  UNKNOWN_ERROR = -9999,
}

const StatusTextMap: Record<number, string> = {
  [StatusCodes.SUCCESS]: 'Success',
  [StatusCodes.BAD_SUBMITTER_ID]: 'Bad submitter ID',
  [StatusCodes.INVALID_TOKEN]: 'Invalid token',
  [StatusCodes.SYSTEM_ERROR]: 'System error',
  [StatusCodes.UNKNOWN_ERROR]: 'Unknown error',
};

const SpinnerWrapper = styled.View`
  align-items: center;
  margin-top: 24px;
`;

const ResetPinScreen: React.VFC<
  NativeStackScreenProps<CardStackParamList, CardScreens.RESET_PIN>
> = ({navigation, route}) => {
  const {id} = route.params;
  const dispatch = useAppDispatch();
  const network = useAppSelector(({APP}) => APP.network);
  const uri = useAppSelector(({CARD}) => CARD.pinChangeRequestInfo[id]);
  const fetchUriStatus = useAppSelector(
    ({CARD}) => CARD.pinChangeRequestInfoStatus[id],
  );
  const confirmPinChangeStatus = useAppSelector(
    ({CARD}) => CARD.confirmPinChangeStatus[id],
  );
  const confirmPinChangeError = useAppSelector(
    ({CARD}) => CARD.confirmPinChangeError[id],
  );
  const confirmPinChangeErrorRef = useRef(confirmPinChangeError);
  confirmPinChangeErrorRef.current = confirmPinChangeError;
  const [isStaleUri, setStaleUri] = useState(false && !!uri);

  // only loading the iframe with a valid uri / fresh token
  const iframeSrc: string | null = uri && !isStaleUri ? uri : null;

  const goBackToSettingsScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(CardScreens.HOME);
    }
  }, [navigation]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const {data} = JSON.parse(e.nativeEvent.data) as {data: number};
      const statusCode = data;
      dispatch(
        LogActions.debug(
          `Received statusCode ${statusCode} (${
            StatusTextMap[statusCode] || 'Unknown'
          }) while resetting PIN for card ${id}.`,
        ),
      );

      switch (statusCode) {
        case StatusCodes.SUCCESS:
          dispatch(
            LogActions.info(
              `Successfully submitted PIN change request for card ${id}, waiting for confirmation.`,
            ),
          );
          dispatch(CardEffects.startConfirmPinChange(id));
          break;

        case StatusCodes.TOKEN_CHANGED:
          dispatch(
            LogActions.debug(
              `Token changed while resetting PIN for card ${id}.`,
            ),
          );
          setStaleUri(true);
          break;

        default:
          dispatch(
            LogActions.debug(
              `Failed to reset PIN for card ${id} with status code (${statusCode}): ${
                StatusTextMap[statusCode] || 'Unknown status code'
              }`,
            ),
          );
          dispatch(
            AppActions.showBottomNotificationModal({
              type: 'error',
              title: 'Reset Failed',
              message: `status code (${statusCode}): ${
                StatusTextMap[statusCode] || 'Unknown status code'
              }`,
              enableBackdropDismiss: false,
              actions: [
                {
                  text: 'OK',
                  action: () => {
                    goBackToSettingsScreen();
                  },
                },
              ],
            }),
          );
          break;
      }
    } catch (err) {
      let errMsg = '';
      if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      dispatch(
        LogActions.error(
          `An error occurred while resetting PIN for card ${id}: ${errMsg}`,
        ),
      );
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: 'Error',
          message: 'An unexpected error occurred. Please try again later.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                goBackToSettingsScreen();
              },
            },
          ],
        }),
      );
    }
  };

  useEffect(() => {
    return () => {
      // since tokens expire, reset the data on unmount
      dispatch(CardActions.resetPinChangeRequestInfo(id));
    };
  }, [dispatch, id]);

  useEffect(() => {
    // token is persisted somehow from a previous fetch, clear it so we can fetch a new one
    if (isStaleUri) {
      dispatch(CardActions.resetPinChangeRequestInfo(id));
      setStaleUri(false);
      return;
    }

    // fetching a fresh token on mount
    if (!uri) {
      dispatch(CardEffects.startFetchPinChangeRequestInfo(id));
      return;
    }
  }, [dispatch, id, isStaleUri, uri]);

  useEffect(() => {
    if (fetchUriStatus === 'failed') {
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: 'Error',
          message:
            'Unable to fetch PIN reset request token. Please try again later.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                goBackToSettingsScreen();
                dispatch(CardActions.resetPinChangeRequestInfo(id));
              },
            },
          ],
        }),
      );
    }
  }, [dispatch, goBackToSettingsScreen, fetchUriStatus, id]);

  useEffect(() => {
    if (confirmPinChangeStatus === 'failed') {
      dispatch(
        LogActions.error(`Failed to confirm PIN change for card ${id}.`),
      );
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'error',
          title: 'Error',
          message:
            confirmPinChangeErrorRef.current ||
            'An unexpected error occurred. Please try again later.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                goBackToSettingsScreen();
              },
            },
          ],
        }),
      );

      goBackToSettingsScreen();
    } else if (confirmPinChangeStatus === 'success') {
      const clearStatus = () =>
        dispatch(CardActions.confirmPinChangeStatusUpdated(id, null));

      dispatch(
        LogActions.info(`Successfully confirmed PIN change for card ${id}.`),
      );
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'success',
          title: 'Reset Success',
          message: 'PIN was successfully reset.',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => clearStatus(),
            },
          ],
          onBackdropDismiss: () => clearStatus(),
        }),
      );

      goBackToSettingsScreen();
    }
  }, [dispatch, goBackToSettingsScreen, confirmPinChangeStatus, id]);

  return (
    <>
      {iframeSrc ? (
        <WebView
          automaticallyAdjustContentInsets
          originWhitelist={['*']}
          javaScriptEnabled={true}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={`(() => {
              window.addEventListener('message', (event) => {
                const {data, lastEventId, origin, ports} = event;

                /**
                 * 1) RNWV.postMessage only accepts strings
                 * 2) event.toString is overloaded so we can't just stringify event, we must reconstruct it as a new object
                 * 3) event.source will not stringify, so don't include it
                 */
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  data,
                  lastEventId,
                  origin,
                  ports,
                }));
              });
            })();`}
          source={{
            baseUrl: BASE_BITPAY_URLS[network],
            html: `
                <!DOCTYPE html>
                  <html style="margin: 0; padding: 0;">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <style>
                      .iframe {
                        border: 0;
                        height: 500px;
                        opacity: 1;
                        transition: 200ms ease;
                        width: 100%;
                        min-height: 300px;
                      }
                    </style>
                  </head>
                  <body>
                    <iframe src="${iframeSrc}" class="iframe" />
                  </body>
                </html>
              `,
          }}
        />
      ) : (
        <SpinnerWrapper>
          <Spinner size={78} />
        </SpinnerWrapper>
      )}
    </>
  );
};

export default ResetPinScreen;
