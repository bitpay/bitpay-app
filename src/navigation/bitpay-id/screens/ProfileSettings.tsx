import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import Avatar from '../../../components/avatar/Avatar';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {H3, Paragraph} from '../../../components/styled/Text';
import {RootState} from '../../../store';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
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

export const ProfileSettingsScreen: React.FC<ProfileProps> = () => {
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  if (!user) {
    return <></>;
  }

  return (
    <ProfileSettingsScreenContainer>
      <ProfileInfoContainer>
        <Avatar
          size={77}
          firstName={user.givenName}
          lastName={user.familyName}
        />

        <UserNameHeading>
          {user.givenName} {user.familyName}
        </UserNameHeading>

        <Paragraph>{user.email}</Paragraph>
      </ProfileInfoContainer>

      <Hr />
    </ProfileSettingsScreenContainer>
  );
};

export default ProfileSettingsScreen;
