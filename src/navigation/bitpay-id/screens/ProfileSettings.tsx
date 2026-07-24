import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../../contexts';
import {
  SafeAreaView,
  ScrollView as RNScrollView,
  ScrollViewProps,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import Avatar from '../../../components/avatar/BitPayIdAvatar';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {BaseText, H3, H5, Paragraph} from '../../../components/styled/Text';
import {
  Action,
  LightBlack,
  LightBlue,
  NeutralSlate,
  Slate,
  SlateDark,
} from '../../../styles/colors';
import {BitpayIdScreens, BitpayIdGroupParamList} from '../BitpayIdGroup';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useNavigation} from '@react-navigation/native';
import ChevronRight from '../components/ChevronRight';
import {BitPayIdEffects} from '../../../store/bitpay-id';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {SectionSpacer} from '../../tabs/shop/components/styled/ShopTabComponents';
import {SecurityScreens} from '../../tabs/settings/security/SecurityGroup';
import {SumSubSelectors} from '../../../store/sumsub';
import {KycUiState} from '../../../store/sumsub/sumsub.selectors';
import IconHomeIdentityVerified from '../../../../assets/img/home_identity_verified.svg';
import AngleRight from '../../../../assets/img/settings-arrow-right.svg';

type ProfileProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.PROFILE
>;

const styles = StyleSheet.create({
  profileSettingsScreenContainer: {
    flex: 1,
  },
  scrollView: {
    marginHorizontal: parseInt(ScreenGutter, 10),
    paddingBottom: 100,
  },
  profileInfoContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 50,
    marginHorizontal: 0,
    marginBottom: 36,
    borderRadius: 12,
    padding: 20,
    paddingBottom: 25,
  },
  avatarContainer: {
    marginTop: -58,
    paddingBottom: 18,
  },
  statusPill: {
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusPillText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  settingsSection: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  settingsItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
  },
  settingsSectionBody: {
    flexShrink: 1,
    paddingRight: 40,
    flexGrow: 1,
  },
  settingsSectionHeader: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 10,
  },
  settingsSectionDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
});

const ProfileSettingsScreenContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView
    style={[styles.profileSettingsScreenContainer, style]}
    {...rest}
  />
);

const ScrollView = ({style, ...rest}: ScrollViewProps) => (
  <RNScrollView style={[styles.scrollView, style]} {...rest} />
);

const ProfileInfoContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.profileInfoContainer,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const AvatarContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.avatarContainer, style]} {...rest} />
);

const EmailAddress = React.forwardRef<
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

const StatusPill = ({
  style,
  ...rest
}: React.ComponentProps<typeof TouchableOpacity>) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.statusPill,
        {backgroundColor: theme.dark ? LightBlack : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const StatusPillText = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.statusPillText,
          {color: theme.dark ? SlateDark : Action},
          style,
        ]}
        {...rest}
      />
    );
  },
);

type StatusPillConfig = {
  label: string;
  navigable: boolean;
  emailRequired?: boolean;
};

function getStatusPillConfig(
  userVerified: boolean | undefined,
  kycUiState: KycUiState,
  canStartKyc: boolean,
  t: (key: string) => string,
): StatusPillConfig | null {
  if (!userVerified) {
    return {
      label: t('Verify Email'),
      navigable: true,
      emailRequired: true,
    };
  }
  if (kycUiState === 'success') {
    return {
      label: t('Identity Verified'),
      navigable: false,
    };
  }
  if (kycUiState === 'denied') {
    return {
      label: t('Application Denied'),
      navigable: true,
    };
  }
  if (kycUiState === 'actionRequired') {
    return {
      label: t('Action Required'),
      navigable: true,
    };
  }
  if (kycUiState === 'inReview') {
    return {
      label: t('Application In Review'),
      navigable: true,
    };
  }
  // notStarted: offer verification only when eligible; else no identity pill.
  if (canStartKyc) {
    return {
      label: t('Verify Identity'),
      navigable: true,
    };
  }
  return null;
}

