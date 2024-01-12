import React, {useCallback} from 'react';
import styled from 'styled-components/native';
import {useAppSelector} from '../../../utils/hooks';
import {Key} from '../../../store/wallet/wallet.models';
import KeyGlobalSelectRow from '../../../components/list/KeyGlobalSelectRow';
import {ScreenGutter} from '../../../components/styled/Containers';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {keyExtractor} from '../../../utils/helper-methods';
import {FlatList} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  padding: ${ScreenGutter};
`;

export type KeyGlobalSelectParamList = {
  onKeySelect: (selectedKey: Key) => void;
  invitationCode?: string;
};

type KeyGlobalSelectScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.KEY_GLOBAL_SELECT
>;

const KeyGlobalSelect: React.FC<KeyGlobalSelectScreenProps> = ({route}) => {
  let {onKeySelect} = route.params || {};
  const _keys = useAppSelector(({WALLET}) => WALLET.keys);
  const keys = Object.values(_keys).filter(key => key.backupComplete);

  const renderItem = useCallback(
    ({item}: {item: Key}) => {
      return (
        <KeyGlobalSelectRow
          item={item}
          emit={(selectedKey: Key) => onKeySelect(selectedKey)}
          key={item.id}
        />
      );
    },
    [onKeySelect],
  );

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
