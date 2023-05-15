package com.bitpay.wallet;

import android.app.Activity;
import androidx.annotation.NonNull;
import android.content.Intent;
import java.nio.charset.Charset;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactMethod;

import com.google.android.gms.tapandpay.TapAndPay;
import com.google.android.gms.tapandpay.TapAndPayClient;
import com.google.android.gms.tapandpay.issuer.PushTokenizeRequest;
import com.google.android.gms.tapandpay.issuer.TokenStatus;
import com.google.android.gms.tapandpay.issuer.UserAddress;

import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_ATTESTATION_ERROR;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_INVALID_TOKEN_STATE;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_NO_ACTIVE_WALLET;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_TOKEN_NOT_FOUND;
import static com.google.android.gms.tapandpay.TapAndPayStatusCodes.TAP_AND_PAY_UNAVAILABLE;

public class GooglePushProvisioningModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;
  private Promise requestPaymentPromise = null;
  private static final String TAG = "GooglePayIssuer";
  private static final int REQUEST_CODE_PUSH_TOKENIZE = 3;
  private TapAndPayClient tapAndPayClient;

  @NonNull
  @Override
  public String getName() {
    return "GooglePushProvisioning";
  }

  @Override
  public void initialize() {
    super.initialize();
    // tapAndPayClient = TapAndPay.getClient(getCurrentActivity());
  }

  @ReactMethod
  public void startPushProvision(String opc, String name, String lastFourDigits, Promise promise) {

    GooglePushProvisioningModule self = this;
    Activity activity = this.getCurrentActivity();

    try {

      int cardNetwork = TapAndPay.CARD_NETWORK_MASTERCARD;
      int tokenServiceProvider = TapAndPay.TOKEN_PROVIDER_MASTERCARD;

        UserAddress userAddress =
          UserAddress.newBuilder()
            .setName(name)
            .setAddress1("")
            .setLocality("")
            .setAdministrativeArea("")
            .setCountryCode("USA")
            .setPostalCode("")
            .setPhoneNumber("")
            .build();

        PushTokenizeRequest pushTokenizeRequest =
          new PushTokenizeRequest.Builder()
            .setOpaquePaymentCard(opc.getBytes())
            .setNetwork(cardNetwork)
            .setTokenServiceProvider(tokenServiceProvider)
            .setDisplayName(name)
            .setLastDigits(lastFourDigits)
            .setUserAddress(userAddress)
            .build();

        if (tapAndPayClient == null) {
          return;
        }

        tapAndPayClient.pushTokenize(activity, pushTokenizeRequest, REQUEST_CODE_PUSH_TOKENIZE);
        self.requestPaymentPromise = promise;

    } catch(Exception e) {
      promise.reject("TAP_AND_PAY_START_PUSH_PROVISION_ERROR");
    }
  }

  private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {

      @Override
      public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {

        if (requestCode == REQUEST_CODE_PUSH_TOKENIZE) {
          switch (resultCode) {
            case TAP_AND_PAY_ATTESTATION_ERROR:
              requestPaymentPromise.reject("TAP_AND_PAY_ATTESTATION_ERROR");
              break;

            case Activity.RESULT_OK:
                requestPaymentPromise.resolve("RESULT OK");
                break;

            case Activity.RESULT_CANCELED:
                requestPaymentPromise.reject("CANCELED");
                break;

            case TAP_AND_PAY_INVALID_TOKEN_STATE:
                requestPaymentPromise.reject("TAP_AND_PAY_INVALID_TOKEN_STATE");
                break;

            case TAP_AND_PAY_NO_ACTIVE_WALLET:
                  requestPaymentPromise.reject("TAP_AND_PAY_NO_ACTIVE_WALLET");
                  break;

            case TAP_AND_PAY_TOKEN_NOT_FOUND:
                requestPaymentPromise.reject("TAP_AND_PAY_TOKEN_NOT_FOUND");
                break;

            case TAP_AND_PAY_UNAVAILABLE:
              requestPaymentPromise.reject("TAP_AND_PAY_UNAVAILABLE");
              break;

            default:
              requestPaymentPromise.resolve("DEFAULT");

          }
        }
      }
    };

    public GooglePushProvisioningModule(ReactApplicationContext reactContext) {
      super(reactContext);
      this.reactContext = reactContext;
      reactContext.addActivityEventListener(activityEventListener);
    }

}
