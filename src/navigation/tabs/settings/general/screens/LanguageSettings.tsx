import React, {useState} from 'react';
import {View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../../../store/app';
import {RootState} from '../../../../../store';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {LanguageList} from '../../../../../constants/LanguageSelectionList';
import i18n from 'i18next';
import {logSegmentEvent} from '../../../../../store/app/app.effects';

const LanguageSettings: React.FC = () => {
  const dispatch = useDispatch();
  const appLanguage = useSelector(({APP}: RootState) => APP.defaultLanguage);
  const [selected, setSelected] = useState(appLanguage);
  const onSetLanguage = (lng: string) => {
    setSelected(lng);
    i18n.changeLanguage(lng);
    dispatch(AppActions.setDefaultLanguage(lng));
    dispatch(
      logSegmentEvent('track', 'Saved Language', {
        language: lng,
      }),
    );
  };
  return (
    <SettingsContainer>
      <Settings>
        {LanguageList.map(({name, isoCode}) => {
          return (
            <View key={isoCode}>
              <Setting onPress={() => onSetLanguage(isoCode)}>
                <SettingTitle>{name}</SettingTitle>
                <Checkbox
                  radio={true}
                  onPress={() => onSetLanguage(isoCode)}
                  checked={selected === isoCode}
                />
              </Setting>
              <Hr />
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default LanguageSettings;
