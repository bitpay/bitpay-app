import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import Button from '../../../../components/button/Button';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {Link} from '../../../../components/styled/Text';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {Key} from '../../../../store/wallet/wallet.models';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {keyBackupRequired} from '../../home/components/Crypto';
import {SettingsComponent} from '../SettingsRoot';

const styles = StyleSheet.create({
  createOrImportLink: {
    fontWeight: '500',
    fontSize: 18,
  },
  keyStatusButton: {
    flexShrink: 0,
  },
});

const CreateOrImportLink = ({
  style,
  ...rest
}: React.ComponentProps<typeof Link>) => (
  <Link style={[styles.createOrImportLink, style]} {...rest} />
);

const KeyStatusButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof Button>) => (
  <Button style={[styles.keyStatusButton, style]} {...rest} />
);

const WalletsAndKeys = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const keyList = Object.values(keys);

  const onPressKey = (key: Key) => {
    key.backupComplete
      ? navigation.navigate('KeySettings', {key})
      : dispatch(
          showBottomNotificationModal(
            keyBackupRequired(key, navigation, dispatch, 'settings'),
          ),
        );
  };

  return (
    <SettingsComponent>
      {keyList.length
        ? keyList.map(key => (
            <View key={key.id}>
              <Setting onPress={() => onPressKey(key)}>
                <SettingTitle>{key.keyName}</SettingTitle>
                {key.backupComplete ? (
                  <KeyStatusButton
                    buttonType={'pill'}
                    onPress={() => onPressKey(key)}>
                    {t('{{count}} wallet', {count: key.wallets.length})}
                  </KeyStatusButton>
                ) : (
                  <KeyStatusButton
                    buttonType={'pill'}
                    onPress={() => onPressKey(key)}>
                    {t('Needs Backup')}
                  </KeyStatusButton>
                )}
              </Setting>
              <Hr />
            </View>
          ))
        : null}
      <Setting
        style={{justifyContent: 'center'}}
        onPress={() => navigation.navigate('CreationOptions')}
        activeOpacity={ActiveOpacity}>
        <CreateOrImportLink>{t('Create or Import Key')}</CreateOrImportLink>
      </Setting>
    </SettingsComponent>
  );
};

export default WalletsAndKeys;
