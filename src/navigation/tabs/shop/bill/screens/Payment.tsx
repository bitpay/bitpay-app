import React, {useEffect, useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillGroupParamList} from '../BillGroup';
import {
  BaseText,
  H5,
  H7,
  Paragraph,
} from '../../../../../components/styled/Text';
import {useTheme} from '../../../../../contexts';
import {Linking, ScrollView, StyleSheet, View} from 'react-native';
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
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {getBillAccountEventParams} from '../utils';

const styles = StyleSheet.create({
  heroSection: {
    width: '100%',
    padding: 16,
  },
  amountDue: {
    fontSize: 50,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 60,
    marginBottom: 10,
  },
  paymentDateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  paymentDate: {
    marginBottom: 20,
    textAlign: 'center',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 18,
  },
  alertContainer: {
    marginTop: 20,
  },
  servicePausedAlertContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  lineItem: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  lineItemLabel: {
    flexGrow: 1,
  },
});

const HeroSection = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.heroSection, style]} {...rest} />
);

const AmountDue = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.amountDue, style]} {...rest} />
);

const PaymentDateContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.paymentDateContainer, style]} {...rest} />
);

const PaymentDate = ({
  strong,
  style,
  ...rest
}: {strong?: boolean} & React.ComponentProps<typeof Paragraph>) => {
  const theme = useTheme();
  return (
    <Paragraph
      style={[
        styles.paymentDate,
        {
          fontWeight: strong ? '500' : '400',
          borderColor: theme.dark ? LightBlack : Slate30,
        },
        style,
      ]}
      {...rest}
    />
  );
};

const AlertContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.alertContainer, style]} {...rest} />
);

const ServicePausedAlertContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.servicePausedAlertContainer, style]} {...rest} />
);

const LineItem = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.lineItem,
        {borderBottomColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const LineItemLabel = ({style, ...rest}: React.ComponentProps<typeof H7>) => (
  <H7 style={[styles.lineItemLabel, style]} {...rest} />
);

const Payment = ({
  navigation,
  route,
}: NativeStackScreenProps<BillGroupParamList, 'Payment'>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const {account, payment} = route.params;
  const isBillPayEnabled = useAppSelector(({SHOP}) => SHOP.isBillPayEnabled);
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [baseEventParams] = useState(
    getBillAccountEventParams(account, payment),
  );

  const sheetOptions: Array<Option> = [
    {
      onPress: () => {
        Linking.openURL('https://bitpay.com/request-help/wizard');
        dispatch(
          Analytics.track('Bill Pay - Clicked Contact Support', {
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
      headerTitle: () => {
        return <BillAccountPill account={account} payment={payment} />;
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
                      'Bill Pay - Viewed Bill Payment Menu Modal',
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

  useEffect(() => {
    dispatch(
      Analytics.track('Bill Pay - Viewed Bill Payment Page', baseEventParams),
    );
  }, [baseEventParams, dispatch]);

  return (
    <ScrollView>
      {!isBillPayEnabled ? (
        <ServicePausedAlertContainer>
          <BillAlert variant={'servicePaused'} />
        </ServicePausedAlertContainer>
      ) : null}
      <HeroSection>
        <AmountDue>{formatFiatAmount(payment.amount, 'USD')}</AmountDue>
        <PaymentDateContainer>
          <PaymentDate>
            {t('Amount paid on:') + ' '}
            <Paragraph style={{fontWeight: '500'}}>
              {moment(payment.createdOn).format('MM/DD/YY')}
            </Paragraph>
          </PaymentDate>
        </PaymentDateContainer>
      </HeroSection>
      <SectionContainer style={{marginTop: 20, flexGrow: 1}}>
        <LineItem>
          <LineItemLabel>{t('Sent to')}</LineItemLabel>
          <BillAccountPill account={account} payment={payment} />
        </LineItem>
        <LineItem>
          <LineItemLabel>{t('Convenience fee')}</LineItemLabel>
          <Paragraph>
            {payment.convenienceFee
              ? formatFiatAmount(payment.convenienceFee, 'USD')
              : t('Waived')}
          </Paragraph>
        </LineItem>
        <LineItem>
          <LineItemLabel>Status</LineItemLabel>
          <BillStatus account={account} payment={payment} />
        </LineItem>
        {payment.estimatedCompletionDate ? (
          <LineItem>
            <LineItemLabel>{t('Estimated Posting Date')}</LineItemLabel>
            <Paragraph>
              {moment(payment.estimatedCompletionDate).format('MM/DD/YY')}
            </Paragraph>
          </LineItem>
        ) : null}

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
