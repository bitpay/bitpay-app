import React, {useImperativeHandle, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {HEIGHT} from '../../../components/styled/Containers';
import {Action, White} from '../../../styles/colors';

const RECAPTCHA_ID = 'bp-recaptcha';

export interface CaptchaRef {
  reset: (...args: any[]) => any;
}

interface RecaptchaModalProps {
  isVisible: boolean;

  theme?: 'light' | 'dark';

  size?: 'normal' | 'compact' | 'invisible';

  /**
   * The public nocaptcha sitekey. The provided baseUrl must be one of the allowed domains for sitekey in order to function correctly.
   */
  sitekey: string;

  /**
   * The base URL to be used for any relative links in the HTML. This is also used for the origin header with CORS requests made from the WebView.
   * This URL must be one of the allowed domains for the sitekey in order to function correctly.
   */
  baseUrl: string;

  /**
   * Ref to the captcha WebView, giving the parent component access to grecaptcha functions.
   */
  captchaRef?: React.RefObject<CaptchaRef>;
  onResponse?: (gCaptchaResponse: string) => any;
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
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

/**
 * Fullscreen modal that hosts a nocaptcha element in a WebView.
 * Required params: sitekey, baseUrl. Pass a ref to get access to grecaptcha functions from the parent component.
 */
export const RecaptchaModal = React.forwardRef<CaptchaRef, RecaptchaModalProps>(
  (props, ref) => {
    const {
      isVisible,
      theme,
      size,
      baseUrl,
      sitekey,
      onResponse,
      onCancel,
      onExpired,
      onError,
    } = props;
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        webviewRef.current?.injectJavaScript(`
            window.grecaptcha.reset('${RECAPTCHA_ID}');
          `);
      },
    }));

    const onMessage = (e: WebViewMessageEvent) => {
      try {
        const {message, data} = JSON.parse(e.nativeEvent.data || '{}');

        switch (message) {
          case 'response':
            onResponse?.(data);
            break;
          case 'expired':
            onExpired?.();
            webviewRef.current?.injectJavaScript(`
            document.querySelector('#submit-captcha').disabled = true;
          `);
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
      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={isVisible}
        fullscreen={true}
        backdropOpacity={0.85}
        backgroundColor="rgba(0,0,0,.3)"
        enableBackdropDismiss={false}
        onBackdropPress={onCancel ?? (() => {})}
        paddingTop={0}>
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
                      margin-top: 15px;
                      padding: 16px;
                      width: 100%;
                      font-weight: 500;
                      font-size: 16px;
                    }

                    button:focus {
                      outline: 0;
                    }

                    button.secondary {
                      background: transparent;
                      color: ${White}; 
                      border: 1px solid ${Action};
                    }

                    #flex-container {
                      display: flex;
                      height: 100%;
                    }

                    #captcha-form {
                      margin: auto;
                      opacity: 0;
                      transition: all 500ms ease;
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

                        ${theme ? `theme: '${theme}',` : ''}

                        ${size ? `size: '${size}',` : ''}

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

                    window.onCaptchaCancel = () => {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        message: 'cancel',
                      }));
                    };
                    
                    window.onload = () => {
                      document.getElementById('captcha-form').style.opacity = '1';
                    }
                    
                  </script> 
                </head>
                <body>
                  <div id="flex-container">
                    <form id="captcha-form">
                      <div id="${RECAPTCHA_ID}"></div>
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
      </SheetModal>
    );
  },
);

export default RecaptchaModal;
