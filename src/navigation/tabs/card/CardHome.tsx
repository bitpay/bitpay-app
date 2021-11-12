import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Button, Linking, StyleProp, Text, TextStyle, View } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { LogActions } from '../../../store/log';

const CardHome: React.FC =() => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const network = useSelector(({ APP }: RootState) => APP.network);

  const textStyle: StyleProp<TextStyle> = {
    color: theme.colors.text
  };

  const onGetCardPress = async (context?: 'login' | 'createAccount') => {
    const host = `${(network === 'testnet' ? 'test.' : '')}bitpay.com`;
    const path = `wallet-card`;
    let url = `https://${host}/${path}`;

    if (context) {
      url += `?context=${context}`;
    }

    let isIabAvailable = false;

    try {
      isIabAvailable = await InAppBrowser.isAvailable();
    } catch (err) {
      console.log(err);
    }

    try {
      if (isIabAvailable) {
        await InAppBrowser.open(url, {});

      } else {
        Linking.openURL(url);
      }
    } catch (err) {
      const logMsg = `Error opening URL ${url} with ${isIabAvailable ? 'IAB' : 'Linking module'}.\n${JSON.stringify(err)}`;
      dispatch(LogActions.error(logMsg));
      console.log(logMsg);
      console.error(err);
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={textStyle}>Get the BitPay Card! {network}</Text>
      <Button title="Sign up" onPress={() => onGetCardPress('createAccount')} />
      <Button title="I already have an account" onPress={() => onGetCardPress('login')} />
    </View>
  );
};

export default CardHome;
