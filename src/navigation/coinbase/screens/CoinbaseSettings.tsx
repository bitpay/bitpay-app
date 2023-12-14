import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl} from 'react-native';
import moment from 'moment';
import styled from 'styled-components/native';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {sleep} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import {Hr} from '../../../components/styled/Containers';
import {
  coinbaseParseErrorToString,
  coinbaseGetUser,
  coinbaseDisconnectAccount,
  isInvalidTokenError,
} from '../../../store/coinbase';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import {CoinbaseGroupParamList} from '../CoinbaseGroup';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import ToggleSwitch from '../../../components/toggle-switch/ToggleSwitch';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {AppActions} from '../../../store/app';

const SettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const SettingsScrollContainer = styled.ScrollView`
  margin-top: 10px;
  padding: 0 ${ScreenGutter};
`;

const Details = styled.View`
  margin-top: 10px;
`;

const Detail = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
`;

const DetailInfo = styled(TextAlign)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
`;

const Item = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
`;

const ButtonContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;

const CoinbaseHeader = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
  margin-top: 25px;
  margin-bottom: 20px;
`;

const IconCoinbase = styled.View`
  width: 23px;
  height: 23px;
`;

const TitleCoinbase = styled(BaseText)`
  margin-left: 8px;
  font-size: 16px;
  font-style: normal;
  font-weight: bold;
  letter-spacing: 0;
`;

export type CoinbaseSettingsScreenParamList = {
  fromScreen: string;
};

const CoinbaseSettings = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const navigation = useNavigation();
  const {
    params: {fromScreen},
  } = useRoute<RouteProp<CoinbaseGroupParamList, 'CoinbaseSettings'>>();

  const [refreshing, setRefreshing] = useState(false);

  const userData = useAppSelector(({COINBASE}) => COINBASE.user[COINBASE_ENV]);
  const isLoadingUserData = useAppSelector(
    ({COINBASE}) => COINBASE.isApiLoading,
  );
  const userError = useAppSelector(({COINBASE}) => COINBASE.getUserError);
  const {hideAllBalances} = useAppSelector(({APP}) => APP);

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = coinbaseParseErrorToString(error);
      const isInvalidToken = isInvalidTokenError(error);
      const textAction = isInvalidToken ? t('Re-Connect') : t('OK');
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Coinbase error'),
          message: errMsg,
          enableBackdropDismiss: false,
          actions: [
            {
              text: textAction,
              action: async () => {
                if (isInvalidToken) {
                  await dispatch(coinbaseDisconnectAccount());
                  navigation.navigate('Tabs', {screen: 'Home'});
                } else {
                  navigation.goBack();
                }
              },
              primary: true,
            },
            {
              text: t('Back'),
              action: () => {
                navigation.goBack();
              },
            },
          ],
        }),
      );
    },
    [dispatch, navigation, t],
  );

  useEffect(() => {
    if (!userData && !isLoadingUserData) {
      dispatch(coinbaseGetUser());
    }

    if (userError) {
      showError(userError);
    }
  }, [dispatch, userData, isLoadingUserData, userError, showError]);

  const deleteAccount = async () => {
    await dispatch(coinbaseDisconnectAccount());
    dispatch(Analytics.track('Coinbase Disconnected', {}));
    if (fromScreen === 'CoinbaseDashboard') {
      navigation.navigate('Tabs', {screen: 'Home'});
    } else {
      // From Settings Tab
      navigation.goBack();
    }
  };

  const confirmDelete = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Confirm'),
        message: t(
          'Are you sure you would like to log out of your Coinbase account?',
        ),
        enableBackdropDismiss: false,
        actions: [
          {
            text: t("Yes, I'm sure"),
            action: () => {
              deleteAccount();
            },
            primary: true,
          },
          {
            text: t('No, cancel'),
            action: () => {},
            primary: false,
          },
        ],
      }),
    );
  };

  const parseTime = (timestamp?: string) => {
    if (!timestamp) {
      return '';
    }
    return moment(timestamp).format('MMM D, YYYY');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    dispatch(startOnGoingProcessModal('FETCHING_COINBASE_DATA'));
    await sleep(1000);

    try {
      await dispatch(coinbaseGetUser());
    } catch (err: CoinbaseErrorsProps | any) {
      showError(err);
    }
    dispatch(dismissOnGoingProcessModal());
    setRefreshing(false);
  };

  return (
    <SettingsContainer>
      <SettingsScrollContainer>
        <RefreshControl
          tintColor={theme.dark ? White : SlateDark}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
        <CoinbaseHeader>
          <IconCoinbase>
            <CoinbaseSvg width="23" height="23" />
          </IconCoinbase>
          <TitleCoinbase>Coinbase</TitleCoinbase>
        </CoinbaseHeader>
        <Hr />
        <Details>
          <Detail>
            <Item>{t('Name')}</Item>
            <DetailInfo align="right">{userData?.data.name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Email')}</Item>
            <DetailInfo align="right">{userData?.data.email}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Country')}</Item>
            <DetailInfo align="right">{userData?.data.country.name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Native Currency')}</Item>
            <DetailInfo align="right">
              {userData?.data.native_currency}
            </DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Created at')}</Item>
            <DetailInfo align="right">
              {parseTime(userData?.data.created_at)}
            </DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Time Zone')}</Item>
            <DetailInfo align="right">{userData?.data.time_zone}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>{t('Hide All Balances')}</Item>

            <ToggleSwitch
              onChange={value =>
                dispatch(AppActions.toggleHideAllBalances(value))
              }
              isEnabled={!!hideAllBalances}
            />
          </Detail>
          <Hr />
        </Details>
      </SettingsScrollContainer>
      <ButtonContainer>
        <Button onPress={() => confirmDelete()} buttonStyle={'secondary'}>
          {t('Sign out')}
        </Button>
      </ButtonContainer>
    </SettingsContainer>
  );
};

export default CoinbaseSettings;
