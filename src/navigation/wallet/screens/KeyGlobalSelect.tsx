import React, {useCallback} from 'react';
import {FlatList, SafeAreaView, StyleSheet, View} from 'react-native';
import {useAppSelector} from '../../../utils/hooks';
import {Key} from '../../../store/wallet/wallet.models';
import KeyGlobalSelectRow from '../../../components/list/KeyGlobalSelectRow';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {keyExtractor} from '../../../utils/helper-methods';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
  globalSelectContainer: {
    padding: 12,
  },
});

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
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.globalSelectContainer}>
        {keys.length > 0 && (
          <FlatList
            contentContainerStyle={{paddingBottom: 100}}
            data={keys}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default KeyGlobalSelect;
