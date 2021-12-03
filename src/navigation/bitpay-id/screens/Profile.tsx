import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {Button, Text, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {BitPayIdActions} from '../../../store/bitpay-id';
import {BitpayIdStackParamList} from '../BitpayIdStack';

type ProfileProps = StackScreenProps<BitpayIdStackParamList, 'Profile'>;

export const Profile: React.FC<ProfileProps> = props => {
  const dispatch = useDispatch();
  const {APP, BITPAY_ID} = useSelector((root: RootState) => root);
  const {navigation} = props;
  const user = BITPAY_ID.user[APP.network];

  const onLoginPress = () => {
    navigation.navigate('LoginSignup', {context: 'login'});
  };

  const onDisconnectPress = () => {
    dispatch(BitPayIdActions.bitPayIdDisconnected(APP.network));
  };

  return (
    <View>
      <Text>TODO: BitPay ID Profile Placeholder</Text>
      {user && (
        <>
          <Text>
            Hello {user.givenName} {user.familyName}!
          </Text>
          <Button onPress={onDisconnectPress} title="Disconnect" />
        </>
      )}
      {!user && (
        <>
          <Text>Not paired with BitPay ID.</Text>
          <Button onPress={onLoginPress} title="Log in" />
        </>
      )}
    </View>
  );
};

export default Profile;
