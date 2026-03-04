import React from 'react';
import {View} from 'react-native';
import {orderBy} from 'lodash';
import styled, {useTheme} from 'styled-components/native';
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

const MenuContainer = styled.View`
  background: ${({theme: {dark}}) => (dark ? CharcoalBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
  padding: 0 16px 16px 20px;
`;

const PaymentMethodCard = styled(TouchableOpacity)<{selected?: boolean}>`
  border: 1px solid
    ${({theme: {dark}, selected}) =>
      selected ? Action : dark ? SlateDark : '#e6e8ec'};
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  background-color: ${({theme: {dark}, selected}) =>
    selected ? '#2240C440' : 'transparent'};
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const PaymentMethodCardContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaymentMethodImgContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const PaymentMethodImgCircle = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#f0f0f0')};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PaymentMethodCheckboxTexts = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-left: 15px;
`;

const PaymentMethodLabel = styled(BaseText)`
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 5px;
  letter-spacing: 0px;
  line-height: 20px;
  font-size: 16px;
`;

const PaymentMethodProvider = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaymentMethodProviderText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  line-height: 20px;
  margin-right: 6px;
  letter-spacing: 0px;
`;

const PaymentMethodProviderLink = styled(BaseText)`
  color: ${Action};
`;

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
    switch (context) {
      case 'buyCrypto':
        return getBuyEnabledPaymentMethods(
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          preSetPartner as BuyCryptoExchangeKey,
        );

      case 'sellCrypto':
        return getSellEnabledPaymentMethods(
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          user?.country,
          preSetPartner as SellCryptoExchangeKey,
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
