import React from 'react';
import {
  Platform,
  SafeAreaView as NativeSafeAreaView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  Edge,
  SafeAreaListener,
  SafeAreaView as ContextSafeAreaView,
} from 'react-native-safe-area-context';

type Props = React.ComponentProps<typeof NativeSafeAreaView> & {
  /**
   * iOS only. Edges that get the safe area inset. Defaults to top, left and
   * right. Screens with a fixed bottom CTA that is not inside
   * CtaContainerAbsolute pass ALL_EDGES so the CTA stays above the home
   * indicator.
   */
  edges?: ReadonlyArray<Edge>;
};

const DEFAULT_EDGES: ReadonlyArray<Edge> = ['top', 'left', 'right'];
export const ALL_EDGES: ReadonlyArray<Edge> = [
  'top',
  'left',
  'right',
  'bottom',
];

// Style keys that place the view inside its parent. They go on the outer
// wrapper so the extra view does not change the layout of the screen.
const OUTER_STYLE_KEYS: ReadonlyArray<keyof ViewStyle> = [
  'display',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'start',
  'end',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'aspectRatio',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginEnd',
  'marginHorizontal',
  'marginVertical',
];

const splitStyle = (style: Props['style']) => {
  const flat = (StyleSheet.flatten(style) || {}) as ViewStyle;
  // `flex: undefined` overrides the default `flex: 1` of SafeAreaListener.
  const outer: ViewStyle = {flex: undefined};
  const inner: ViewStyle = {};
  (Object.keys(flat) as Array<keyof ViewStyle>).forEach(key => {
    const target = OUTER_STYLE_KEYS.includes(key) ? outer : inner;
    (target as any)[key] = flat[key];
  });
  return {outer, inner};
};

const noop = () => {};

/**
 * Drop-in replacement for the react-native core SafeAreaView.
 *
 * On iOS the core component pads all four edges, including the bottom one.
 * That clips scrollable content above the home indicator and leaves a blank
 * strip at the bottom of the screen. Here the bottom inset is excluded; fixed
 * bottom CTAs add their own inset (see CtaContainerAbsolute).
 *
 * The react-native-safe-area-context SafeAreaView applies the insets of its
 * nearest native provider, not the insets at its own position. Under a stack
 * header that adds the status bar height a second time. SafeAreaListener
 * renders a native provider right here, so the insets are measured where the
 * view is (0 at the top under a header, like the core component), without
 * changing the insets that useSafeAreaInsets() returns to the children.
 */
export const SafeAreaView = React.forwardRef<
  React.ComponentRef<typeof NativeSafeAreaView>,
  Props
>(({style, edges = DEFAULT_EDGES, ...props}, ref) => {
  if (Platform.OS !== 'ios') {
    return <NativeSafeAreaView ref={ref} style={style} {...props} />;
  }
  const {outer, inner} = splitStyle(style);
  return (
    <SafeAreaListener style={outer} onChange={noop}>
      <ContextSafeAreaView
        ref={ref as any}
        edges={edges}
        style={[styles.fill, inner]}
        {...props}
      />
    </SafeAreaListener>
  );
});
SafeAreaView.displayName = 'SafeAreaView';

const styles = StyleSheet.create({
  fill: {flexGrow: 1, flexShrink: 1},
});

export default SafeAreaView;
