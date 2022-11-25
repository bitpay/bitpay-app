import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import styled from 'styled-components/native';
import Button from '../../../../components/button/Button';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {Link} from '../../../../components/styled/Text';
import {Key} from '../../../../store/wallet/wallet.models';
import {useAppSelector} from '../../../../utils/hooks';
import {SettingsComponent} from '../SettingsRoot';
import {DisabledOpacity} from '../../home/components/Styled';

const CreateOrImportLink = styled(Link)`
  font-weight: 500;
  font-size: 18px;
`;
const WalletsAndKeys = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const keyList = Object.values(keys);
  const deferredImport = useAppSelector(({WALLET}) => WALLET.deferredImport);

  const onPressKey = (key: Key) => {
    navigation.navigate('Wallet', {
      screen: 'KeySettings',
      params: {key},
    });
  };

  return (
    <SettingsComponent>
      {keyList.length
        ? keyList.map(key => (
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
        disabled={!!deferredImport}
        style={[
          {justifyContent: 'center'},
          !!deferredImport && DisabledOpacity,
        ]}
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
