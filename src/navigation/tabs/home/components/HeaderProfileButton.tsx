import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useSelector} from 'react-redux';
import Avatar from '../../../../components/avatar/Avatar';
import {RootState} from '../../../../store';
import {User} from '../../../../store/bitpay-id/bitpay-id.models';
import {HeaderButtonContainer} from '../HomeRoot';

const ProfileButton: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const verified = false; // TODO

  return (
    <HeaderButtonContainer>
      <TouchableOpacity
        onPress={() => navigation.navigate('BitpayId', {screen: 'Profile'})}>
        <Avatar
          size={35}
          firstName={user?.givenName}
          lastName={user?.familyName}
          verified={verified}
        />
      </TouchableOpacity>
    </HeaderButtonContainer>
  );
};

export default ProfileButton;
