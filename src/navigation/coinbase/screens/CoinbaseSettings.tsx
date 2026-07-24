import React, {useCallback, useEffect, useState} from 'react';
import {
  RefreshControl,
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import moment from 'moment';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useTheme,
} from '@react-navigation/native';
import {StackActions} from '@react-navigation/core';
import {sleep} from '../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
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
import {Analytics} from '../../../store/analytics/analytics.effects';
import {useOngoingProcess} from '../../../contexts';

const screenGutter = parseInt(ScreenGutter, 10);

const styles = StyleSheet.create({
  settingsContainer: {
    flex: 1,
  },
  settingsScrollContainer: {
    marginTop: 10,
    paddingHorizontal: screenGutter,
  },
  details: {
    marginTop: 10,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  detailInfo: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  item: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: 0,
  },
  buttonContainer: {
    marginHorizontal: screenGutter,
  },
  coinbaseHeader: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    marginTop: 25,
    marginBottom: 20,
  },
  iconCoinbase: {
    width: 23,
    height: 23,
  },
  titleCoinbase: {
    marginLeft: 8,
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'bold',
    letterSpacing: 0,
  },
});

const DetailInfo = ({
  align,
  children,
}: {
  align: 'center' | 'left' | 'right' | 'justify';
  children: React.ReactNode;
}) => (
  <TextAlign align={align} style={styles.detailInfo}>
    {children}
  </TextAlign>
);

const Item = ({children}: {children: React.ReactNode}) => (
  <BaseText style={styles.item}>{children}</BaseText>
);

const TitleCoinbase = ({children}: {children: React.ReactNode}) => (
  <BaseText style={styles.titleCoinbase}>{children}</BaseText>
);

export type CoinbaseSettingsScreenParamList = {
  fromScreen: string;
};

const CoinbaseSettings = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();

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
      navigation.dispatch(StackActions.popToTop());
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
    showOngoingProcess('FETCHING_COINBASE_DATA');
    await sleep(1000);

    try {
      await dispatch(coinbaseGetUser());
    } catch (err: CoinbaseErrorsProps | any) {
      showError(err);
    }
    hideOngoingProcess();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.settingsContainer}>
      <ScrollView style={styles.settingsScrollContainer}>
        <RefreshControl
          tintColor={theme.dark ? White : SlateDark}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
        <View style={styles.coinbaseHeader}>
          <View style={styles.iconCoinbase}>
            <CoinbaseSvg width="23" height="23" />
          </View>
          <TitleCoinbase>Coinbase</TitleCoinbase>
        </View>
        <Hr />
        <View style={styles.details}>
          <View style={styles.detail}>
            <Item>{t('Name')}</Item>
            <DetailInfo align="right">{userData?.data.name}</DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Item>{t('Email')}</Item>
            <DetailInfo align="right">{userData?.data.email}</DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Item>{t('Country')}</Item>
            <DetailInfo align="right">{userData?.data.country.name}</DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Item>{t('Native Currency')}</Item>
            <DetailInfo align="right">
              {userData?.data.native_currency}
            </DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Item>{t('Created at')}</Item>
            <DetailInfo align="right">
              {parseTime(userData?.data.created_at)}
            </DetailInfo>
          </View>
          <Hr />
          <View style={styles.detail}>
            <Item>{t('Time Zone')}</Item>
            <DetailInfo align="right">{userData?.data.time_zone}</DetailInfo>
          </View>
          <Hr />
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <Button
          onPress={() => confirmDelete()}
          buttonStyle={'danger'}
          buttonOutline={true}>
          {t('Sign out')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default CoinbaseSettings;
