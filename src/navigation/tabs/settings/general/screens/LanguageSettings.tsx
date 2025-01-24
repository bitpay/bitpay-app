import i18n from 'i18next';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import Braze from '@braze/react-native-sdk';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {RootState} from '../../../../../store';
import {AppActions} from '../../../../../store/app';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {LanguageList} from '../../../../../constants/LanguageSelectionList';
import {useTheme} from 'styled-components/native';
import {SlateDark} from '../../../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {HeaderTitle} from '../../../../../components/styled/Text';
import { SettingsComponent, SettingsContainer } from '../../SettingsRoot';
import { Analytics } from '../../../../../store/analytics/analytics.effects';

const LanguageSettings: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const [selected, setSelected] = useState(appLanguage);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Language')}</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation, t]);

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
      <SettingsComponent>
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
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default LanguageSettings;
