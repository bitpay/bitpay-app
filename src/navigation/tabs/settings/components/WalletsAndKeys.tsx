import React from 'react';
import {Settings} from '../SettingsRoot';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import styled from 'styled-components/native';
import {Link} from '../../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import Button from '../../../../components/button/Button';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {keyBackupRequired} from '../../home/components/Crypto';
import {useAppDispatch} from '../../../../utils/hooks';
import {View} from 'react-native';
import {Key} from '../../../../store/wallet/wallet.models';

const CreateOrImportLink = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;
const WalletsAndKeys = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  const onPressKey = (key: Key) => {
    key.backupComplete
      ? navigation.navigate('Wallet', {
          screen: 'KeySettings',
          params: {key},
        })
      : dispatch(
          showBottomNotificationModal(
            keyBackupRequired(key, navigation, 'settings'),
          ),
        );
  };
  return (
    <Settings>
      {Object.values(keys).length
        ? Object.values(keys).map(key => (
            <View key={key.id}>
              <Setting onPress={() => onPressKey(key)}>
                <SettingTitle>{key.keyName}</SettingTitle>
                {key.backupComplete ? (
                  <Button buttonType={'pill'} onPress={() => onPressKey(key)}>
                    {key.wallets.length}{' '}
                    {key.wallets.length === 1 ? 'Wallet' : 'Wallets'}
                  </Button>
                ) : (
                  <Button buttonType={'pill'} onPress={() => onPressKey(key)}>
                    Needs Backup
                  </Button>
                )}
              </Setting>
              <Hr />
            </View>
          ))
        : null}
      <Setting
        style={{justifyContent: 'center'}}
        onPress={() =>
          navigation.navigate('Wallet', {screen: 'CreationOptions'})
        }
        activeOpacity={ActiveOpacity}>
        <CreateOrImportLink>Create or Import Key</CreateOrImportLink>
      </Setting>
    </Settings>
  );
};

export default WalletsAndKeys;
