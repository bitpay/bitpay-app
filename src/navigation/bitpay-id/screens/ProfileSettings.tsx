import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
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
import {SumSubKycStatus} from '../../../store/sumsub/sumsub.reducer';
import AngleRight from '../../../../assets/img/angle-right.svg';

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

const StatusPill = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : LightBlue)};
  border-radius: 20px;
  padding: 4px 14px;
  margin-top: 8px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const StatusPillText = styled(BaseText)`
  font-size: 13px;
  line-height: 23px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? SlateDark : Action)};
`;

type StatusPillConfig = {
  label: string;
  navigable: boolean;
  emailRequired?: boolean;
};

function getStatusPillConfig(
  userVerified: boolean | undefined,
  kycStatus: SumSubKycStatus,
  t: (key: string) => string,
): StatusPillConfig | null {
  if (!userVerified) {
    return {
      label: t('Verify Email'),
      navigable: true,
      emailRequired: true,
    };
  }
  if (kycStatus === 'Approved') {
    return {
      label: t('Identity Verified'),
      navigable: false,
    };
  }
  if (kycStatus === 'FinallyRejected') {
    return {
      label: t('Application Denied'),
      navigable: true,
    };
  }
  if (kycStatus === 'TemporarilyDeclined') {
    return {
      label: t('Action Required'),
      navigable: true,
    };
  }
  if (kycStatus === 'Pending') {
    return {
      label: t('Application in Review'),
      navigable: false,
    };
  }
  if (kycStatus === 'Incomplete') {
    return {
      label: t('Continue Application'),
      navigable: true,
    };
  }
  return {
    label: t('Verify Identity'),
    navigable: true,
  };
}

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

export const ProfileSettingsScreen = ({}: ProfileProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  console.log('##### USER', user);
  const apiToken = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.apiToken[APP.network],
  );

  const kycStatus = useAppSelector(({SUMSUB}) => SUMSUB.kycStatus[network]);

  useEffect(() => {
    dispatch(BitPayIdEffects.startFetchSession());
    if (apiToken) {
      dispatch(BitPayIdEffects.startFetchSecuritySettings());
      dispatch(BitPayIdEffects.startFetchBasicInfo(apiToken));
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
              kycStatus,
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
                <StatusPillText>{pillConfig.label}</StatusPillText>
                <AngleRight />
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
