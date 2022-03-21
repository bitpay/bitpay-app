const fs = require('fs');

const file =
  './node_modules/react-native/React/Views/RCTModalHostViewManager.m';
const content = fs.readFileSync(file, 'utf8');
fs.writeFileSync(
  './node_modules/react-native/React/Views/RCTModalHostViewManager.m',
  content.replace(
    `[[modalHostView reactViewController] presentViewController:viewController
                                                      animated:animated
                                                    completion:completionBlock];`,
    `UIViewController *lastPresentedViewController = modalHostView.reactViewController;
      UIViewController *presentedViewController = nil;


      while (lastPresentedViewController != nil) {
          presentedViewController = lastPresentedViewController;
          lastPresentedViewController = lastPresentedViewController.presentedViewController;
      }


      [presentedViewController presentViewController:viewController
                                                           animated:animated
                                                         completion:completionBlock];`,
  ),
  'utf8',
);
