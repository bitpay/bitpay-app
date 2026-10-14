import {Theme} from '@react-navigation/native';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
  ViewProps,
} from 'react-native';
import {useTheme} from '../../../../../contexts';
import BoxInput from '../../../../../components/form/BoxInput';
import {HEIGHT, WIDTH} from '../../../../../components/styled/Containers';
import {
  BaseText,
  H4,
  Link,
  Paragraph,
} from '../../../../../components/styled/Text';
import {
  Black,
  Cloud,
  Feather,
  LightBlack,
  NeutralSlate,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

export const horizontalPadding = 20;

export const getMastheadGradient = (theme: Theme) => {
  return theme.dark
    ? [theme.colors.background, '#151515']
    : ['rgba(245, 247, 248, 0)', NeutralSlate];
};

const styles = StyleSheet.create({
  listItemTouchableHighlight: {
    paddingRight: horizontalPadding,
  },
  categoryItemTouchableHighlight: {
    paddingLeft: horizontalPadding,
  },
  screenContainer: {
    flex: 1,
  },
  sectionContainer: {
    width: '100%',
    paddingHorizontal: horizontalPadding,
  },
  sectionHeaderContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderButton: {
    marginTop: 38,
    marginBottom: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 18,
    textAlign: 'left',
    marginBottom: 16,
    marginTop: 40,
    flexGrow: 1,
    fontWeight: '500',
  },
  sectionDivider: {
    alignSelf: 'center',
    borderBottomWidth: 1,
    marginHorizontal: horizontalPadding,
    marginVertical: 20,
    marginTop: 40,
    width: WIDTH - horizontalPadding * 2,
  },
  searchBox: {
    width: WIDTH - horizontalPadding * 2,
    fontSize: 16,
    position: 'relative',
  },
  searchResults: {
    minHeight: HEIGHT - 300,
  },
  noResultsImgContainer: {
    margin: 40,
  },
  noResultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: HEIGHT - 300,
    paddingTop: 20,
  },
  noResultsHeader: {
    fontSize: 17,
  },
  navIconButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    height: 40,
    width: 40,
    overflow: 'hidden',
  },
  billOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    marginTop: -30,
  },
  billOptionLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: -10,
  },
  field: {
    borderRadius: 4,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 5,
    minHeight: 43,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.75,
  },
});

export const ListItemTouchableHighlight = React.forwardRef<
  React.ComponentRef<typeof TouchableHighlight>,
  TouchableHighlightProps
>(({style, ...rest}, ref) => (
  <TouchableHighlight
    ref={ref}
    style={[styles.listItemTouchableHighlight, style]}
    {...rest}
  />
));
ListItemTouchableHighlight.displayName = 'ListItemTouchableHighlight';

export const CategoryItemTouchableHighlight = React.forwardRef<
  React.ComponentRef<typeof TouchableHighlight>,
  TouchableHighlightProps
>(({style, ...rest}, ref) => (
  <ListItemTouchableHighlight
    ref={ref}
    style={[styles.categoryItemTouchableHighlight, style]}
    {...rest}
  />
));
CategoryItemTouchableHighlight.displayName = 'CategoryItemTouchableHighlight';

export const ScreenContainer = React.forwardRef<
  React.ComponentRef<typeof SafeAreaView>,
  React.ComponentProps<typeof SafeAreaView>
>(({style, ...rest}, ref) => (
  <SafeAreaView ref={ref} style={[styles.screenContainer, style]} {...rest} />
));
ScreenContainer.displayName = 'ScreenContainer';

export const SectionContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.sectionContainer, style]} {...rest} />
  ),
);
SectionContainer.displayName = 'SectionContainer';

export const SectionSpacer = React.forwardRef<
  View,
  ViewProps & {height?: number}
>(({height, style, ...rest}, ref) => (
  <View ref={ref} style={[{height: height || 30}, style]} {...rest} />
));
SectionSpacer.displayName = 'SectionSpacer';