const SettingsSection = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <View
        ref={ref}
        style={[
          styles.settingsSection,
          {borderColor: theme.dark ? SlateDark : '#E5E5E5'},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const SettingsItem = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <SettingsSection
      style={[
        styles.settingsItem,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

const SettingsSectionBody = ({style, ...rest}: ViewProps) => (
  <View style={[styles.settingsSectionBody, style]} {...rest} />
);

const SettingsSectionHeader = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText
      ref={ref}
      style={[styles.settingsSectionHeader, style]}
      {...rest}
    />
  ),
);

const SettingsSectionDescription = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => (
    <BaseText
      ref={ref}
      style={[styles.settingsSectionDescription, style]}
      {...rest}
    />
  ),
);

export const ProfileSettingsScreen = ({}: ProfileProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const apiToken = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.apiToken[APP.network],
  );

  const kycUiState = useAppSelector(SumSubSelectors.selectKycUiState);
  const canStartKyc = useAppSelector(SumSubSelectors.selectCanStartKyc);

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
    if (apiToken) {
      dispatch(BitPayIdEffects.startFetchSecuritySettings()).catch(() => {});
      dispatch(BitPayIdEffects.startFetchBasicInfo(apiToken)).catch(() => {});
    }
  }, [apiToken, dispatch]);

  const hasName = user?.givenName || user?.familyName;

  if (!user) {
    return <></>;
  }

  return (
    <ProfileSettingsScreenContainer>
      <ScrollView>
        <ProfileInfoContainer>
          <AvatarContainer>
            <Avatar size={77} bright={true} />
          </AvatarContainer>

          {hasName ? (
            <H3>
              {user.givenName} {user.familyName}
            </H3>
          ) : null}

          <EmailAddress>{user.email}</EmailAddress>
          {(() => {
            const pillConfig = getStatusPillConfig(
              user.verified,
              kycUiState,
              canStartKyc,
              t,
            );
            if (!pillConfig) {
              return null;
            }
            return (
              <StatusPill
                activeOpacity={pillConfig.navigable ? ActiveOpacity : 1}
                onPress={() => {
                  if (pillConfig.emailRequired && !user.verified) {
                    navigation.navigate('VerifyEmail');
                  } else if (pillConfig.navigable) {
                    navigation.navigate(BitpayIdScreens.VERIFY_IDENTITY);
                  }
                }}>
                {kycUiState === 'success' ? (
                  <IconHomeIdentityVerified width={16} />
                ) : null}
                <StatusPillText>{pillConfig.label}</StatusPillText>
                {pillConfig.navigable ? <AngleRight width={20} /> : null}
              </StatusPill>
            );
          })()}
        </ProfileInfoContainer>

        {user.verified ? (
          <>
            <H5>{t('Account Settings')}</H5>
            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() =>
                navigation.navigate(BitpayIdScreens.RECEIVE_SETTINGS)
              }>
              <SettingsItem>
                <SettingsSectionBody>
                  <SettingsSectionHeader>
                    {t('Receive via Email Address')}
                  </SettingsSectionHeader>
                  <SettingsSectionDescription>
                    {t('Receive crypto without wallet addresses or QR codes.')}
                  </SettingsSectionDescription>
                </SettingsSectionBody>
                <ChevronRight />
              </SettingsItem>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={ActiveOpacity}
              onPress={() => {
                navigation.navigate(SecurityScreens.HOME);
              }}>
              <SettingsItem>
                <SettingsSectionBody>
                  <SettingsSectionHeader>{t('Security')}</SettingsSectionHeader>
                  <SettingsSectionDescription>
                    {t('Manage security of your device and BitPay account.')}
                  </SettingsSectionDescription>
                </SettingsSectionBody>
                <ChevronRight />
              </SettingsItem>
            </TouchableOpacity>
          </>
        ) : null}
        <SectionSpacer />
      </ScrollView>
    </ProfileSettingsScreenContainer>
  );
};

export default ProfileSettingsScreen;
