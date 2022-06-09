#import <PassKit/PassKit.h>
#import "RCTPaymentPass.h"
typedef void (^completedPaymentProcessHandler)(PKAddPaymentPassRequest *request);

@interface RCTPaymentPass()<PKAddPaymentPassViewControllerDelegate>
@property (nonatomic, assign) BOOL isRequestIssued;
@property (nonatomic, assign) BOOL isRequestIssuedSuccess;
@property (nonatomic, strong) completedPaymentProcessHandler completionHandler;
@end
@implementation RCTPaymentPass

RCT_EXPORT_METHOD(canAddPaymentPass:(RCTPromiseResolveBlock)resolve
                  rejector:(RCTPromiseRejectBlock)reject) {
  resolve(@([PKAddPassesViewController canAddPasses]));
}

// init native view
RCT_EXPORT_METHOD(startAddPaymentPass:(NSString *)last4 cardHolderName: (NSString *)cardHolderName
resolver:(RCTPromiseResolveBlock)resolve
rejector:(RCTPromiseRejectBlock)reject) {
    if (![PKAddPaymentPassViewController canAddPaymentPass]) {
        NSLog(@"PK Payment not supported");
        reject(@"payment_pass_unsupported", @"Unable to add payment pass, please check you have the correct entitlements", nil);
        return;
    };
    PKAddPaymentPassRequestConfiguration  * passConfig =  [[PKAddPaymentPassRequestConfiguration alloc] initWithEncryptionScheme:PKEncryptionSchemeECC_V2];
    passConfig.primaryAccountSuffix = last4;
    passConfig.cardholderName = cardHolderName;
    passConfig.paymentNetwork = @"MASTERCARD";
    PKAddPaymentPassViewController * paymentPassVC = [[PKAddPaymentPassViewController alloc] initWithRequestConfiguration:passConfig delegate:self];

    dispatch_async(dispatch_get_main_queue(), ^{
        UIApplication *sharedApplication = RCTSharedApplication();
        UIWindow *window = sharedApplication.keyWindow;
        if (window) {
          UIViewController *rootViewController = window.rootViewController;
          if (rootViewController) {
              [rootViewController presentViewController:paymentPassVC animated:YES completion:^{
                // Succeeded
                resolve(nil);
            
              }];
              return;
          }
        }
    });

}
// completion method
RCT_EXPORT_METHOD(completeAddPaymentPass:(NSString *)activationString encryptedPass: (NSString *)encryptedPass pubKey: (NSString *)pubKey ) {
  NSLog(@"LOG completeAddPaymentPass top");
  if (self.isRequestIssued == true){
    NSLog(@"LOG entgered here");
    if (self.isRequestIssuedSuccess == false){
      NSLog(@"FAILED");
    }else{
      NSLog(@"SUCCESS");
    }
    return;
  }
  
  PKAddPaymentPassRequest* request = [[PKAddPaymentPassRequest alloc] init];
  request.activationData = [[NSData alloc] initWithBase64EncodedString:activationString options:0];
  request.encryptedPassData = [[NSData alloc] initWithBase64EncodedString:encryptedPass options:0];
  request.ephemeralPublicKey = [[NSData alloc] initWithBase64EncodedString:pubKey options:0];
  self.completionHandler(request);
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"getPassAndActivation", @"addPaymentPassViewControllerDidFinish"];
}

#pragma mark - PKAddPaymentPassViewControllerDelegate

// get certs and pass to js -> js passes to bitpay -> certs signed -> js calls complete method ^
- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller didFinishAddingPaymentPass:(PKPaymentPass *)pass error:(NSError *)error  {

    [controller dismissViewControllerAnimated:YES completion:nil];
    // TODO: Handle pass
    [self sendEventWithName:@"addPaymentPassViewControllerDidFinish" body:pass];
}

- (void)addPaymentPassViewController:(PKAddPaymentPassViewController *)controller generateRequestWithCertificateChain:(NSArray<NSData *> *)certificates nonce:(NSData *)nonce nonceSignature:(NSData *)nonceSignature completionHandler:(void (^)(PKAddPaymentPassRequest * _Nonnull))handler {
    self.completionHandler = handler;
  
  // the leaf certificate will be the first element of that array and the sub-CA certificate will follow.
   NSString *certificateOfIndexZeroString = [certificates[0] base64EncodedStringWithOptions:0];
   NSString *certificateOfIndexOneString = [certificates[1] base64EncodedStringWithOptions:0];
   NSString *nonceString = [nonce base64EncodedStringWithOptions:0];
   NSString *nonceSignatureString = [nonceSignature base64EncodedStringWithOptions:0];
   
   NSDictionary* dictionary = @{ @"data" :
                                   @{
                                       @"certificateLeaf" : certificateOfIndexZeroString,
                                       @"certificateSubCA" : certificateOfIndexOneString,
                                       @"nonce" : nonceString,
                                       @"nonceSignature" : nonceSignatureString,
                                    }
                               };
  
  
  [self sendEventWithName:@"getPassAndActivation" body:dictionary];
}

RCT_EXPORT_MODULE()

@end
