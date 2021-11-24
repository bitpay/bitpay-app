import React from 'react';
import {Button, Text, View} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

export const Profile: React.FC = () => {
  const { APP, BITPAY_ID} = useSelector((root: RootState) => root);
  const user = BITPAY_ID.user[APP.network];

  const onLogoutPress = () => {
    console.log('TODO: logout');
  };

  return (
    <View>
      {user && <>
        <Text>
          Hello {user.givenName} {user.familyName}!
        </Text>
        <Button onPress={onLogoutPress} title="Logout" />
      </>}
      {!user && <Text>
        Not paired with BitPay ID.
      </Text>}
    </View>
  );
};

export default Profile;
