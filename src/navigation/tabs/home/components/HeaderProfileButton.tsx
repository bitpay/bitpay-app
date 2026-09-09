import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useSelector} from 'react-redux';
import Avatar from '../../../../components/avatar/BitPayIdAvatar';
import {RootState} from '../../../../store';
import {User} from '../../../../store/bitpay-id/bitpay-id.models';
import {HeaderButtonContainer} from './Styled';

const ProfileButton: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  return (
    <HeaderButtonContainer>
      <TouchableOpacity
        testID="profile-button"
        accessibilityLabel={t('Profile')}
        onPress={() => {
          user
            ? navigation.navigate('BitPayIdProfile')
            : navigation.navigate('Login');
        }}>
        <Avatar size={40} />
      </TouchableOpacity>
    </HeaderButtonContainer>
  );
};

export default ProfileButton;
