import React from 'react';
import {SettingsComponent} from '../SettingsRoot';
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
import {useTranslation} from 'react-i18next';

const CreateOrImportLink = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;
const WalletsAndKeys = () => {
  const {t} = useTranslation();
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
            keyBackupRequired(key, navigation, dispatch, 'settings'),
          ),
        );
  };
  return (
    <SettingsComponent>
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
                    {t('Needs Backup')}
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
        <CreateOrImportLink>{t('Create or Import Key')}</CreateOrImportLink>
      </Setting>
    </SettingsComponent>
  );
};

export default WalletsAndKeys;
