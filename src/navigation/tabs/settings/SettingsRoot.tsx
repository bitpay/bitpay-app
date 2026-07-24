import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {FlashList} from '@shopify/flash-list';
import AngleRight from '../../../../assets/img/angle-right.svg';
import Avatar from '../../../components/avatar/BitPayIdAvatar';
import {
  ActiveOpacity,
  ScreenGutter,
  Setting,
  SettingIcon,
  SettingTitle,
  Hr,
} from '../../../components/styled/Containers';
import {useScrollToTop} from '@react-navigation/native';
import {SettingsScreens, SettingsGroupParamList} from './SettingsGroup';
import {HeaderContainer} from '../../tabs/home/components/Styled';
import {HeaderTitle} from '../../../components/styled/Text';
import TabContainer from '../../tabs/TabContainer';
import {useAppSelector} from '../../../utils/hooks';

export type SettingsListType =
  | 'General'
  | 'Contacts'
  | 'Crypto'
  | 'Wallets & Keys'
  | 'Security'
  | 'External Services'
  | 'Notifications'
  | 'Connections'
  | 'About BitPay';

export type SettingsHomeProps = NativeStackScreenProps<
  SettingsGroupParamList,
  SettingsScreens.SETTINGS_HOME
>;

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
  },
  settingsComponent: {
    flex: 1,
    paddingVertical: 10,
  },
  settingsHomeContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  bitPayIdSettingsLink: {
    height: 'auto',
    marginBottom: 32,
  },
  bitPayIdAvatarContainer: {
    marginRight: parseInt(ScreenGutter, 10),
  },
  bitPayIdUserContainer: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
  },
  bitPayIdSettingTitle: {
    flexGrow: 1,
  },
  bitPayIdUserText: {
    display: 'flex',
    fontSize: 14,
    lineHeight: 19,
  },
});

export const SettingsContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => (
  <SafeAreaView style={[styles.settingsContainer, style]} {...rest} />
);

export const SettingsComponent: React.FC<
  React.ComponentProps<typeof ScrollView>
> = ({style, ...rest}) => (
  <ScrollView style={[styles.settingsComponent, style]} {...rest} />
);

export const SettingsHomeContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.settingsHomeContainer, style]} {...rest} />
);

const BitPayIdSettingsLink: React.FC<React.ComponentProps<typeof Setting>> = ({
  style,
  ...rest
}) => <Setting style={[styles.bitPayIdSettingsLink, style]} {...rest} />;

const BitPayIdAvatarContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.bitPayIdAvatarContainer}>{children}</View>;

const BitPayIdUserContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.bitPayIdUserContainer}>{children}</View>;

const BitPayIdSettingTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <SettingTitle
      style={[styles.bitPayIdSettingTitle, {color: theme.colors.text}]}>
      {children}
    </SettingTitle>
  );
};

const BitPayIdUserText: React.FC<{
  bold?: boolean;
  children?: React.ReactNode;
}> = ({bold, children}) => {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.bitPayIdUserText,
        {
          fontWeight: bold ? '700' : '400',
          color: theme.colors.text,
        },
      ]}>
      {children}
    </Text>
  );
};

const SettingsHome: React.FC<SettingsHomeProps> = ({route, navigation}) => {
  const {redirectTo} = route.params || {};
  const {t} = useTranslation();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const listRef = useRef<FlashList<any>>(null);
  useScrollToTop(listRef);

  const memoizedSettingsConfigs = useMemo(
    () => [
      {
        id: 'General',
        title: t('General'),
      },
      {
        id: 'Contacts',
        title: t('Contacts'),
      },
      {
        id: 'Crypto',
        title: t('Crypto'),
      },
      {
        id: 'Wallets & Keys',
        title: t('Wallets & Keys'),
      },
      {
        id: 'Security',
        title: t('Security'),
      },
      {
        id: 'Notifications',
        title: t('Notifications'),
      },
      {
        id: 'Connections',
        title: t('Connections'),
      },
      {
        id: 'External Services',
        title: t('External Services'),
      },
      {
        id: 'About BitPay',
        title: t('About BitPay'),
      },
    ],
    [t],
  );

  const renderSettingItem = ({
    item,
  }: {
    item: {id: SettingsListType; title: string};
  }) => {
    return (
      <View>
        <Setting
          activeOpacity={ActiveOpacity}
          testID={`settings-${item.id
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}-row`}
          accessibilityLabel={item.title}
          onPress={() => {
            navigation.navigate('SettingsDetails', {
              initialRoute: item.id,
              ...(item.id === 'Connections' ? {redirectTo} : {}),
            });
          }}>
          <SettingTitle>{item.title}</SettingTitle>
          <SettingIcon suffix>
            <AngleRight />
          </SettingIcon>
        </Setting>
        <Hr />
      </View>
    );
  };

  const ListHeaderComponent = () => (
    <BitPayIdSettingsLink
      style={{paddingHorizontal: 15}}
      testID="settings-bitpay-id-profile-row"
      accessibilityLabel="BitPay ID profile"
      onPress={() => {
        if (user) {
          navigation.navigate('BitPayIdProfile');
        } else {
          navigation.navigate('Login');
        }
      }}>
      <BitPayIdAvatarContainer>
        <Avatar size={50} />
      </BitPayIdAvatarContainer>
      {user ? (
        <BitPayIdUserContainer>
          {user.givenName || user.familyName ? (
            <BitPayIdUserText bold>
              {user.givenName} {user.familyName}
            </BitPayIdUserText>
          ) : null}
          <BitPayIdUserText>{user.email}</BitPayIdUserText>
        </BitPayIdUserContainer>
      ) : (
        <BitPayIdSettingTitle>{t('Log In or Sign Up')}</BitPayIdSettingTitle>
      )}
      <SettingIcon suffix>
        <AngleRight />
      </SettingIcon>
    </BitPayIdSettingsLink>
  );

  return (
    <TabContainer>
      <HeaderContainer>
        <HeaderTitle>{t('Settings')}</HeaderTitle>
      </HeaderContainer>
      <SettingsHomeContainer>
        <FlashList
          ref={listRef}
          data={memoizedSettingsConfigs}
          renderItem={renderSettingItem}
          estimatedItemSize={56}
          ListHeaderComponent={ListHeaderComponent}
          contentContainerStyle={{paddingBottom: 100}}
        />
      </SettingsHomeContainer>
    </TabContainer>
  );
};

export default SettingsHome;
