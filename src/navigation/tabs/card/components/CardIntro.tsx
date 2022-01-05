import {useTheme} from '@react-navigation/native';
import React from 'react';
import {Button, StyleProp, Text, TextStyle, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {Network} from '../../../../constants';
import {BASE_BITPAY_URLS} from '../../../../constants/config';
import {RootState} from '../../../../store';
import {AppEffects} from '../../../../store/app';

const CardIntro: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {
    color: theme.colors.text,
  };
  const network = useSelector<RootState, Network>(({APP}) => APP.network);

  const onGetCardPress = async (context?: 'login' | 'createAccount') => {
    const host = BASE_BITPAY_URLS[network];
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

export default CardIntro;
