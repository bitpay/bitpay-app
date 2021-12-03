import {RouteProp, useNavigation, useRoute} from '@react-navigation/core';
import {useTheme} from '@react-navigation/native';
import React, {useEffect} from 'react';
import {Button, StyleProp, Text, TextStyle, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RootStacks} from '../../../Root';
import {RootState} from '../../../store';
import {BitPayIdActions, BitPayIdEffects} from '../../../store/bitpay-id';
import {TabsScreens} from '../../tabs/TabsStack';
import {BitpayIdStackParamList} from '../BitpayIdStack';

const Pair: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigator = useNavigation();
  const route = useRoute<RouteProp<BitpayIdStackParamList, 'Pair'>>();
  const pairingStatus = useSelector(
    ({BITPAY_ID}: RootState) => BITPAY_ID.pairingBitPayIdStatus,
  );

  const baseTextStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const {secret, code, dashboardRedirect, vcd} = route.params || {};
  const isPairing = !!secret;

  useEffect(() => {
    if (secret) {
      dispatch(BitPayIdEffects.startPairing({secret, code}));
    }
  }, [dispatch, secret, code]);

  useEffect(() => {
    if (pairingStatus === 'success') {
      navigator.navigate('BitpayId', {screen: 'Profile'});
      dispatch(BitPayIdActions.updatePairingBitPayIdStatus(null));
    }
  }, [navigator, dispatch, pairingStatus]);

  return (
    <View>
      {!secret && <Text style={baseTextStyle}>No pairing data received.</Text>}

      {isPairing && (
        <>
          <Text style={baseTextStyle}>Pairing...</Text>
          <Text style={baseTextStyle}>Secret: {secret}</Text>
          <Text style={baseTextStyle}>
            Dashboard redirect: {(!!dashboardRedirect).toString()}
          </Text>
          <Text style={baseTextStyle}>
            Virtual Card Design: {vcd || 'not sent'}
          </Text>
          <Button
            title="GeneralRoot"
            onPress={() =>
              navigator.navigate(RootStacks.TABS, {
                screen: TabsScreens.HOME,
              })
            }
          />
        </>
      )}
    </View>
  );
};

export default Pair;
