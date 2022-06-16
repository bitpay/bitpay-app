import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components/native';
import Avatar from '../../../components/avatar/BitPayIdAvatar';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, H3, Paragraph} from '../../../components/styled/Text';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {Network} from '../../../constants';
import {RootState} from '../../../store';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import {ShopActions, ShopEffects} from '../../../store/shop';
import {BitpayIdStackParamList} from '../BitpayIdStack';

type ProfileProps = StackScreenProps<BitpayIdStackParamList, 'Profile'>;

const ProfileSettingsScreenContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;

const ProfileInfoContainer = styled.View`
  display: flex;
  align-items: center;
  margin: 30px 0 36px;
`;

const UserNameHeading = styled(H3)`
  margin-top: 22px;
`;

const SettingsSection = styled.View`
  flex-direction: row;
  padding: 20px 0;
`;

const SettingsSectionBody = styled.View`
  flex-shrink: 1;
  padding-right: 40px;
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

export const ProfileSettingsScreen: React.FC<ProfileProps> = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const network = useSelector<RootState, Network>(({APP}) => APP.network);
  const syncGiftCardPurchasesWithBitPayId = useSelector<RootState, boolean>(
    ({SHOP}) => SHOP.syncGiftCardPurchasesWithBitPayId,
  );
  const user = useSelector<RootState, User | null>(
    ({BITPAY_ID}) => BITPAY_ID.user[network],
  );

  if (!user) {
    return <></>;
  }

  return (
    <ProfileSettingsScreenContainer>
      <ProfileInfoContainer>
        <Avatar size={77} />

        <UserNameHeading>
          {user.givenName} {user.familyName}
        </UserNameHeading>

        <Paragraph>{user.email}</Paragraph>
      </ProfileInfoContainer>

      <Hr />

      <SettingsSection>
        <SettingsSectionBody>
          <SettingsSectionHeader>
            {t('Sync Gift Card Purchases')}
          </SettingsSectionHeader>
          <SettingsSectionDescription>
            {t(
              'If enabled, your gift card purchases will be associated with your BitPay ID, allowing you to keep track of your gift card purchases even if this device is lost.',
            )}
          </SettingsSectionDescription>
        </SettingsSectionBody>
        <ToggleSwitch
          isEnabled={syncGiftCardPurchasesWithBitPayId}
          onChange={() => {
            dispatch(ShopActions.toggledSyncGiftCardPurchasesWithBitPayId());
            dispatch(ShopEffects.startFetchCatalog());
          }}
        />
      </SettingsSection>
    </ProfileSettingsScreenContainer>
  );
};

export default ProfileSettingsScreen;
