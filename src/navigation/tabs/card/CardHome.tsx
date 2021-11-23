import {useTheme} from '@react-navigation/native';
import React from 'react';
import {Button, StyleProp, Text, TextStyle, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {AppEffects} from '../../../store/app';

const CardHome: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const network = useSelector(({APP}: RootState) => APP.network);

  const textStyle: StyleProp<TextStyle> = {
    color: theme.colors.text,
  };

  const onGetCardPress = async (context?: 'login' | 'createAccount') => {
    const host = `${network === 'testnet' ? 'test.' : ''}bitpay.com`;
    const path = 'wallet-card';
    let url = `https://${host}/${path}`;

    if (context) {
      url += `?context=${context}`;
    }

    dispatch(AppEffects.openUrlWithInAppBrowser(url));
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={textStyle}>Get the BitPay Card! {network}</Text>
      <Button title="Sign up" onPress={() => onGetCardPress('createAccount')} />
      <Button
        title="I already have an account"
        onPress={() => onGetCardPress('login')}
      />
    </View>
  );
};

export default CardHome;
