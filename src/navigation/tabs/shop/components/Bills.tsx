import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import {Trans, useTranslation} from 'react-i18next';
import {View} from 'react-native';
import Button from '../../../../components/button/Button';
import {HEIGHT, WIDTH} from '../../../../components/styled/Containers';
import {H5, Paragraph} from '../../../../components/styled/Text';
import {BaseText} from '../../../wallet/components/KeyDropdownOption';
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
const BillsZeroState = require('../../../../../assets/img/bills/bills-zero-state.png');

const Title = styled(BaseText)`
  font-size: 24px;
  font-weight: 400;
  line-height: 28px;
  text-align: center;
  margin-top: 20px;
  width: 341px;
`;

const BoldTitle = styled(Title)`
  font-weight: 600;
`;

const Subtitle = styled(Paragraph)`
  font-size: 14px;
  line-height: 21px;
  width: 310px;
  margin-top: 10px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
  text-align: center;
  margin-bottom: 20px;
`;

const TitleContainer = styled.View`
  align-items: center;
`;

const BillsValueProp = styled.View`
  flex-grow: 1;
  align-items: center;
  justify-content: center;
`;

const BillsImage = styled.Image`
  width: 317px;
  height: 242px;
  margin-top: 20px;
`;

const CautionIcon = styled(CautionIconSvg)`
  margin-bottom: 24px;
`;

const WhyUseThis = () => {
  const {t} = useTranslation();
  return (
    <BillsValueProp>
      <BillsImage source={BillsZeroState} />
      <TitleContainer>
        <Title>
          {t('Pay bills straight from your')}{' '}
          <BoldTitle>{t('BitPay wallet')}</BoldTitle>
        </Title>
        <Subtitle>
          {t('Make payments on everything from credit cards to mortgages.')}
        </Subtitle>
      </TitleContainer>
    </BillsValueProp>
  );
};

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
    const billsConnected = !!accounts.length;
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

  return (
    <SectionContainer style={{height: HEIGHT - 270}}>
      {!isVerified ? (
        <>
          <WhyUseThis />
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
                  <WhyUseThis />
                  <Button
                    height={50}
                    onPress={() => {
                      navigation.navigate('Bill', {
                        screen: BillScreens.CONNECT_BILLS,
                        params: {},
                      });
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
                      }}>
                      <SectionHeaderButton>
                        {t('View All Payments')}
                      </SectionHeaderButton>
                    </TouchableWithoutFeedback>
                  </SectionHeaderContainer>
                  <BillList
                    accounts={accounts}
                    variation={'pay'}
                    onPress={(account: any) =>
                      navigation.navigate('Bill', {
                        screen: BillScreens.PAY_BILL,
                        params: {account},
                      })
                    }
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
                    onPress={() =>
                      navigation.navigate('Bill', {
                        screen: BillScreens.PAY_ALL_BILLS,
                        params: {accounts},
                      })
                    }>
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
                    values={{states: 'states'}}
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
