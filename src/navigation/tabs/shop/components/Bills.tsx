import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {Trans, useTranslation} from 'react-i18next';
import {View} from 'react-native';
import Button from '../../../../components/button/Button';
import {HEIGHT, WIDTH} from '../../../../components/styled/Containers';
import {H5, Paragraph} from '../../../../components/styled/Text';
import {BillScreens} from '../bill/BillStack';
import {
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
} from './styled/ShopTabComponents';
import {LinkBlue, Slate30, SlateDark} from '../../../../styles/colors';
import CautionIconSvg from '../../../../../assets/img/bills/caution.svg';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import {BillList} from '../bill/components/BillList';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {BillPayAccount} from '../../../../store/shop/shop.models';
import {APP_NETWORK} from '../../../../constants/config';
import {ShopEffects} from '../../../../store/shop';
import {AppActions} from '../../../../store/app';
import BillPitch from '../bill/components/BillPitch';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../bill/utils';

const Subtitle = styled(Paragraph)`
  font-size: 14px;
  line-height: 21px;
  width: 310px;
  margin-top: 10px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
  text-align: center;
  margin-bottom: 20px;
`;

const BillsValueProp = styled.View`
  flex-grow: 1;
  align-items: center;
  justify-content: center;
`;

const CautionIcon = styled(CautionIconSvg)`
  margin-bottom: 24px;
`;

export const Bills = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();

  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[APP_NETWORK],
  ) as BillPayAccount[];

  const [connected, setConnected] = useState(!!accounts.length);

  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const isVerified = !!(user && user.country);

  const [available, setAvailable] = useState(user && user.country === 'US');

  useEffect(() => {
    const billsConnected = !!accounts.length && !!user?.methodEntityId;
    setConnected(billsConnected);
    const isAvailable = async () => {
      if (user && user.country === 'US' && !connected) {
        const billPayAvailable = await dispatch(
          ShopEffects.startCheckIfBillPayAvailable(),
        ).catch(_ => false);
        setAvailable(billPayAvailable);
      }
    };
    isAvailable();
  }, [accounts.length, connected, dispatch, user]);

  useFocusEffect(() => {
    dispatch(Analytics.track('Bill Pay — Viewed Bills Page'));
  });

  return (
    <SectionContainer style={{height: HEIGHT - 270}}>
      {!isVerified ? (
        <>
          <BillPitch />
          <Button height={50} onPress={() => {}}>
            {t('Sign Up')}
          </Button>
          <View style={{height: 10}} />
          <Button height={50} buttonStyle="secondary" onPress={() => {}}>
            {t('I already have an account')}
          </Button>
        </>
      ) : (
        <>
          {available ? (
            <>
              {!connected ? (
                <>
                  <BillPitch />
                  <Button
                    height={50}
                    onPress={() => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.CONNECT_BILLS,
                        params: {},
                      });
                      dispatch(
                        Analytics.track('Bill Pay — Clicked Connect My Bills'),
                      );
                    }}>
                    {t('Connect My Bills')}
                  </Button>
                </>
              ) : (
                <>
                  <SectionHeaderContainer>
                    <SectionHeader>{t('My Bills')}</SectionHeader>
                    <TouchableWithoutFeedback
                      onPress={() => {
                        navigation.navigate('Bill', {
                          screen: BillScreens.PAYMENTS,
                          params: {},
                        });
                        dispatch(
                          Analytics.track(
                            'Bill Pay — Clicked View All Payments',
                          ),
                        );
                      }}>
                      <SectionHeaderButton>
                        {t('View All Payments')}
                      </SectionHeaderButton>
                    </TouchableWithoutFeedback>
                  </SectionHeaderContainer>
                  <BillList
                    accounts={accounts}
                    variation={'pay'}
                    onPress={account => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.PAY_BILL,
                        params: {account},
                      });
                      dispatch(
                        Analytics.track(
                          'Bill Pay — Clicked Pay Bill',
                          getBillAccountEventParams(account),
                        ),
                      );
                    }}
                  />
                  {/* <Button
                    style={{marginTop: 20, marginBottom: 10}}
                    height={50}
                    buttonStyle="secondary"
                    onPress={() =>
                      navigation.navigate('Bill', {
                        screen: BillScreens.PAY_ALL_BILLS,
                        params: {accounts},
                      })
                    }>
                    {t('Pay All Bills')}
                  </Button> */}
                  <Button
                    style={{marginTop: 20, marginBottom: 10}}
                    height={50}
                    buttonStyle="secondary"
                    onPress={() => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.CONNECT_BILLS,
                        params: {accounts},
                      });
                      dispatch(
                        Analytics.track(
                          'Bill Pay — Clicked Connect More Bills',
                        ),
                      );
                    }}>
                    {t('Connect More Bills')}
                  </Button>
                  {/* <Button
                    buttonType={'link'}
                    onPress={() => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.CONNECT_BILLS,
                        params: {},
                      });
                    }}>
                    {t('Connect More Bills')}
                  </Button> */}
                </>
              )}
            </>
          ) : (
            <>
              <BillsValueProp>
                <CautionIcon />
                <H5>{t("Bill Pay isn't available in your area")}</H5>
                <Subtitle>
                  <Trans
                    i18nKey="BillPayUnavailableInYourLocation"
                    values={{states: t('states')}}
                    components={[
                      <Subtitle
                        style={{color: LinkBlue}}
                        onPress={() =>
                          dispatch(
                            AppActions.showBottomNotificationModal({
                              type: 'info',
                              title: t('Available States'),
                              message: t(
                                'Bill Pay is available in Alabama, Alaska, Delaware, District of Columbia, Florida, Georgia, Illinois, Iowa, Kansas, Maine, Massachusetts, Mississippi, Nebraska, New Jersey, New Mexico, Ohio, Oregon, South Dakota, Tennessee, Washington',
                              ),
                              enableBackdropDismiss: true,
                              onBackdropDismiss: () => {},
                              actions: [
                                {
                                  text: t('GOT IT'),
                                  action: () => {},
                                  primary: true,
                                },
                              ],
                            }),
                          )
                        }
                      />,
                    ]}
                  />
                </Subtitle>
                <Button
                  style={{width: WIDTH - 32, marginTop: 24}}
                  height={50}
                  buttonStyle="secondary"
                  onPress={() => {
                    console.log('joining waitlist');
                  }}>
                  {t('Join waitlist')}
                </Button>
              </BillsValueProp>
            </>
          )}
        </>
      )}
    </SectionContainer>
  );
};
