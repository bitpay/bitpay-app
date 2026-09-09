import React from 'react';
import {StyleSheet, View} from 'react-native';
import {orderBy} from 'lodash';
import {useTheme} from '../../../../contexts';
import {
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/BuyCryptoModals';
import {
  BuyCryptoExchangeKey,
  getBuyEnabledPaymentMethods,
} from '../utils/buy-crypto-utils';
import {
  getSellEnabledPaymentMethods,
  SellCryptoExchangeKey,
} from '../../sell-crypto/utils/sell-crypto-utils';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {BaseText} from '../../../../components/styled/Text';
import Button from '../../../../components/button/Button';
import BanxaLogo from '../../../../components/icons/external-services/banxa/banxa-logo';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import TransakLogo from '../../../../components/icons/external-services/transak/transak-logo';
import {
  Action,
  Black,
  CharcoalBlack,
  LightBlack,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {
  PaymentMethod,
  PaymentMethodKey,
  getPaymentMethodIconByKey,
} from '../constants/BuyCryptoConstants';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {getCachedExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {sleep} from '../../../../utils/helper-methods';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import TimeIcon from '../../../../components/icons/payment-methods/timeIcon';

interface PaymentMethodsModalProps {
  isVisible: boolean;
  context: 'buyCrypto' | 'sellCrypto' | undefined;
  onBackdropPress?: () => void;
  onPress: (paymentMethod: any) => any;
  selectedPaymentMethod: any;
  coin?: string;
  chain?: string;
  currency?: string;
  preSetPartner?: BuyCryptoExchangeKey | SellCryptoExchangeKey | undefined;
}

const styles = StyleSheet.create({
  menuContainer: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '75%',
    paddingTop: 0,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 20,
  },
  paymentMethodCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  paymentMethodCardContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodImgContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  paymentMethodImgCircle: {
    width: 40,
    height: 40,
    borderRadius: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodCheckboxTexts: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginLeft: 15,
  },
  paymentMethodLabel: {
    fontWeight: '500',
    marginBottom: 5,
    letterSpacing: 0,
    lineHeight: 20,
    fontSize: 16,
  },
  paymentMethodProvider: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodProviderText: {
    fontSize: 16,
    lineHeight: 20,
    marginRight: 6,
    letterSpacing: 0,
  },
  paymentMethodProviderLink: {
    color: Action,
  },
});

const MenuContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.menuContainer,
        {backgroundColor: theme.dark ? CharcoalBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const PaymentMethodCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {selected?: boolean}
> = ({selected, style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.paymentMethodCard,
        {
          borderColor: selected ? Action : theme.dark ? SlateDark : '#e6e8ec',
          backgroundColor: selected ? '#2240C440' : 'transparent',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const PaymentMethodCardContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.paymentMethodCardContainer, style]} {...rest} />
);

const PaymentMethodImgContainer: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.paymentMethodImgContainer, style]} {...rest} />
);

const PaymentMethodImgCircle: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.paymentMethodImgCircle,
        {backgroundColor: theme.dark ? LightBlack : '#f0f0f0'},
        style,
      ]}
      {...rest}
    />
  );
};

const PaymentMethodCheckboxTexts: React.FC<
  React.ComponentProps<typeof View>
> = ({style, ...rest}) => (
  <View style={[styles.paymentMethodCheckboxTexts, style]} {...rest} />
);

const PaymentMethodLabel: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.paymentMethodLabel,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
};

const PaymentMethodProvider: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.paymentMethodProvider, style]} {...rest} />;

const PaymentMethodProviderText: React.FC<
  React.ComponentProps<typeof BaseText>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.paymentMethodProviderText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PaymentMethodProviderLink: React.FC<
  React.ComponentProps<typeof BaseText>
> = ({style, ...rest}) => (
  <BaseText style={[styles.paymentMethodProviderLink, style]} {...rest} />
);

