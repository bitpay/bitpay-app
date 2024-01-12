import {useFocusEffect, useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {Trans, useTranslation} from 'react-i18next';
import {Linking, View, TouchableOpacity} from 'react-native';
import Button, {ButtonState} from '../../../../components/button/Button';
import {
  ActiveOpacity,
  HEIGHT,
  WIDTH,
} from '../../../../components/styled/Containers';
import {H5, Paragraph} from '../../../../components/styled/Text';
import {BillScreens} from '../bill/BillGroup';
import {
  SectionContainer,
  SectionHeader,
  SectionHeaderButton,
  SectionHeaderContainer,
} from './styled/ShopTabComponents';
import {LinkBlue, Slate30, SlateDark} from '../../../../styles/colors';
import CautionIconSvg from '../../../../../assets/img/bills/caution.svg';
import {BillList} from '../bill/components/BillList';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {BillPayAccount} from '../../../../store/shop/shop.models';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../../../constants/config';
import {ShopEffects} from '../../../../store/shop';
import {AppActions, AppEffects} from '../../../../store/app';
import BillPitch from '../bill/components/BillPitch';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../bill/utils';
import {sleep} from '../../../../utils/helper-methods';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {CustomErrorMessage} from '../../../wallet/components/ErrorMessages';
import {joinWaitlist} from '../../../../store/app/app.effects';
import UserInfo from './UserInfo';
import {BitPayIdEffects} from '../../../../store/bitpay-id';

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

const verificationBaseUrl = `${BASE_BITPAY_URLS[APP_NETWORK]}/wallet-verify?product=billpay`;

export const Bills = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();
  const logger = useLogger();

  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[APP_NETWORK],
  ) as BillPayAccount[];

  const apiToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.apiToken[APP_NETWORK],
  );

  const isJoinedWaitlist = useAppSelector(({SHOP}) => SHOP.isJoinedWaitlist);

  const [connected, setConnected] = useState(!!accounts.length);

  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const isVerified = !!(user && user.country);

  const [available, setAvailable] = useState(user && user.country === 'US');
  const [waitlistButtonState, setWaitlistButtonState] = useState<ButtonState>();
  const [connectButtonState, setConnectButtonState] = useState<ButtonState>();

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

  const onSubmit = async () => {
    try {
      setWaitlistButtonState('loading');
      user &&
        (await dispatch(
          joinWaitlist(user.email, 'BillPay Waitlist', 'bill-pay'),
        ));
      await sleep(500);
      setWaitlistButtonState('success');
    } catch (err) {
      setWaitlistButtonState('failed');
      logger.warn('Error joining waitlist: ' + BWCErrorMessage(err));
      await sleep(500);
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: BWCErrorMessage(err),
            title: t('Error joining waitlist'),
          }),
        ),
      );
      await sleep(500);
      setWaitlistButtonState(undefined);
    }
  };

  const verifyUserInfo = async () => {
    setConnectButtonState('loading');
    await dispatch(
      BitPayIdEffects.startFetchBasicInfo(apiToken, {
        includeExternalData: true,
      }),
    );
    setConnectButtonState(undefined);
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Confirm Your Info'),
        message: '',
        message2: <UserInfo />,
        enableBackdropDismiss: true,
        onBackdropDismiss: () => {},
        actions: [
          {
            text: t('THIS IS CORRECT'),
            action: () => {
              navigation.navigate(BillScreens.CONNECT_BILLS, {
                tokenType: 'auth',
              });
              dispatch(Analytics.track('Bill Pay — Confirmed User Info'));
            },
            primary: true,
          },
          {
            text: t('UPDATE INFO'),
            action: () => {
              Linking.openURL('https://bitpay.com/request-help/wizard');
              dispatch(Analytics.track('Bill Pay — Clicked Update User Info'));
            },
          },
        ],
      }),
    );
    dispatch(Analytics.track('Bill Pay — Clicked Connect My Bills'));
  };

  return (
    <SectionContainer style={{height: HEIGHT - 270}}>
      {!isVerified ? (
        <>
          <BillPitch />
          <Button
            height={50}
            onPress={() => {
              dispatch(
                AppEffects.openUrlWithInAppBrowser(
                  `${verificationBaseUrl}&context=createAccount`,
                ),
              );
              dispatch(Analytics.track('Bill Pay — Clicked Sign Up'));
            }}>
            {t('Sign Up')}
          </Button>
          <View style={{height: 10}} />
          <Button
            height={50}
            buttonStyle="secondary"
            onPress={() => {
              dispatch(
                AppEffects.openUrlWithInAppBrowser(
                  `${verificationBaseUrl}&context=login`,
                ),
              );
              dispatch(
                Analytics.track('Bill Pay — Clicked I Already Have an Account'),
              );
            }}>
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
                    state={connectButtonState}
                    height={50}
                    onPress={async () => {
                      verifyUserInfo();
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
                    <TouchableOpacity
                      activeOpacity={ActiveOpacity}
                      onPress={() => {
                        navigation.navigate(BillScreens.PAYMENTS, {});
                        dispatch(
                          Analytics.track(
                            'Bill Pay — Clicked View All Payments',
                          ),
                        );
                      }}>
                      <SectionHeaderButton>
                        {t('View All Payments')}
                      </SectionHeaderButton>
                    </TouchableOpacity>
                  </SectionHeaderContainer>
                  <BillList
                    accounts={accounts}
                    variation={'pay'}
                    onPress={account => {
                      navigation.navigate(BillScreens.PAY_BILL, {account});
                      dispatch(
                        Analytics.track(
                          'Bill Pay — Clicked Pay Bill',
                          getBillAccountEventParams(account),
                        ),
                      );
                    }}
                  />
                  <Button
                    style={{marginTop: 20, marginBottom: 10}}
                    height={50}
                    buttonStyle="secondary"
                    onPress={() =>
                      navigation.navigate(BillScreens.PAY_ALL_BILLS, {accounts})
                    }>
                    {t('Pay All Bills')}
                  </Button>
                  {/* <Button
                    style={{marginTop: 20, marginBottom: 10}}
                    state={connectButtonState}
                    height={50}
                    buttonStyle="secondary"
                    onPress={() => {
                      verifyUserInfo();
                      dispatch(
                        Analytics.track(
                          'Bill Pay — Clicked Connect More Bills',
                        ),
                      );
                    }}>
                    {t('Connect More Bills')}
                  </Button> */}
                  <Button
                    buttonType={'link'}
                    onPress={() => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.CONNECT_BILLS_OPTIONS,
                        params: {},
                      });
                      dispatch(
                        Analytics.track(
                          'Bill Pay — Clicked Connect More Bills',
                        ),
                      );
                    }}>
                    {connectButtonState
                      ? t('Loading...')
                      : t('Connect More Bills')}
                  </Button>
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
                {isJoinedWaitlist ? (
                  <Paragraph style={{textAlign: 'center', fontSize: 14}}>
                    {t('You have joined the waitlist.')}
                  </Paragraph>
                ) : (
                  <Button
                    state={waitlistButtonState}
                    style={{width: WIDTH - 32, marginTop: 24}}
                    height={50}
                    buttonStyle="secondary"
                    onPress={onSubmit}>
                    {t('Join waitlist')}
                  </Button>
                )}
              </BillsValueProp>
            </>
          )}
        </>
      )}
    </SectionContainer>
  );
};
