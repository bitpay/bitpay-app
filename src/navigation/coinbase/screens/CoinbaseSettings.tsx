import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl} from 'react-native';
import moment from 'moment';
import styled from 'styled-components/native';
import {useNavigation, useTheme} from '@react-navigation/native';
import {sleep} from '../../../utils/helper-methods';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
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
} from '../../../store/coinbase';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';

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

const CoinbaseSettings = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);

  const userData = useAppSelector(({COINBASE}) => COINBASE.user[COINBASE_ENV]);
  const isLoadingUserData = useAppSelector(
    ({COINBASE}) => COINBASE.isApiLoading,
  );
  const userError = useAppSelector(({COINBASE}) => COINBASE.getUserError);

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = coinbaseParseErrorToString(error);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Coinbase Error',
          message: errMsg,
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {
                navigation.navigate('Tabs', {screen: 'Home'});
              },
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch, navigation],
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
    dispatch(coinbaseDisconnectAccount());
    await sleep(1000);
    navigation.navigate('Tabs', {screen: 'Home'});
  };

  const confirmDelete = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Confirm',
        message:
          'Are you sure you would like to log out of your Coinbase account?',
        enableBackdropDismiss: false,
        actions: [
          {
            text: "Yes, I'm sure",
            action: () => {
              deleteAccount();
            },
            primary: true,
          },
          {
            text: 'No, cancel',
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
    dispatch(
      showOnGoingProcessModal(OnGoingProcessMessages.FETCHING_COINBASE_DATA),
    );
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
            <Item>Name</Item>
            <DetailInfo align="right">{userData?.data.name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>Email</Item>
            <DetailInfo align="right">{userData?.data.email}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>Country</Item>
            <DetailInfo align="right">{userData?.data.country.name}</DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>Native Currency</Item>
            <DetailInfo align="right">
              {userData?.data.native_currency}
            </DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>Created at</Item>
            <DetailInfo align="right">
              {parseTime(userData?.data.created_at)}
            </DetailInfo>
          </Detail>
          <Hr />
          <Detail>
            <Item>Time Zone</Item>
            <DetailInfo align="right">{userData?.data.time_zone}</DetailInfo>
          </Detail>
          <Hr />
        </Details>
      </SettingsScrollContainer>
      <ButtonContainer>
        <Button onPress={() => confirmDelete()} buttonStyle={'secondary'}>
          Sign out
        </Button>
      </ButtonContainer>
    </SettingsContainer>
  );
};

export default CoinbaseSettings;
