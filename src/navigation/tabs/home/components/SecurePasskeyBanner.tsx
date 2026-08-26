import React from 'react';
import {CommonActions, useNavigation} from '@react-navigation/native';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {ActiveOpacity} from '@components/base/TouchableOpacity';
import SecurePasskeyIcon from '../../../../../assets/img/secure-passkey.svg';
import ArrowRightSvg from './ArrowRightSvg';
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {
  CharcoalBlack,
  LightBlack,
  Slate30,
  White,
} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../../navigation/tabs/TabsStack';
import {SecurityScreens} from '../../../../navigation/tabs/settings/security/SecurityGroup';

const styles = StyleSheet.create({
  passkeyBannerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 100,
    paddingTop: 16,
    paddingRight: 35,
    paddingBottom: 16,
    paddingLeft: 76,
    marginTop: 8,
    marginHorizontal: parseInt(ScreenGutter, 10),
    marginBottom: 22,
    position: 'relative',
    gap: 8,
  },
  passkeyBannerContainerTitle: {
    fontStyle: 'normal',
    fontSize: 12,
    color: '#335cff',
    marginLeft: 26,
    textTransform: 'uppercase',
  },
  passkeyBannerDescription: {
    fontSize: 16,
    marginLeft: 26,
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
  },
  iconArrowRight: {
    position: 'absolute',
    right: 16,
  },
});

const PasskeyBannerContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.passkeyBannerContainer,
        {
          backgroundColor: theme.dark ? CharcoalBlack : White,
          borderColor: theme.dark ? LightBlack : Slate30,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const PasskeyBannerContainerTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => (
  <BaseText style={styles.passkeyBannerContainerTitle}>{children}</BaseText>
);

const PasskeyBannerDescription: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <BaseText style={styles.passkeyBannerDescription}>{children}</BaseText>;

const IconContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.iconContainer}>{children}</View>
);

const IconArrowRight: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.iconArrowRight}>{children}</View>
);

const SecurePasskeyBanner: React.FC = () => {
  const navigation = useNavigation();
  return (
    <PasskeyBannerContainer
      activeOpacity={ActiveOpacity}
      testID="home-secure-passkey-banner-button"
      accessibilityLabel="Create a passkey to secure your account"
      onPress={() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: RootStacks.TABS,
                params: {screen: TabsScreens.SETTINGS},
              },
              {
                name: SecurityScreens.PASSKEYS,
                params: {},
              },
            ],
          }),
        );
      }}>
      <PasskeyBannerContainerTitle>
        Secure your account
      </PasskeyBannerContainerTitle>
      <PasskeyBannerDescription>Create a Passkey</PasskeyBannerDescription>
      <IconContainer>
        <SecurePasskeyIcon />
      </IconContainer>
      <IconArrowRight>
        <ArrowRightSvg />
      </IconArrowRight>
    </PasskeyBannerContainer>
  );
};

export default SecurePasskeyBanner;
