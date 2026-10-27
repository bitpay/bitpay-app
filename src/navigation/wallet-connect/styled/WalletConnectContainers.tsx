import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView as RNScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewProps,
} from 'react-native';
import {ScreenGutter} from '../../../components/styled/Containers';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  walletConnectContainer: {
    flex: 1,
  },
  scrollView: {
    marginTop: 20,
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 71,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: 250,
  },
  itemTitleTouchableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: '50%',
  },
  itemNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletConnectIconContainer: {
    marginRight: 5,
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  iconContainer: {
    height: 'auto',
    width: 'auto',
    borderRadius: 9,
    overflow: 'hidden',
  },
  walletConnectCtaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingHorizontal: 12,
  },
  noGutter: {
    marginVertical: 0,
    marginHorizontal: -10,
    paddingRight: 5,
  },
});

export const WalletConnectContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.walletConnectContainer, style]} {...rest} />
);

export const ScrollView: React.FC<ScrollViewProps> = ({style, ...rest}) => (
  <RNScrollView style={[styles.scrollView, style]} {...rest} />
);

export const ItemContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.itemContainer, style]} {...rest} />
);

export const ItemTouchableContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.itemContainer, style]} {...rest} />
);

export const ItemTitleContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.itemTitleContainer, style]} {...rest} />
);

export const ItemTitleTouchableContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.itemTitleTouchableContainer, style]}
    {...rest}
  />
);

export const ItemNoteContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.itemNoteContainer, style]} {...rest} />
);

export const ItemNoteTouchableContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.itemNoteContainer, style]} {...rest} />
);

export const WalletConnectIconContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.walletConnectIconContainer, style]} {...rest} />;

export const IconContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.iconContainer, style]} {...rest} />
);

export const WalletConnectCtaContainer: React.FC<
  ViewProps & {platform: string}
> = ({platform, style, ...rest}) => (
  <View
    style={[
      styles.walletConnectCtaContainer,
      platform === 'ios' ? {marginBottom: 10} : null,
      style,
    ]}
    {...rest}
  />
);

export const NoGutter: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.noGutter, style]} {...rest} />
);
