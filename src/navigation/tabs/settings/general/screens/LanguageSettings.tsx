import React, {useState} from 'react';
import {View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {useTheme} from '@react-navigation/native';
import {AppActions} from '../../../../../store/app';
import {RootState} from '../../../../../store';
import {StyleProp, TextStyle} from 'react-native';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {LanguageList} from '../../../../../constants/LanguageSelectionList';
import i18n from 'i18next';

const LanguageSettings: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const appLanguage = useSelector(({APP}: RootState) => APP.defaultLanguage);
  const [selected, setSelected] = useState(appLanguage);
  const onSetLanguage = (lng: string) => {
    setSelected(lng);
    i18n.changeLanguage(lng);
    dispatch(AppActions.setDefaultLanguage(lng));
  };
  return (
    <SettingsContainer>
      <Settings>
        {LanguageList.map(({name, isoCode}) => {
          return (
            <View key={isoCode}>
              <Setting onPress={() => onSetLanguage(isoCode)}>
                <SettingTitle style={textStyle}>{name}</SettingTitle>
                <Checkbox
                  radio={true}
                  onPress={() => onSetLanguage(isoCode)}
                  checked={selected === isoCode}
                />
              </Setting>
              <Hr isDark={theme.dark} />
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default LanguageSettings;
