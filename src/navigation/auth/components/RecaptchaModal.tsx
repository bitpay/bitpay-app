import React, {useImperativeHandle, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';
import {View} from 'react-native';
import Modal from 'react-native-modal';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import {HEIGHT, WIDTH} from '../../../components/styled/Containers';
import {Action, NeutralSlate, Slate} from '../../../styles/colors';

const RECAPTCHA_ID = 'bp-recaptcha';

export interface CaptchaRef {
  reset: (...args: any[]) => any;
}

interface RecaptchaModalProps {
  isVisible: boolean;
  sitekey: string;
  baseUrl: string;
  captchaRef?: React.RefObject<CaptchaRef>;
  onSubmit?: (gCaptchaResponse: string) => any;
  onCancel?: () => any;
  onExpired?: () => any;
  onError?: (error: any) => any;
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    padding: 0,
  },
  wrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.3)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

export const RecaptchaModal = React.forwardRef<CaptchaRef, RecaptchaModalProps>(
  (props, ref) => {
    const {isVisible} = props;
    const {baseUrl, sitekey, onSubmit, onCancel, onExpired, onError} = props;
    const [gCaptchaResponse, setGCaptchaResponse] = useState<string>('');
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => {
      return {
        reset: () => {
          webviewRef.current?.injectJavaScript(`
        window.grecaptcha.reset('${RECAPTCHA_ID}');
      `);
        },
      };
    });

    const onMessage = (e: WebViewMessageEvent) => {
      try {
        const {message, data} = JSON.parse(e.nativeEvent.data || '{}');

        switch (message) {
          case 'response':
            setGCaptchaResponse(data);
            webviewRef.current?.injectJavaScript(`
            document.querySelector('#submit-captcha').disabled = false;
          `);
            break;
          case 'expired':
            onExpired?.();
            webviewRef.current?.injectJavaScript(`
            document.querySelector('#submit-captcha').disabled = true;
          `);
            break;
          case 'submit':
            onSubmit?.(gCaptchaResponse);
            break;
          case 'cancel':
            onCancel?.();
            break;
          case 'error':
            onError?.(data);
            break;
        }
      } catch (err) {
        onError?.(err);
      }
    };

    return (
      <Modal
        useNativeDriver
        deviceHeight={HEIGHT}
        deviceWidth={WIDTH}
        isVisible={isVisible}
        style={styles.modal}>
        <View style={styles.wrapper}>
          <WebView
            ref={webviewRef}
            style={styles.webview}
            onMessage={onMessage}
            automaticallyAdjustContentInsets
            originWhitelist={['*']}
            mixedContentMode={'always'}
            javaScriptEnabled={true}
            source={{
              baseUrl,
              html: `
              <!DOCTYPE html>
              <html style="margin: 0; padding: 0;">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="initial-scale=1.0">
                  <meta http-equiv="X-UA-Compatible" content="ie=edge">
                  <style>
                    html {}

                    body {
                      bottom: 0px;
                      margin: 0;
                      padding: 0;
                      left: 0px;
                      position: absolute;
                      right: 0px;
                      top: 0px;
                    }

                    button {
                      border: 0;
                      border-radius: 4px;
                      margin-bottom: 12px;
                      padding: 16px;
                      width: 100%;
                    }

                    button:focus {
                      outline: 0;
                    }

                    button.primary {
                      background: ${Action};
                      color: white; 
                    }

                    button.secondary {
                      background: ${NeutralSlate};
                      color: ${Action}; 
                    }

                    button:disabled {
                      background: ${Slate};
                    }

                    #flex-container {
                      display: flex;
                      height: 100%;
                    }

                    #captcha-form {
                      margin: auto;
                    }

                    #${RECAPTCHA_ID} {
                      margin-bottom: 16px;
                    }
                  </style>
                  <script src="https://www.google.com/recaptcha/api.js?render=explicit&onload=onCaptchaLoad"></script>
                  <script type="text/javascript"> 
                    window.onCaptchaLoad = () => {
                      window.grecaptcha.render('${RECAPTCHA_ID}', {
                        sitekey: '${sitekey}',

                        callback: (gCaptchaResponse) => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'response',
                            data: gCaptchaResponse,
                          }));
                        },

                        'expired-callback': () => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'expired',
                          }));
                        },

                        'error-callback': (err) => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'error',
                            data: err,
                          }));
                        },
                      });
                    };

                    window.onCaptchaSubmit = () => {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        message: 'submit',
                      }));
                    };

                    window.onCaptchaCancel = () => {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        message: 'cancel',
                      }));
                    };
                  </script> 
                </head>
                <body>
                  <div id="flex-container">
                    <form id="captcha-form">
                      <div id="${RECAPTCHA_ID}"></div>

                      <button id="submit-captcha"
                        class="primary"
                        onclick="onCaptchaSubmit()"
                        type="button"
                        disabled>
                        Submit
                      </button>

                      <button id="cancel-captcha"
                        class="secondary"
                        onclick="onCaptchaCancel()"
                        type="button">
                        Cancel
                      </button>
                    </form>
                  </div>
                </body>
              </html>
            `,
            }}
          />
        </View>
      </Modal>
    );
  },
);

export default RecaptchaModal;
