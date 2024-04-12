import i18n from 'i18next';
import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import Braze from 'react-native-appboy-sdk';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {AppActions} from '../../../../../store/app';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {LanguageList} from '../../../../../constants/LanguageSelectionList';
import {useTheme} from 'styled-components/native';
import {SlateDark} from '../../../../../styles/colors';

const LanguageSettingsScreen: React.VFC = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const [selected, setSelected] = useState(appLanguage);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selected !== appLanguage) {
      setLoading(true);
      i18n.changeLanguage(selected);
      Braze.setLanguage(selected);
      dispatch(AppActions.setDefaultLanguage(selected));
      dispatch(Analytics.track('Saved Language', {language: selected}));
      setLoading(false);
    }
  }, [dispatch, selected, appLanguage]);

  return (
    <SettingsContainer>
      <Settings>
        {LanguageList.map(({name, isoCode}) => {
          return (
            <View key={isoCode}>
              <Setting onPress={() => setSelected(isoCode)}>
                <SettingTitle>{name}</SettingTitle>
                {loading && selected === isoCode ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.dark ? '#E1E4E7' : SlateDark}
                    style={{marginEnd: 8}}
                  />
                ) : (
                  <Checkbox
                    radio={true}
                    onPress={() => setSelected(isoCode)}
                    checked={selected === isoCode}
                  />
                )}
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