const PaymentMethodsModal = ({
  isVisible,
  context,
  onPress,
  onBackdropPress,
  selectedPaymentMethod,
  coin,
  currency,
  chain,
  preSetPartner,
}: PaymentMethodsModalProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const getEnabledPaymentMethods = () => {
    const externalServicesConfig = getCachedExternalServicesConfig()?.config;
    switch (context) {
      case 'buyCrypto':
        return getBuyEnabledPaymentMethods(
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          preSetPartner as BuyCryptoExchangeKey,
          externalServicesConfig?.buyCrypto,
        );

      case 'sellCrypto':
        return getSellEnabledPaymentMethods(
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          user?.country,
          preSetPartner as SellCryptoExchangeKey,
          externalServicesConfig?.sellCrypto,
        );

      default:
        return null;
    }
  };

  const EnabledPaymentMethods = getEnabledPaymentMethods();

  const OrderedEnabledPaymentMethods = EnabledPaymentMethods
    ? orderBy(EnabledPaymentMethods, ['order'], ['asc'])
    : null;

  const showOtherPaymentMethodsInfoSheet = async (
    paymentMethod: PaymentMethod,
    onPress: Function,
  ) => {
    onPress(paymentMethod);
    await sleep(800);
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Other Payment Methods'),
        message: t(
          'By selecting "Other" as your payment method, you will have access to all payment methods enabled by the exchanges based on your country of residence and your selected fiat currency.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const getPartnerLogo = (
    exchange: BuyCryptoExchangeKey,
    iconOnly?: boolean,
  ): React.JSX.Element | null => {
    switch (exchange) {
      case 'banxa':
        return (
          <BanxaLogo
            key={exchange}
            iconOnly={iconOnly}
            width={35}
            height={20}
          />
        );
      case 'moonpay':
        return (
          <MoonpayLogo
            key={exchange}
            iconOnly={iconOnly}
            widthIcon={20}
            heightIcon={20}
          />
        );
      case 'ramp':
        return (
          <View key={exchange} style={{marginRight: iconOnly ? 0 : 10}}>
            <RampLogo
              key={exchange}
              iconOnly={iconOnly}
              width={iconOnly ? 30 : 60}
              height={iconOnly ? 30 : 40}
            />
          </View>
        );
      case 'sardine':
        return (
          <SardineLogo
            key={exchange}
            iconOnly={iconOnly}
            width={30}
            height={20}
          />
        );
      case 'simplex':
        return (
          <SimplexLogo
            key={exchange}
            iconOnly={iconOnly}
            widthIcon={20}
            heightIcon={20}
          />
        );
      case 'transak':
        return (
          <TransakLogo
            key={exchange}
            iconOnly={iconOnly}
            width={30}
            height={17}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}
      enableBackdropDismiss={true}
      backgroundColor={theme.dark ? Black : White}>
      <MenuContainer
        style={{minHeight: 300, paddingTop: 10, paddingBottom: 50}}>
        <ModalHeader>
          <ModalHeaderText>
            {context === 'sellCrypto'
              ? t('Withdrawal Methods')
              : t('Payment Methods')}
          </ModalHeaderText>
          <ModalHeaderRight>
            <Button
              buttonType={'pill'}
              buttonStyle={'cancel'}
              touchableLibrary={'react-native'}
              onPress={onBackdropPress ? onBackdropPress : () => {}}>
              {t('Close')}
            </Button>
          </ModalHeaderRight>
        </ModalHeader>

        <BottomSheetScrollView style={{marginTop: 10}}>
          {OrderedEnabledPaymentMethods
            ? Object.values(OrderedEnabledPaymentMethods).map(paymentMethod => {
                return paymentMethod ? (
                  <PaymentMethodCard
                    key={paymentMethod.method}
                    selected={
                      selectedPaymentMethod
                        ? selectedPaymentMethod.method === paymentMethod.method
                        : false
                    }
                    onPress={() => {
                      paymentMethod.method !== 'other'
                        ? onPress(paymentMethod)
                        : showOtherPaymentMethodsInfoSheet(
                            paymentMethod,
                            onPress,
                          );
                    }}>
                    <PaymentMethodCardContainer>
                      <PaymentMethodImgContainer>
                        <PaymentMethodImgCircle>
                          {getPaymentMethodIconByKey(
                            paymentMethod.method as PaymentMethodKey,
                          )}
                        </PaymentMethodImgCircle>
                      </PaymentMethodImgContainer>
                      <PaymentMethodCheckboxTexts>
                        <PaymentMethodLabel>
                          {paymentMethod.label}
                        </PaymentMethodLabel>

                        <PaymentMethodProvider>
                          {paymentMethod.method !== 'other' ? (
                            <View
                              style={{
                                marginRight: 8,
                              }}>
                              <TimeIcon width={16} height={16} />
                            </View>
                          ) : null}
                          <PaymentMethodProviderText>
                            {paymentMethod.waitingTimeDescription}
                          </PaymentMethodProviderText>
                        </PaymentMethodProvider>
                      </PaymentMethodCheckboxTexts>
                    </PaymentMethodCardContainer>
                  </PaymentMethodCard>
                ) : null;
              })
            : null}
        </BottomSheetScrollView>
      </MenuContainer>
    </SheetModal>
  );
};

export default PaymentMethodsModal;
