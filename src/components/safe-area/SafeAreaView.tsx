import React from 'react';
import {Platform, SafeAreaView as NativeSafeAreaView} from 'react-native';
import {SafeAreaView as ContextSafeAreaView} from 'react-native-safe-area-context';

type Props = React.ComponentProps<typeof NativeSafeAreaView>;

/**
 * Drop-in replacement for the react-native core SafeAreaView.
 *
 * On iOS the core component pads all four edges, including the bottom one.
 * That clips scrollable content above the home indicator and leaves a blank
 * strip at the bottom of the screen. Here the bottom inset is excluded; fixed
 * bottom CTAs add their own inset (see CtaContainerAbsolute).
 */
export const SafeAreaView = React.forwardRef<
  React.ComponentRef<typeof NativeSafeAreaView>,
  Props
>((props, ref) =>
  Platform.OS === 'ios' ? (
    <ContextSafeAreaView
      ref={ref as any}
      edges={['top', 'left', 'right']}
      {...props}
    />
  ) : (
    <NativeSafeAreaView ref={ref} {...props} />
  ),
);
SafeAreaView.displayName = 'SafeAreaView';

export default SafeAreaView;
