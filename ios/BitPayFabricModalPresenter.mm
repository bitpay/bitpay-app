#import "BitPayFabricModalPresenter.h"

#import <React/UIView+React.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

using FabricPresent = void (*)(UIView *, SEL, UIViewController *, BOOL, void (^)(void));
static FabricPresent originalFabricPresent;

static void BitPayPresentFabricModal(
    UIView *hostView,
    SEL selector,
    UIViewController *modalViewController,
    BOOL animated,
    void (^completion)(void))
{
  UIViewController *rootController = [hostView reactViewController];
  UIViewController *controller = rootController;
  UIViewController *presentedController = controller.presentedViewController;
  while (presentedController != nil && !presentedController.isBeingDismissed) {
    controller = presentedController;
    presentedController = controller.presentedViewController;
  }

  if (controller == rootController) {
    originalFabricPresent(hostView, selector, modalViewController, animated, completion);
    return;
  }

  // Preserve RN's animation/completion contract, but present a sibling modal
  // from the current top controller instead of an already-presenting root.
  [controller presentViewController:modalViewController animated:animated completion:completion];
}

void BitPayInstallFabricModalPresenter(void)
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    // This selector is the RN 0.87 Fabric modal presentation boundary. Keep
    // the check explicit so a future RN change cannot silently disable the fix.
    Class hostClass = NSClassFromString(@"RCTModalHostViewComponentView");
    SEL selector = @selector(presentViewController:animated:completion:);
    Method method = class_getInstanceMethod(hostClass, selector);
    if (method == nullptr || method_getNumberOfArguments(method) != 5) {
      [NSException raise:NSInternalInconsistencyException
                  format:@"BitPay Fabric modal presenter is incompatible with this React Native build"];
    }

    originalFabricPresent = reinterpret_cast<FabricPresent>(
        method_setImplementation(method, reinterpret_cast<IMP>(BitPayPresentFabricModal)));
  });
}
