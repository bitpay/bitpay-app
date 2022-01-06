import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {Button, Text, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {navigationRef} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions} from '../../../store/bitpay-id';
import {BitpayIdStackParamList} from '../BitpayIdStack';

type ProfileProps = StackScreenProps<BitpayIdStackParamList, 'Profile'>;

export const Profile: React.FC<ProfileProps> = () => {
  const dispatch = useDispatch();
  const {APP, BITPAY_ID, CARD} = useSelector((root: RootState) => root);
  const user = BITPAY_ID.user[APP.network];

  const onLoginPress = () => {
    navigationRef.navigate('Auth', {
      screen: 'LoginSignup',
      params: {context: 'login'},
    });
  };

  const onDisconnectPress = () => {
    dispatch(BitPayIdActions.bitPayIdDisconnected(APP.network));
  };

  const cardList = (CARD.cards[APP.network] || []).map(c => {
    return (
      <Text key={c.id}>
        [{c.brand}] ({c.id})
      </Text>
    );
  });

  return (
    <View>
      <Text>TODO: BitPay ID Profile Placeholder</Text>
      {user && (
        <>
          <Text>
            Hello {user.givenName} {user.familyName}!
          </Text>
          <Text>Cards:</Text>
          {cardList}
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
