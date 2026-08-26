import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedbackProps,
  View,
  ViewStyle,
} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTheme} from '../../../../contexts';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {BaseText, Link} from '../../../../components/styled/Text';
import {HomeSectionTitle} from './Styled';
import {
  Action,
  LightBlue,
  Midnight,
  Slate30,
  SlateDark,
  White,
} from '../../../../styles/colors';
import ChevronRightSvg from './ChevronRightSvg';

interface HomeRowProps {
  title?: string | undefined;
  action?: string | undefined;
  onActionPress?: TouchableWithoutFeedbackProps['onPress'];
  style?: StyleProp<ViewStyle>;
  label?: string;
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  homeRowContainer: {
    marginBottom: 10,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 0,
    marginRight: parseInt(ScreenGutter, 10),
    marginBottom: 0,
    marginLeft: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  homeSectionTitleContainer: {
    marginRight: 8,
    flexShrink: 1,
  },
  headerLinkContainer: {
    marginLeft: 'auto',
    paddingTop: 4,
    paddingRight: 10,
    paddingBottom: 4,
    paddingLeft: 12,
    borderRadius: 50,
  },
  headerLink: {
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'capitalize',
  },
  headerLabel: {
    fontWeight: '400',
    fontSize: 12,
  },
  headerLabelContainer: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 50,
    marginLeft: 0,
  },
  headerLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
});

const HomeRowContainer: React.FC<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}> = ({style, children}) => (
  <View style={[styles.homeRowContainer, style]}>{children}</View>
);

const Header: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.header}>{children}</View>
);

const HeaderLeft: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.headerLeft}>{children}</View>
);

const HomeSectionTitleContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.homeSectionTitleContainer}>{children}</View>;

const HeaderLinkContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.headerLinkContainer,
        {backgroundColor: theme.dark ? Midnight : LightBlue},
      ]}>
      {children}
    </View>
  );
};

const HeaderLink: React.FC<React.ComponentProps<typeof Link>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <Link
      style={[styles.headerLink, {color: theme.dark ? White : Action}, style]}
      {...rest}
    />
  );
};

const HeaderLabel: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.headerLabel,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const HeaderLabelContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.headerLabelContainer,
        {borderColor: theme.dark ? SlateDark : Slate30},
      ]}>
      {children}
    </View>
  );
};

const HeaderLinkContent: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.headerLinkContent}>{children}</View>;

const HomeSection: React.FC<HomeRowProps> = props => {
  const {title, action, onActionPress, children, style, label} = props;

  return (
    <HomeRowContainer style={style}>
      {title ? (
        <Header>
          <HeaderLeft>
            <HomeSectionTitleContainer>
              <HomeSectionTitle>{title}</HomeSectionTitle>
            </HomeSectionTitleContainer>
            {label ? (
              <HeaderLabelContainer>
                <HeaderLabel>{label}</HeaderLabel>
              </HeaderLabelContainer>
            ) : null}
          </HeaderLeft>
          {action ? (
            <HeaderLinkContainer>
              <TouchableOpacity
                style={{flexDirection: 'row', alignItems: 'center', gap: 7}}
                activeOpacity={ActiveOpacity}
                onPress={onActionPress}>
                <HeaderLinkContent>
                  <HeaderLink>{action}</HeaderLink>
                  <ChevronRightSvg />
                </HeaderLinkContent>
              </TouchableOpacity>
            </HeaderLinkContainer>
          ) : null}
        </Header>
      ) : null}
      {children}
    </HomeRowContainer>
  );
};

export default HomeSection;
