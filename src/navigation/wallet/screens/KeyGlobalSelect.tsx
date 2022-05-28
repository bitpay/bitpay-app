import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {useAppSelector} from '../../../utils/hooks';
import {Key} from '../../../store/wallet/wallet.models';
import KeyGlobalSelectRow from '../../../components/list/KeyGlobalSelectRow';
import {ScreenGutter} from '../../../components/styled/Containers';
import {RouteProp, useRoute} from '@react-navigation/core';
import {WalletScreens, WalletStackParamList} from '../WalletStack';
import {useNavigation} from '@react-navigation/native';
import {keyExtractor} from '../../../utils/helper-methods';
import {FlatList} from 'react-native';

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  padding: ${ScreenGutter};
`;

export type KeyGlobalSelectParamList = {
  context: 'join';
  invitationCode?: string;
};

const KeyGlobalSelect: React.FC<KeyGlobalSelectParamList> = ({}) => {
  const route = useRoute<RouteProp<WalletStackParamList, 'KeyGlobalSelect'>>();
  let {context, invitationCode} = route.params || {};
  const _keys = useAppSelector(({WALLET}) => WALLET.keys);
  const keys = Object.values(_keys).filter(key => key.backupComplete);

  const navigation = useNavigation();

  const renderItem = useCallback(({item}: {item: Key}) => {
    return (
      <KeyGlobalSelectRow
        item={item}
        emit={(selectKey: Key) => {
          if (context === 'join') {
            navigation.navigate('Wallet', {
              screen: WalletScreens.JOIN_MULTISIG,
              params: {
                key: selectKey,
                invitationCode,
              },
            });
          }
        }}
        key={item.id}
      />
    );
  }, []);

  return (
    <SafeAreaView>
      <GlobalSelectContainer>
        {keys.length > 0 && (
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={keys}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        )}
      </GlobalSelectContainer>
    </SafeAreaView>
  );
};

export default KeyGlobalSelect;
