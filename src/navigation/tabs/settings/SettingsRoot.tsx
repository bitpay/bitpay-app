import {StackScreenProps} from '@react-navigation/stack';
import React, {ReactElement, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {View, LayoutAnimation, ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  ScreenGutter,
  Setting,
  SettingIcon,
  SettingTitle,
} from '../../../components/styled/Containers';
import {Black, Feather, LightBlack, White} from '../../../styles/colors';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {updateSettingsListConfig} from '../../../store/app/app.actions';
import {useAppSelector, useAppDispatch} from '../../../utils/hooks';

import General from './components/General';
import Security from './components/Security';
import About from './components/About';
import Contacts from './components/Contacts';
import Crypto from './components/Crypto';
import WalletsAndKeys from './components/WalletsAndKeys';
import {SettingsStackParamList} from './SettingsStack';
import {useScrollToTop} from '@react-navigation/native';

interface HomeSetting {
  id: SettingsListType;
  title: string;
  onPress: () => void;
  subListComponent: ReactElement;
}

export const SettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

export const Settings = styled.ScrollView`
  margin: 10px ${ScreenGutter};
`;

export const SettingsComponent = styled.View`
  padding: 0 ${ScreenGutter};
`;

export const SettingsHome = styled.ScrollView`
  padding: 10px 0;
`;

const DropdownSetting = styled(Setting)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export type SettingsHomeParamList =
  | {
      redirectTo?: string;
    }
  | undefined;

type SettingsHomeProps = StackScreenProps<SettingsStackParamList, 'Root'>;

export type SettingsListType =
  | 'General'
  | 'Contacts'
  | 'Crypto'
  | 'Wallets & Keys'
  | 'Security'
  | 'External Services'
  | 'Connections'
  | 'About BitPay';

const SettingsHomeScreen: React.VFC<SettingsHomeProps> = ({route}) => {
  const {redirectTo} = route.params || {};
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const hideList = useAppSelector(({APP}) => APP.settingsListConfig);
  const memoizedSettingsConfigs: HomeSetting[] = useMemo(
    () => [
      {
        id: 'General',
        title: t('General'),
        onPress: () => {},
        subListComponent: <General />,
      },
      {
        id: 'Contacts',
        title: t('Contacts'),
        onPress: () => {},
        subListComponent: <Contacts />,
      },
      {
        id: 'Crypto',
        title: t('Crypto'),
        onPress: () => {},
        subListComponent: <Crypto />,
      },
      {
        id: 'Wallets & Keys',
        title: t('Wallets & Keys'),
        onPress: () => {},
        subListComponent: <WalletsAndKeys />,
      },
      {
        id: 'About BitPay',
        title: t('About BitPay'),
        onPress: () => {},
        subListComponent: <About />,
      },
    ],
    [t, redirectTo],
  );

  const memoizedSettingsList = useMemo(() => {
    return memoizedSettingsConfigs.map(
      ({id, title, onPress, subListComponent}) => {
        return (
          <View key={id}>
            <DropdownSetting
              activeOpacity={ActiveOpacity}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                dispatch(updateSettingsListConfig(id));
                onPress();
              }}>
              <SettingTitle>{title}</SettingTitle>
              <SettingIcon suffix>
                {!hideList.includes(id) ? <ChevronDownSvg /> : <ChevronUpSvg />}
              </SettingIcon>
            </DropdownSetting>
            {!hideList.includes(id) && subListComponent ? (
              <>{subListComponent}</>
            ) : null}
          </View>
        );
      },
    );
  }, [dispatch, memoizedSettingsConfigs, hideList]);

  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  return (
    <SettingsContainer>
      <SettingsHome ref={scrollViewRef}>{memoizedSettingsList}</SettingsHome>
    </SettingsContainer>
  );
};

export default SettingsHomeScreen;
