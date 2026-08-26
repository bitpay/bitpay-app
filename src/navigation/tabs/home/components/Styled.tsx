import React from 'react';
import {StyleSheet, View, ViewProps} from 'react-native';
import {useTheme} from '../../../../contexts';
import {H5, H7} from '../../../../components/styled/Text';
import {Black, Slate, White} from '../../../../styles/colors';

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    marginHorizontal: 12,
  },
  headerLeftContainer: {
    flexGrow: 1,
  },
  homeSectionSubTitle: {
    fontSize: 16,
  },
  homeSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    marginHorizontal: 12,
  },
});

export const HeaderContainer = React.forwardRef<
  View,
  ViewProps & {children?: React.ReactNode}
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerContainer, style]} {...rest} />
));
HeaderContainer.displayName = 'HeaderContainer';

export const HeaderLeftContainer = React.forwardRef<
  View,
  ViewProps & {children?: React.ReactNode}
>(({style, ...rest}, ref) => (
  <View ref={ref} style={[styles.headerLeftContainer, style]} {...rest} />
));
HeaderLeftContainer.displayName = 'HeaderLeftContainer';

export const HeaderButtonContainer = React.forwardRef<
  View,
  ViewProps & {children?: React.ReactNode}
>((props, ref) => <View ref={ref} {...props} />);
HeaderButtonContainer.displayName = 'HeaderButtonContainer';

export const HomeSectionSubtext = React.forwardRef<
  React.ComponentRef<typeof H7>,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[{color: theme.dark ? Slate : Black}, style]}
      {...rest}
    />
  );
});
HomeSectionSubtext.displayName = 'HomeSectionSubtext';

export const HomeSectionTitle = React.forwardRef<
  React.ComponentRef<typeof H5>,
  React.ComponentProps<typeof H5>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H5
      ref={ref}
      style={[
        {color: theme.dark ? White : Black},
        styles.homeSectionTitle,
        style,
      ]}
      {...rest}
    />
  );
});
HomeSectionTitle.displayName = 'HomeSectionTitle';

export const HomeSectionSubTitle = React.forwardRef<
  React.ComponentRef<typeof HomeSectionTitle>,
  React.ComponentProps<typeof HomeSectionTitle>
>(({style, ...rest}, ref) => (
  <HomeSectionTitle
    ref={ref}
    style={[styles.homeSectionSubTitle, style]}
    {...rest}
  />
));
HomeSectionSubTitle.displayName = 'HomeSectionSubTitle';

export const SectionHeaderContainer = React.forwardRef<
  View,
  ViewProps & {justifyContent?: string; children?: React.ReactNode}
>(({justifyContent, style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[
      styles.sectionHeaderContainer,
      {justifyContent: (justifyContent || 'flex-start') as any},
      style,
    ]}
    {...rest}
  />
));
SectionHeaderContainer.displayName = 'SectionHeaderContainer';

export const CarouselItemContainer = React.forwardRef<
  View,
  ViewProps & {children?: React.ReactNode}
>((props, ref) => <View ref={ref} {...props} />);
CarouselItemContainer.displayName = 'CarouselItemContainer';

export const BoxShadow = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 5,
};
