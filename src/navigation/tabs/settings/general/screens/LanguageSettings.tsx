import i18n from 'i18next';
import {sortBy} from 'lodash';
import React, {useState} from 'react';
import {View} from 'react-native';
import Braze from 'react-native-appboy-sdk';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {AppActions} from '../../../../../store/app';
import {Analytics} from '../../../../../store/app/app.effects';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {LanguageList} from '../../../../../constants/LanguageSelectionList';

const LanguageSettingsScreen: React.VFC = () => {
  const dispatch = useAppDispatch();
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const [selected, setSelected] = useState(appLanguage);

  const onSetLanguage = (lng: string) => {
    setSelected(lng);
    i18n.changeLanguage(lng);
    Braze.setLanguage(lng);
    dispatch(AppActions.setDefaultLanguage(lng));
    dispatch(Analytics.track('Saved Language', {language: lng}));
  };

  return (
    <SettingsContainer>
      <Settings>
        <Hr />

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

export default LanguageSettingsScreen;
