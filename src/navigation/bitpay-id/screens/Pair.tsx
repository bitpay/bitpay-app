import { RouteProp, useRoute } from '@react-navigation/core';
import { useTheme } from '@react-navigation/native';
import React from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import { BitpayIdStackParamList } from '../BitpayIdStack';

const Pair: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<RouteProp<BitpayIdStackParamList, 'Pair'>>();

  const baseTextStyle: StyleProp<TextStyle> = { color: theme.colors.text };
  const {
    secret,
    dashboardRedirect,
    vcd
  } = route.params || {};
  const isPairing = !!secret;

  return (
    <View>
      {!secret && <Text style={baseTextStyle}>
        No pairing data received.
      </Text>}

      {isPairing && <>
        <Text style={baseTextStyle}>
          Pairing...
        </Text>
        <Text style={baseTextStyle}>
          Secret: {secret}
        </Text>
        <Text style={baseTextStyle}>
          Dashboard redirect: {(!!dashboardRedirect).toString()}
        </Text>
        <Text style={baseTextStyle}>
          Virtual Card Design: {vcd || 'not sent'}
        </Text>
      </>}
    </View>
  );
};

export default Pair;