export const SectionHeaderContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.sectionHeaderContainer, style]} {...rest} />
  ),
);
SectionHeaderContainer.displayName = 'SectionHeaderContainer';

export const SectionHeaderButton = React.forwardRef<
  React.ComponentRef<typeof Link>,
  React.ComponentProps<typeof Link>
>(({style, ...rest}, ref) => (
  <Link ref={ref} style={[styles.sectionHeaderButton, style]} {...rest} />
));
SectionHeaderButton.displayName = 'SectionHeaderButton';

export const SectionHeader = React.forwardRef<
  React.ComponentRef<typeof BaseText>,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[{color: theme.dark ? White : Black}, styles.sectionHeader, style]}
      {...rest}
    />
  );
});
SectionHeader.displayName = 'SectionHeader';

export const SectionDivider = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.sectionDivider,
          {borderBottomColor: theme.dark ? LightBlack : Cloud},
          style,
        ]}
        {...rest}
      />
    );
  },
);
SectionDivider.displayName = 'SectionDivider';

export const SearchBox = React.forwardRef<
  React.ComponentRef<typeof BoxInput>,
  React.ComponentProps<typeof BoxInput>
>(({style, ...rest}, ref) => (
  <BoxInput ref={ref} style={[styles.searchBox, style]} {...rest} />
));
SearchBox.displayName = 'SearchBox';

export const SearchResults = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.searchResults, style]} {...rest} />
  ),
);
SearchResults.displayName = 'SearchResults';

export const NoResultsImgContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.noResultsImgContainer, style]} {...rest} />
  ),
);
NoResultsImgContainer.displayName = 'NoResultsImgContainer';

export const NoResultsContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.noResultsContainer, style]} {...rest} />
  ),
);
NoResultsContainer.displayName = 'NoResultsContainer';

export const NoResultsHeader = React.forwardRef<
  React.ComponentRef<typeof H4>,
  React.ComponentProps<typeof H4>
>(({style, ...rest}, ref) => (
  <H4 ref={ref} style={[styles.noResultsHeader, style]} {...rest} />
));
NoResultsHeader.displayName = 'NoResultsHeader';

export const NavIconButtonContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.navIconButtonContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

export const BillOption = React.forwardRef<
  View,
  ViewProps & {isLast?: boolean}
>(({isLast, style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <View
      ref={ref}
      style={[
        styles.billOption,
        {borderBottomColor: theme.dark ? SlateDark : Slate30},
        isLast ? styles.billOptionLast : null,
        style,
      ]}
      {...rest}
    />
  );
});
BillOption.displayName = 'BillOption';

export interface HideableViewProps {
  show: boolean;
}
export const HideableView = React.forwardRef<
  View,
  ViewProps & HideableViewProps
>(({show, style, ...rest}, ref) => (
  <View
    ref={ref}
    style={[{display: show ? 'flex' : 'none'}, style]}
    {...rest}
  />
));
HideableView.displayName = 'HideableView';

export const Field = React.forwardRef<View, ViewProps & {disabled?: boolean}>(
  ({disabled, style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.field,
          {
            backgroundColor: !disabled || theme.dark ? 'transparent' : Slate10,
            borderColor: theme.dark ? SlateDark : Slate30,
          },
          style,
        ]}
        {...rest}
      />
    );
  },
);
Field.displayName = 'Field';

export const FieldGroup = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <View ref={ref} style={[styles.fieldGroup, style]} {...rest} />
  ),
);
FieldGroup.displayName = 'FieldGroup';

export const FieldLabel = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[
        {color: theme.dark ? Feather : LightBlack},
        styles.fieldLabel,
        style,
      ]}
      {...rest}
    />
  );
});
FieldLabel.displayName = 'FieldLabel';

export const FieldValue = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[{color: theme.dark ? Slate : SlateDark}, style]}
      {...rest}
    />
  );
});
FieldValue.displayName = 'FieldValue';
