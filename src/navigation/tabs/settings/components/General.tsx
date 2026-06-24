import React, {
  useEffect,
  useState,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import Button from '../../../../components/button/Button';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import ToggleSwitch from '../../../../components/toggle-switch/ToggleSwitch';
import {AppActions} from '../../../../store/app';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {
  resetAllSettings,
  setShowPortfolioValueWithRuntimeReset,
} from '../../../../store/app/app.effects';
import {useTheme} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {RootState} from '../../../../store';
import {useAppDispatch} from '../../../../utils/hooks/useAppDispatch';
import {useTranslation} from 'react-i18next';
import {LanguageList} from '../../../../constants/LanguageSelectionList';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import styled from 'styled-components/native';
import HeaderBackButton from '../../../../components/back/HeaderBackButton';
import {SettingsDetailsParamList} from '../SettingsDetails';
import {FlashList} from '@shopify/flash-list';
import {View} from 'react-native';
import {useOngoingProcess} from '../../../../contexts';
import {logManager} from '../../../../managers/LogManager';

const SettingsComponent = styled.View`
  flex: 1;
  padding: 10px 0;
`;

type Props = NativeStackScreenProps<SettingsDetailsParamList, 'General'>;

type SettingsDetailsRouteWithParams = 'Connections' | 'ContactsDetails';
type SettingsDetailsRouteNoParams = Exclude<
  keyof SettingsDetailsParamList,
  SettingsDetailsRouteWithParams
>;

type SettingItem =
  | {
      id: string;
      title: string;
      type: 'navigation';
      navigationTarget: SettingsDetailsRouteNoParams;
    }
  | {
      id: string;
      title: string;
      type: 'button';
      value: string;
      navigationTarget: SettingsDetailsRouteNoParams;
    }
  | {
      id: string;
      title: string;
      type: 'toggle';
      value: boolean;
      isDisabled?: boolean;
      onPress: (value: boolean) => void;
    }
  | {
      id: string;
      title: string;
      type: 'reset';
      onPress: () => void;
    };

const General: React.FC<Props> = ({navigation}) => {
  const colorScheme = useAppSelector(({APP}: RootState) => APP.colorScheme);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const theme = useTheme();
  const showPortfolioValue = useAppSelector(
    ({APP}: RootState) => APP.showPortfolioValue,
  );
  const hideAllBalances = useAppSelector(
    ({APP}: RootState) => APP.hideAllBalances,
  );
  const selectedAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );
  const appLanguage = useAppSelector(({APP}) => APP.defaultLanguage);
  const [appLanguageName, setAppLanguageName] = useState('');
  const [pendingShowPortfolioValue, setPendingShowPortfolioValue] = useState<
    boolean | undefined
  >();
  const showPortfolioTogglePendingRef = useRef(false);
  const displayedShowPortfolioValue =
    pendingShowPortfolioValue ?? showPortfolioValue;

  const dispatch = useAppDispatch();
  const {t} = useTranslation();

  const handleToggleShowPortfolio = useCallback(
    async (value: boolean) => {
      if (showPortfolioTogglePendingRef.current) {
        return;
      }

      showPortfolioTogglePendingRef.current = true;
      setPendingShowPortfolioValue(value);
      try {
        await dispatch(setShowPortfolioValueWithRuntimeReset(value));
      } catch (error) {
        logManager.error(
          'Could not update Show Portfolio setting',
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        showPortfolioTogglePendingRef.current = false;
        setPendingShowPortfolioValue(undefined);
      }
    },
    [dispatch],
  );

  useEffect(() => {
    LanguageList.forEach(lng => {
      if (lng.isoCode === appLanguage) {
        setAppLanguageName(lng.name);
      }
    });
  }, [appLanguage]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => <HeaderBackButton />,
    });
  }, [navigation, theme, t]);

  const settingsData = useMemo<SettingItem[]>(() => {
    return [
      {
        id: 'theme',
        title: t('Theme'),
        type: 'button' as const,
        value:
          colorScheme === 'light'
            ? t('Light Mode')
            : colorScheme === 'dark'
            ? t('Dark Mode')
            : t('System Default'),
        navigationTarget: 'Theme',
      },
      {
        id: 'customizeHome',
        title: t('Customize Home'),
        type: 'navigation' as const,
        navigationTarget: 'Customize Home',
      },
      {
        id: 'showPortfolio',
        title: t('Show Portfolio'),
        type: 'toggle' as const,
        value: displayedShowPortfolioValue,
        isDisabled: typeof pendingShowPortfolioValue === 'boolean',
        onPress: handleToggleShowPortfolio,
      },
      {
        id: 'hideBalances',
        title: t('Hide All Balances'),
        type: 'toggle' as const,
        value: hideAllBalances,
        onPress: (value: boolean) =>
          dispatch(AppActions.toggleHideAllBalances(value)),
      },
      {
        id: 'displayCurrency',
        title: t('Display Currency'),
        type: 'button' as const,
        value: selectedAltCurrency.name,
        navigationTarget: 'Display Currency',
      },
      {
        id: 'language',
        title: t('Language'),
        type: 'button' as const,
        value: appLanguageName,
        navigationTarget: 'Language',
      },
      {
        id: 'resetSettings',
        title: t('Reset All Settings'),
        type: 'reset' as const,
        onPress: () =>
          dispatch(
            showBottomNotificationModal({
              type: 'warning',
              title: t('Reset all settings'),
              message: t('Are you sure you want to reset all settings?'),
              enableBackdropDismiss: true,
              actions: [
                {
                  text: t('RESET'),
                  action: async () => {
                    try {
                      showOngoingProcess('GENERAL_AWAITING');
                      await dispatch(resetAllSettings());
                      hideOngoingProcess();
                      dispatch(
                        showBottomNotificationModal({
                          type: 'success',
                          title: t('Reset complete'),
                          message: t('All settings have been reset.'),
                          enableBackdropDismiss: true,
                          actions: [
                            {
                              text: t('OK'),
                              action: () => null,
                              primary: true,
                            },
                          ],
                        }),
                      );
                    } catch (error) {
                      hideOngoingProcess();
                      logManager.error(
                        'Could not reset settings',
                        error instanceof Error ? error.message : String(error),
                      );
                    }
                  },
                  primary: true,
                },
                {
                  text: t('CANCEL'),
                  action: () => {},
                },
              ],
            }),
          ),
      },
    ];
  }, [
    t,
    colorScheme,
    displayedShowPortfolioValue,
    pendingShowPortfolioValue,
    hideAllBalances,
    selectedAltCurrency.name,
    appLanguageName,
    dispatch,
    handleToggleShowPortfolio,
    hideOngoingProcess,
    showOngoingProcess,
  ]);

  const renderItem = ({item}: {item: SettingItem}) => {
    return (
      <View>
        <Setting
          activeOpacity={item.type === 'toggle' ? 1 : ActiveOpacity}
          onPress={() => {
            if (item.type === 'navigation' || item.type === 'button') {
              navigation.navigate(item.navigationTarget);
            } else if (item.type === 'reset') {
              item.onPress();
            }
          }}>
          <SettingTitle>{item.title}</SettingTitle>
          {item.type === 'navigation' && <AngleRight />}
          {item.type === 'toggle' && (
            <ToggleSwitch
              onChange={item.onPress}
              isEnabled={item.value}
              isDisabled={item.isDisabled}
            />
          )}
          {item.type === 'button' && (
            <Button
              buttonType={'pill'}
              onPress={() => navigation.navigate(item.navigationTarget)}>
              {item.value}
            </Button>
          )}
        </Setting>
        <Hr />
      </View>
    );
  };

  return (
    <SettingsComponent>
      <FlashList<SettingItem>
        data={settingsData}
        renderItem={renderItem}
        estimatedItemSize={56}
        keyExtractor={item => item.id}
      />
    </SettingsComponent>
  );
};

export default General;
