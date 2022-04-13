import React from 'react';
import {Settings} from '../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {View} from 'react-native';

const Notifications = () => {
  // TODO: Update me
  const notificationsList = [
    {title: 'Enable Push Notifications', checked: false},
    {title: 'Confirmed Transactions', checked: false},
    {title: 'Product Updates', checked: false},
    {title: 'Offers & Promotions', checked: false},
  ];
  return (
    <Settings>
      {notificationsList.map(({title, checked}, i) => (
        <View key={i}>
          {i !== 0 ? <Hr /> : null}
          <Setting>
            <SettingTitle>{title}</SettingTitle>
            <Checkbox onPress={() => {}} checked={checked} />
          </Setting>
        </View>
      ))}
    </Settings>
  );
};

export default Notifications;
