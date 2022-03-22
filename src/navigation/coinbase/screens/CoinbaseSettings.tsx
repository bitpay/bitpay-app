import React, {useEffect} from 'react';
import moment from 'moment';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import {sleep} from '../../../utils/helper-methods';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {
  CoinbaseErrorsProps,
  CoinbaseTokenProps,
} from '../../../api/coinbase/coinbase.types';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, TextAlign} from '../../../components/styled/Text';
import {Hr} from '../../../components/styled/Containers';
import {CoinbaseEffects} from '../../../store/coinbase';
import {useAppDispatch} from '../../../utils/hooks';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import CoinbaseAPI from '../../../api/coinbase';

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

const Title = styled(BaseText)`
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 16px;
  font-style: normal;
  font-weight: bold;
  letter-spacing: 0;
  border-bottom-color: #000000;
  border-bottom-width: 2px;
`;

const ButtonContainer = styled.View`
  margin: 0 ${ScreenGutter};
`;

export type CoinbaseSettingsScreenParamList = {
  token: CoinbaseTokenProps | null;
};

const CoinbaseSettings = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const userData = useSelector(({COINBASE}: RootState) => COINBASE.user);

  const userError = useSelector<RootState, CoinbaseErrorsProps | null>(
    ({COINBASE}) => COINBASE.getUserError,
  );

  const showError = async (error: CoinbaseErrorsProps) => {
    const errMsg = CoinbaseAPI.parseErrorToString(error);
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
  };

  useEffect(() => {
    if (userError) {
      if (CoinbaseAPI.isRevokedTokenError(userError)) {
        // Revoked token ... unlink account
        dispatch(CoinbaseEffects.disconnectCoinbaseAccount());
      }
      showError(userError);
    }
  }, [dispatch, userError]);

  const deleteAccount = async () => {
    await sleep(500);
    dispatch(CoinbaseEffects.disconnectCoinbaseAccount());
    navigation.navigate('Tabs', {screen: 'Home'});
  };

  const confirmDelete = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Confirm',
        message: 'Are you sure you want to delete account from this device?',
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
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY');
  };

  return (
    <SettingsContainer>
      <SettingsScrollContainer>
        <Title>Summary</Title>
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
          Unlink Account
        </Button>
      </ButtonContainer>
    </SettingsContainer>
  );
};

export default CoinbaseSettings;
