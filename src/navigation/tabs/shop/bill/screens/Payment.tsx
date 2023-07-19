import React, {useLayoutEffect, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import {BillStackParamList} from '../BillStack';
import {H5, H7, Paragraph} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {BaseText} from '../../../../wallet/components/KeyDropdownOption';
import {Linking, ScrollView} from 'react-native';
import {
  BillOption,
  SectionContainer,
} from '../../components/styled/ShopTabComponents';
import BillStatus from '../components/BillStatus';
import {formatFiatAmount} from '../../../../../utils/helper-methods';
import moment from 'moment';
import BillAlert from '../components/BillAlert';
import {HeaderRightContainer} from '../../../../../components/styled/Containers';
import Settings from '../../../../../components/settings/Settings';
import OptionsSheet, {Option} from '../../../../wallet/components/OptionsSheet';
import {LightBlack, Slate30} from '../../../../../styles/colors';
import {BillAccountPill} from '../components/BillAccountPill';
import {useFocusEffect} from '@react-navigation/native';
import {useAppDispatch} from '../../../../../utils/hooks';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../utils';

const HeroSection = styled.View`
  width: 100%;
  padding: 16px;
`;

const AmountDue = styled(BaseText)`
  font-size: 50px;
  font-weight: 500;
  text-align: center;
  margin-top: 110px;
`;

const PaymentDateContainer = styled.View`
  flex-direction: row;
  align-item: center;
  justify-content: center;
`;

const PaymentDate = styled(Paragraph)<{strong?: boolean}>`
  margin-bottom: 20px;
  text-align: center;
  font-weight: ${({strong}) => (strong ? 500 : 400)};
  border: 1px solid ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  padding: 5px 15px;
  border-radius: 18px;
`;

const AlertContainer = styled.View`
  margin-top: 20px;
`;

const LineItem = styled.View`
  flex-direction: row;
  padding: 18px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Slate30)};
  align-items: center;
`;

const LineItemLabel = styled(H7)`
  flex-grow: 1;
`;

const Payment = ({
  navigation,
  route,
}: StackScreenProps<BillStackParamList, 'Payment'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {account, payment} = route.params;
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);

  const baseEventParams = {
    ...getBillAccountEventParams(account),
    amount: payment.amount,
  };

  const sheetOptions: Array<Option> = [
    {
      onPress: () => {
        Linking.openURL('https://bitpay.com/request-help/wizard');
        dispatch(
          Analytics.track('Bill Pay — Clicked Contact Support', {
            ...baseEventParams,
            context: 'Bill Payment',
          }),
        );
      },
      optionElement: () => {
        return (
          <BillOption isLast={true}>
            <H5>{t('Contact Support')}</H5>
          </BillOption>
        );
      },
    },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: () => {
        return <BillAccountPill account={account} />;
      },
      headerRight: () => {
        return (
          <>
            <HeaderRightContainer>
              <Settings
                onPress={() => {
                  setIsOptionsSheetVisible(true);
                  dispatch(
                    Analytics.track(
                      'Bill Pay — Viewed Bill Payment Menu Modal',
                      baseEventParams,
                    ),
                  );
                }}
              />
            </HeaderRightContainer>
          </>
        );
      },
    });
  });

  useFocusEffect(() => {
    dispatch(
      Analytics.track('Bill Pay — Viewed Bill Payment Page', baseEventParams),
    );
  });

  return (
    <ScrollView>
      <HeroSection>
        <AmountDue>{formatFiatAmount(payment.amount, 'USD')}</AmountDue>
        <PaymentDateContainer>
          <PaymentDate>
            {t('Amount paid on: ')}
            <Paragraph style={{fontWeight: '500'}}>
              {moment(payment.createdOn).format('MM/DD/YY')}
            </Paragraph>
          </PaymentDate>
        </PaymentDateContainer>
      </HeroSection>
      <SectionContainer style={{marginTop: 20, flexGrow: 1}}>
        <LineItem>
          <LineItemLabel>Sent to</LineItemLabel>
          <BillAccountPill account={account} />
        </LineItem>
        <LineItem>
          <LineItemLabel>Convenience fee</LineItemLabel>
          <Paragraph>
            {formatFiatAmount(payment.convenienceFee, 'USD')}
          </Paragraph>
        </LineItem>
        <LineItem>
          <LineItemLabel>Status</LineItemLabel>
          <BillStatus account={account} payment={payment} />
        </LineItem>
        {!payment.status ||
        ['pending', 'processing'].includes(payment.status) ? (
          <AlertContainer>
            <BillAlert />
          </AlertContainer>
        ) : null}
      </SectionContainer>
      <OptionsSheet
        isVisible={isOptionsSheetVisible}
        closeModal={() => setIsOptionsSheetVisible(false)}
        options={sheetOptions}
        paddingHorizontal={0}
      />
    </ScrollView>
  );
};

export default Payment;
