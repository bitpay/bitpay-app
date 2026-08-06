import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import moment from 'moment';
import styled from 'styled-components/native';
import Avatar from '../../../components/avatar/BitPayIdAvatar';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  BaseText,
  H3,
  H5,
  Link,
  Paragraph,
} from '../../../components/styled/Text';
import {
  LightBlack,
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

type ProfileProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.PROFILE
>;

const ProfileSettingsScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: 0 ${ScreenGutter};
  padding-bottom: 100px;
`;

const ProfileInfoContainer = styled.View`
  display: flex;
  align-items: center;
  margin: 50px 0 36px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  padding: 20px;
  padding-bottom: 25px;
`;

const AvatarContainer = styled.View`
  margin-top: -58px;
  padding-bottom: 18px;
`;

const EmailAddress = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
`;

const EmailAddressNotVerified = styled(Paragraph)`
  font-size: 14px;
`;

const SettingsSection = styled.View`
  flex-direction: row;
  padding: 20px 16px;
  border: ${({theme: {dark}}) => (dark ? SlateDark : '#E5E5E5')};
  border-radius: 12px;
  margin-top: 16px;
  margin-bottom: 8px;
`;

const SettingsItem = styled(SettingsSection)`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border: none;
`;

const SettingsSectionBody = styled.View`
  flex-shrink: 1;
  padding-right: 40px;
  flex-grow: 1;
`;

const SettingsSectionHeader = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 10px;
`;

const SettingsSectionDescription = styled(BaseText)`
  font-size: 12px;
  line-height: 18px;
`;

const LastLoginDetail = styled(SettingsSectionDescription)`
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
`;

const LastLoginAlert = styled(SettingsSectionDescription)`
  margin-top: 10px;
`;

export const ProfileSettingsScreen = ({}: ProfileProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const apiToken = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.apiToken[APP.network],
  );
  const lastLogin = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.lastLogin[network],
  );

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
    if (apiToken) {
      dispatch(BitPayIdEffects.startFetchSecuritySettings()).catch(() => {});
      dispatch(BitPayIdEffects.startFetchBasicInfo(apiToken)).catch(() => {});
      dispatch(BitPayIdEffects.startFetchLastLogin()).catch(() => {});
    }
  }, [apiToken, dispatch]);

  const hasName = user?.givenName || user?.familyName;
  const lastLoginLocation = [
    lastLogin?.city,
    lastLogin?.region,
    lastLogin?.country,
  ]
    .filter(Boolean)
    .join(', ');

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
          {!user.verified ? (
            <EmailAddressNotVerified>
              <Link
                testID="resend-link-button"
                accessibilityLabel="Verify email address"
                onPress={() => navigation.navigate('VerifyEmail')}>
                {t('Verify email address')}
              </Link>
            </EmailAddressNotVerified>
          ) : null}
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

            {lastLogin?.date ? (
              <>
                <SectionSpacer />
                <H5>{t('Last Login')}</H5>
                <SettingsItem>
                  <SettingsSectionBody>
                    <SettingsSectionHeader>
                      {moment(lastLogin.date).format('MMM DD, YYYY hh:mm a')}
                    </SettingsSectionHeader>
                    {lastLogin.device ? (
                      <LastLoginDetail>{lastLogin.device}</LastLoginDetail>
                    ) : null}
                    {lastLoginLocation ? (
                      <LastLoginDetail>{lastLoginLocation}</LastLoginDetail>
                    ) : null}
                    {lastLogin.ipAddress ? (
                      <LastLoginDetail>
                        {t('IP Address')}: {lastLogin.ipAddress}
                      </LastLoginDetail>
                    ) : null}
                    <LastLoginAlert>
                      {t("Don't recognize this activity?")}{' '}
                      <Link
                        onPress={() => {
                          navigation.navigate(SecurityScreens.HOME);
                        }}>
                        {t('Secure your account')}
                      </Link>
                    </LastLoginAlert>
                  </SettingsSectionBody>
                </SettingsItem>
              </>
            ) : null}
          </>
        ) : null}
        <SectionSpacer />
      </ScrollView>
    </ProfileSettingsScreenContainer>
  );
};

export default ProfileSettingsScreen;
