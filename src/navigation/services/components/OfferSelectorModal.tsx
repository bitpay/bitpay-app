import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewProps,
  TextProps,
} from 'react-native';
import {useTheme} from '../../../contexts';
import {useAppDispatch, useAppSelector, useLogger} from '../../../utils/hooks';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import InfoSvg from '../../../../assets/img/info.svg';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  Action,
  White,
  Black,
  Slate,
  LightBlack,
  NeutralSlate,
  SlateDark,
  ProgressBlue,
  Slate30,
  Success25,
  LightBlue,
} from '../../../styles/colors';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {BuyCryptoExchangeKey} from '../buy-crypto/utils/buy-crypto-utils';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import {CryptoOffer, SellCryptoOffer} from './externalServicesOfferSelector';
import {
  PaymentMethod,
  PaymentMethodKey,
  getPaymentMethodIconByKey,
} from '../buy-crypto/constants/BuyCryptoConstants';
import {ItemDivisor} from '../buy-crypto/styled/BuyCryptoCard';
import {
  BaseText,
  H4,
  H5,
  H7,
  Small,
  TextAlign,
} from '../../../components/styled/Text';
import {
  TermsContainerOffer,
  TermsText,
} from '../buy-crypto/styled/BuyCryptoTerms';
import ArchaxFooter from '../../../components/archax/archax-footer';
import PaymentMethodsModal from '../buy-crypto/components/PaymentMethodModal';
import ArrowDownSvg from '../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../assets/img/chevron-up.svg';
import BuyCryptoTerms from '../buy-crypto/components/terms/BuyCryptoTerms';
import {SellCryptoExchangeKey} from '../sell-crypto/utils/sell-crypto-utils';
import haptic from '../../../components/haptic-feedback/haptic';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {isEuCountry} from '../../../store/location/location.effects';
import {WithdrawalMethod} from '../sell-crypto/constants/SellCryptoConstants';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import ArchaxBanner from '../../../components/archax/archax-banner';
import {Analytics} from '../../../store/analytics/analytics.effects';

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
  },
  modalHeader: {
    height: 50,
    marginRight: 10,
    marginLeft: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeModalButtonContainer: {
    position: 'absolute',
    left: 0,
  },
  closeModalButton: {
    height: 41,
    width: 41,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginTop: 10,
    marginRight: 16,
    marginBottom: 10,
    marginLeft: 16,
  },
  sectionTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    marginRight: 10,
  },
  paymentMethodSelectorContainer: {
    borderWidth: 1,
    height: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodSelectorContainerLeft: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  paymentMethodImgContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: 48,
    marginRight: 10,
  },
  paymentMethodImg: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodSelectorText: {
    fontSize: 13,
  },
  selectorArrowContainer: {
    marginLeft: 10,
  },
  partnersText: {
    fontSize: 13,
    lineHeight: 20,
  },
  spinnerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyCryptoExpandibleCard: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 20,
    marginRight: 15,
    marginBottom: 0,
    marginLeft: 15,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  offerDataContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  offerFeeDataContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  offerRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerRowLeft: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  bestOfferTagContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 5,
  },
  bestOfferTag: {
    borderRadius: 50,
    height: 25,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  feesInfoTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerDataInfoContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    width: 25,
    height: 25,
  },
  offerDataInfoLabel: {
    marginRight: 10,
  },
  offerDataWarningContainer: {
    maxWidth: '85%',
    marginTop: 20,
  },
  offerDataWarningMsg: {
    color: '#df5264',
    marginRight: 10,
    fontSize: 12,
  },
  offerDataInfoText: {
    fontSize: 16,
  },
  offerDataInfoTextSec: {
    marginTop: 10,
  },
  offerDataInfoTotal: {
    fontWeight: 'bold',
  },
  offerExpandibleItem: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  offerDataRightContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  offerSelectorModalContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletSelector: {
    height: 36,
    borderRadius: 27.5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    minWidth: 146,
  },
  walletSelectorLeft: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorRight: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectorName: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    marginLeft: 8,
  },
});

const SafeAreaView: React.FC<ViewProps> = ({style, ...rest}) => (
  <RNSafeAreaView style={[styles.safeAreaView, style]} {...rest} />
);

const ModalHeader: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.modalHeader, style]} {...rest} />
);

const CloseModalButtonContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.closeModalButtonContainer, style]} {...rest} />
);

const CloseModalButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.closeModalButton, style]} {...rest} />
);

const ModalTitleContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.modalTitleContainer, style]} {...rest} />
);

const SectionContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.sectionContainer, style]} {...rest} />
);

const SectionTitleContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.sectionTitleContainer, style]} {...rest} />
);

const SectionTitle = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.sectionTitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
SectionTitle.displayName = 'SectionTitle';

const PaymentMethodSelectorContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.paymentMethodSelectorContainer,
        {borderColor: theme.dark ? Slate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const PaymentMethodSelectorContainerLeft: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity
    style={[styles.paymentMethodSelectorContainerLeft, style]}
    {...rest}
  />
);

const PaymentMethodImgContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.paymentMethodImgContainer, style]} {...rest} />
);

const PaymentMethodImg: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.paymentMethodImg, style]} {...rest} />
);

const PaymentMethodSelectorText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.paymentMethodSelectorText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
PaymentMethodSelectorText.displayName = 'PaymentMethodSelectorText';

const SelectorArrowContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.selectorArrowContainer, style]} {...rest} />
);

const PartnersText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.partnersText,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
PartnersText.displayName = 'PartnersText';

const SpinnerContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.spinnerContainer, style]} {...rest} />
);

const BuyCryptoExpandibleCard: React.FC<
  React.ComponentProps<typeof TouchableOpacity> & {selected?: boolean}
> = ({style, selected, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.buyCryptoExpandibleCard,
        {
          borderColor: theme.dark
            ? selected
              ? Action
              : SlateDark
            : selected
            ? Action
            : '#e6e8ec',
          backgroundColor: theme.dark
            ? selected
              ? '#2240C440'
              : 'transparent'
            : selected
            ? LightBlue
            : 'transparent',
        },
        style,
      ]}
      {...rest}
    />
  );
};

const OfferDataContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerDataContainer, style]} {...rest} />
);

const OfferFeeDataContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.offerFeeDataContainer, style]} {...rest} />
);

const OfferRow: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerRow, style]} {...rest} />
);

const OfferRowLeft: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerRowLeft, style]} {...rest} />
);

const BestOfferTagContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.bestOfferTagContainer, style]} {...rest} />
);

const BestOfferTag: React.FC<ViewProps> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bestOfferTag,
        {backgroundColor: theme.dark ? '#2FCFA4' : '#cbf3e8'},
        style,
      ]}
      {...rest}
    />
  );
};

const BestOfferTagText = React.forwardRef<
  Text,
  React.ComponentProps<typeof Small>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Small
      ref={ref}
      style={[{color: theme.dark ? Success25 : '#004D27'}, style]}
      {...rest}
    />
  );
});
BestOfferTagText.displayName = 'BestOfferTagText';

const FeesInfoTextContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.feesInfoTextContainer, style]} {...rest} />
);

const FeesInfoText = React.forwardRef<Text, React.ComponentProps<typeof Small>>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Small
        ref={ref}
        style={[{color: theme.dark ? White : SlateDark}, style]}
        {...rest}
      />
    );
  },
);
FeesInfoText.displayName = 'FeesInfoText';

const OfferDataCryptoAmount = React.forwardRef<
  Text,
  React.ComponentProps<typeof H5>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H5
      ref={ref}
      style={[{color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
});
OfferDataCryptoAmount.displayName = 'OfferDataCryptoAmount';

const OfferDataInfoContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerDataInfoContainer, style]} {...rest} />
);

const OfferDataInfoLabel = React.forwardRef<
  Text,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[
        styles.offerDataInfoLabel,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferDataInfoLabel.displayName = 'OfferDataInfoLabel';

const OfferDataWarningContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerDataWarningContainer, style]} {...rest} />
);

const OfferDataWarningMsg = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.offerDataWarningMsg, style]} {...rest} />
));
OfferDataWarningMsg.displayName = 'OfferDataWarningMsg';

const OfferDataInfoText = React.forwardRef<
  Text,
  React.ComponentProps<typeof BaseText>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <BaseText
      ref={ref}
      style={[
        styles.offerDataInfoText,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferDataInfoText.displayName = 'OfferDataInfoText';

const OfferDataInfoTextSec = React.forwardRef<
  Text,
  React.ComponentProps<typeof H7>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H7
      ref={ref}
      style={[
        styles.offerDataInfoTextSec,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferDataInfoTextSec.displayName = 'OfferDataInfoTextSec';

const OfferDataInfoTotal = React.forwardRef<
  Text,
  React.ComponentProps<typeof H5>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <H5
      ref={ref}
      style={[
        styles.offerDataInfoTotal,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});
OfferDataInfoTotal.displayName = 'OfferDataInfoTotal';

const OfferExpandibleItem: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerExpandibleItem, style]} {...rest} />
);

const OfferDataRightContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerDataRightContainer, style]} {...rest} />
);

export const OfferSelectorModalContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => <View style={[styles.offerSelectorModalContainer, style]} {...rest} />;

export const WalletSelector: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.walletSelector,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...rest}
    />
  );
};

export const WalletSelectorLeft: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorLeft, style]} {...rest} />
);

export const WalletSelectorRight: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.walletSelectorRight, style]} {...rest} />
);

export const WalletSelectorName = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <Text
        ref={ref}
        style={[
          styles.walletSelectorName,
          {color: theme.dark ? White : SlateDark},
          style,
        ]}
        {...rest}
      />
    );
  },
);
WalletSelectorName.displayName = 'WalletSelectorName';

interface OfferSelectorModalScreenProps {
  modalContext: 'buyCrypto' | 'sellCrypto';
  modalTitle?: string;
  offers?:
    | {
        [key in BuyCryptoExchangeKey]: CryptoOffer;
      }
    | {
        [key in SellCryptoExchangeKey]: SellCryptoOffer;
      };
  showOffersLoading?: boolean;
  selectedPaymentMethod?: PaymentMethod | WithdrawalMethod;
  selectedOffer?: CryptoOffer | SellCryptoOffer;
  onPaymentMethodSelected: (
    paymentMethod: PaymentMethod | WithdrawalMethod,
  ) => void;
  coin: string;
  fiatCurrency: string;
  country: string;
  selectedWallet: Wallet;
  preSetPartner?: BuyCryptoExchangeKey;
  offerSelectorOnDismiss?: (
    selectedOffer?: CryptoOffer | SellCryptoOffer | undefined,
  ) => void;
}

const OfferSelectorModal: React.FC<OfferSelectorModalScreenProps> = ({
  modalContext,
  modalTitle,
  offers,
  showOffersLoading,
  selectedPaymentMethod,
  selectedOffer,
  onPaymentMethodSelected,
  coin,
  fiatCurrency,
  country,
  selectedWallet,
  preSetPartner,
  offerSelectorOnDismiss,
}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const showArchaxBanner = useAppSelector(({APP}) => APP.showArchaxBanner);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);

  const [updateView, setUpdateView] = useState<number>(0);

  useEffect(() => {
    setUpdateView(Math.random());
  }, [selectedPaymentMethod]);

  const expandCard = (offer: CryptoOffer | SellCryptoOffer) => {
    const key = offer.key;
    if (!offer.fiatMoney) {
      return;
    }
    if (
      offers &&
      (offers as Record<string, CryptoOffer | SellCryptoOffer>)[key]
    ) {
      (offers as Record<string, CryptoOffer | SellCryptoOffer>)[key].expanded =
        (offers as Record<string, CryptoOffer | SellCryptoOffer>)[key].expanded
          ? false
          : true;
    }
    setUpdateView(Math.random());
  };

  return (
    <>
      {showArchaxBanner && (
        <ArchaxBanner isSmallScreen={false} noMarginTop={true} />
      )}
      <ModalHeader>
        <CloseModalButtonContainer>
          <CloseModalButton
            onPress={() => {
              if (offerSelectorOnDismiss) {
                offerSelectorOnDismiss(undefined);
              }
            }}>
            <CloseModal
              {...{
                width: 20,
                height: 20,
                color: theme.dark ? 'white' : 'black',
              }}
            />
          </CloseModalButton>
        </CloseModalButtonContainer>
        {!!modalTitle && (
          <ModalTitleContainer>
            <TextAlign align={'center'}>
              <H4>{modalTitle}</H4>
            </TextAlign>
          </ModalTitleContainer>
        )}
      </ModalHeader>
      <SafeAreaView style={{flex: 1, marginBottom: 40}}>
        <SectionContainer>
          <SectionTitleContainer>
            <SectionTitle>{t('Pay With')}</SectionTitle>
          </SectionTitleContainer>
          <PaymentMethodSelectorContainer
            onPress={() => setPaymentMethodModalVisible(true)}>
            {selectedPaymentMethod ? (
              <PaymentMethodSelectorContainerLeft>
                <PaymentMethodImgContainer>
                  <PaymentMethodImg key={selectedPaymentMethod.method}>
                    {getPaymentMethodIconByKey(
                      selectedPaymentMethod.method as PaymentMethodKey,
                      30,
                      30,
                    )}
                  </PaymentMethodImg>
                </PaymentMethodImgContainer>
                <PaymentMethodSelectorText>
                  {selectedPaymentMethod
                    ? selectedPaymentMethod.label
                    : t('Select Payment Method')}
                </PaymentMethodSelectorText>
              </PaymentMethodSelectorContainerLeft>
            ) : null}
            <SelectorArrowContainer>
              {paymentMethodModalVisible ? (
                <ArrowUpSvg {...{width: 13, height: 13}} />
              ) : (
                <ArrowDownSvg {...{width: 13, height: 13}} />
              )}
            </SelectorArrowContainer>
          </PaymentMethodSelectorContainer>
        </SectionContainer>
        <SectionContainer>
          <SectionTitleContainer>
            <SectionTitle>{t('Partners')}</SectionTitle>
            {showOffersLoading ? (
              <SpinnerContainer>
                <ActivityIndicator
                  color={theme.dark ? Slate30 : ProgressBlue}
                />
              </SpinnerContainer>
            ) : null}
          </SectionTitleContainer>
          <PartnersText>
            {t(
              'Additional partner fees may apply. Prices below are indicative and the final amount you receive may differ based on partner exchange rates at the time of execution.',
            )}
          </PartnersText>
        </SectionContainer>
        <BottomSheetScrollView>
          {offers && !showOffersLoading
            ? Object.values(offers)
                .sort((a, b) =>
                  modalContext === 'buyCrypto'
                    ? parseFloat(b.amountReceiving || '0') -
                      parseFloat(a.amountReceiving || '0')
                    : parseFloat(b.amountReceivingAltFiatCurrency || '0') -
                      parseFloat(a.amountReceivingAltFiatCurrency || '0'),
                )
                .map((offer: CryptoOffer | SellCryptoOffer, index: number) => {
                  return offer.showOffer ? (
                    <BuyCryptoExpandibleCard
                      key={offer.key}
                      selected={
                        selectedOffer && selectedOffer.key === offer.key
                      }
                      onPress={() => {
                        if (offerSelectorOnDismiss && offer.fiatMoney) {
                          offerSelectorOnDismiss(offer);
                        }
                      }}>
                      <OfferRow>
                        <OfferRowLeft>
                          <OfferDataInfoContainer
                            testID={offer.key}
                            accessibilityLabel={'Provided By ' + offer.key}>
                            {offer.logo}
                          </OfferDataInfoContainer>
                          <OfferDataContainer>
                            <OfferDataCryptoAmount>
                              {offer.label}
                            </OfferDataCryptoAmount>
                            {index === 0 ? (
                              <BestOfferTagContainer>
                                <BestOfferTagText>
                                  {t('Our Best Offer')}
                                </BestOfferTagText>
                              </BestOfferTagContainer>
                            ) : null}
                          </OfferDataContainer>
                        </OfferRowLeft>
                        {offer.fiatMoney &&
                        !offer.errorMsg &&
                        !offer.outOfLimitMsg ? (
                          <OfferFeeDataContainer
                            onPress={() => {
                              expandCard(offer);
                            }}>
                            <OfferDataCryptoAmount>
                              {'≈ '}
                              {Number(offer.amountReceiving)
                                .toFixed(8)
                                .replace(/\.?0+$/, '')}{' '}
                              {modalContext === 'buyCrypto'
                                ? coin.toUpperCase()
                                : null}
                              {modalContext === 'sellCrypto'
                                ? offer.fiatCurrency.toUpperCase()
                                : null}
                            </OfferDataCryptoAmount>
                            <FeesInfoTextContainer>
                              <FeesInfoText>
                                {modalContext === 'buyCrypto'
                                  ? formatFiatAmount(
                                      Number((offer as CryptoOffer).amountCost),
                                      offer.fiatCurrency,
                                      {
                                        customPrecision: 'minimal',
                                      },
                                    )
                                  : null}
                                {modalContext === 'sellCrypto' ? (
                                  <>
                                    {Number(
                                      (offer as SellCryptoOffer).sellAmount,
                                    ).toFixed(6)}{' '}
                                    {coin.toUpperCase()}
                                  </>
                                ) : null}
                                {modalContext === 'buyCrypto'
                                  ? t(', fees apply')
                                  : null}
                              </FeesInfoText>
                              <SelectorArrowContainer>
                                {offer.expanded ? (
                                  <ArrowUpSvg {...{width: 11, height: 11}} />
                                ) : (
                                  <ArrowDownSvg {...{width: 11, height: 11}} />
                                )}
                              </SelectorArrowContainer>
                            </FeesInfoTextContainer>
                          </OfferFeeDataContainer>
                        ) : null}
                      </OfferRow>
                      {!offer.fiatMoney &&
                      !offer.errorMsg &&
                      !offer.outOfLimitMsg ? (
                        <SpinnerContainer>
                          <ActivityIndicator color={ProgressBlue} />
                        </SpinnerContainer>
                      ) : null}
                      {!offer.fiatMoney && offer.outOfLimitMsg ? (
                        <OfferDataContainer>
                          <OfferDataInfoLabel>
                            {offer.outOfLimitMsg}
                          </OfferDataInfoLabel>
                        </OfferDataContainer>
                      ) : null}
                      {!offer.fiatMoney && offer.errorMsg ? (
                        <OfferDataContainer>
                          <OfferDataInfoLabel>
                            {t('Error: ') + offer.errorMsg}
                          </OfferDataInfoLabel>
                        </OfferDataContainer>
                      ) : null}
                      {offer.fiatMoney &&
                      offer.fiatCurrency !== fiatCurrency ? (
                        <OfferDataWarningContainer>
                          <OfferDataWarningMsg>
                            {modalContext === 'buyCrypto'
                              ? t(
                                  "This exchange doesn't support purchases with , tap 'Buy' to continue paying in .",
                                  {
                                    altFiatCurrency: fiatCurrency,
                                    availableFiatCurrency: offer.fiatCurrency,
                                  },
                                )
                              : null}
                            {modalContext === 'sellCrypto'
                              ? t(
                                  "This exchange doesn't support sales with , tap 'Sell' to continue paying in .",
                                  {
                                    altFiatCurrency: fiatCurrency,
                                    availableFiatCurrency: offer.fiatCurrency,
                                  },
                                )
                              : null}
                          </OfferDataWarningMsg>
                        </OfferDataWarningContainer>
                      ) : null}

                      {offer.expanded ? (
                        <>
                          <ItemDivisor style={{marginTop: 20}} />
                          <OfferExpandibleItem>
                            <OfferDataInfoLabel>
                              {modalContext === 'buyCrypto'
                                ? t('Purchase Amount')
                                : null}
                              {modalContext === 'sellCrypto'
                                ? t('Sell Amount')
                                : null}
                            </OfferDataInfoLabel>
                            <OfferDataRightContainer>
                              <OfferDataInfoText>
                                {'≈ '}
                                {modalContext === 'buyCrypto'
                                  ? formatFiatAmount(
                                      Number((offer as CryptoOffer).buyAmount),
                                      offer.fiatCurrency,
                                    )
                                  : null}
                                {modalContext === 'sellCrypto' ? (
                                  <>
                                    {Number(
                                      (offer as SellCryptoOffer).sellAmount,
                                    ).toFixed(6)}{' '}
                                    {coin.toUpperCase()}
                                  </>
                                ) : null}
                              </OfferDataInfoText>
                              <OfferDataInfoTextSec>
                                {modalContext === 'buyCrypto' ? (
                                  <>
                                    {'≈ '}
                                    {Number(offer.amountReceiving).toFixed(
                                      6,
                                    )}{' '}
                                    {coin.toUpperCase()}
                                  </>
                                ) : null}
                                {modalContext === 'sellCrypto' ? (
                                  <>
                                    {'≈ '}
                                    {formatFiatAmount(
                                      Number(offer.amountReceiving) +
                                        Number(offer.fee),
                                      offer.fiatCurrency,
                                    )}
                                  </>
                                ) : null}
                              </OfferDataInfoTextSec>
                            </OfferDataRightContainer>
                          </OfferExpandibleItem>
                          <ItemDivisor />
                          <OfferExpandibleItem>
                            {modalContext === 'buyCrypto' ? (
                              <>
                                <OfferDataInfoLabel>
                                  {t('Fee')}
                                </OfferDataInfoLabel>
                                <OfferDataInfoText>
                                  {formatFiatAmount(
                                    Number(offer.fee),
                                    offer.fiatCurrency,
                                  )}
                                </OfferDataInfoText>
                              </>
                            ) : null}
                            {modalContext === 'sellCrypto' ? (
                              <>
                                <FeesInfoTextContainer>
                                  <OfferDataInfoLabel>
                                    {t('Exchange Fee')}
                                  </OfferDataInfoLabel>
                                  <TouchableOpacity
                                    onPress={() => {
                                      haptic('impactLight');
                                      switch ((offer as SellCryptoOffer).key) {
                                        case 'moonpay':
                                          dispatch(
                                            openUrlWithInAppBrowser(
                                              (user?.country &&
                                                isEuCountry(user.country)) ||
                                                isEuCountry(country)
                                                ? 'https://www.moonpay.com/legal/europe_pricing_disclosure'
                                                : 'https://www.moonpay.com/legal/pricing_disclosure',
                                            ),
                                          );
                                          break;
                                        case 'ramp':
                                          dispatch(
                                            openUrlWithInAppBrowser(
                                              'https://support.rampnetwork.com/en/articles/8957-what-are-the-fees-for-selling-crypto-at-ramp-network',
                                            ),
                                          );
                                          break;
                                        case 'simplex':
                                          dispatch(
                                            openUrlWithInAppBrowser(
                                              selectedPaymentMethod?.method ===
                                                'sepaBankTransfer'
                                                ? 'https://www.simplex.com/kb/what-fees-am-i-paying-for-withdrawing-funds-from-my-nuvei-account-via-sepa-or-sepa-instant'
                                                : 'https://www.simplex.com/kb/what-fees-do-you-charge-for-card-payments',
                                            ),
                                          );
                                          break;
                                      }
                                    }}
                                    style={{marginLeft: 0, marginTop: -3}}>
                                    <InfoSvg width={20} height={20} />
                                  </TouchableOpacity>
                                </FeesInfoTextContainer>
                                <OfferDataInfoText>
                                  {formatFiatAmount(
                                    Number(offer.fee),
                                    offer.fiatCurrency,
                                  )}
                                </OfferDataInfoText>
                              </>
                            ) : null}
                          </OfferExpandibleItem>
                          <ItemDivisor />
                          <OfferExpandibleItem>
                            {modalContext === 'buyCrypto' ? (
                              <>
                                <OfferDataInfoTotal>
                                  {t('TOTAL')}
                                </OfferDataInfoTotal>
                                <OfferDataInfoTotal>
                                  {formatFiatAmount(
                                    Number((offer as CryptoOffer).amountCost),
                                    offer.fiatCurrency,
                                    {
                                      customPrecision: 'minimal',
                                    },
                                  )}
                                </OfferDataInfoTotal>
                              </>
                            ) : null}
                            {modalContext === 'sellCrypto' ? (
                              <>
                                <OfferDataInfoTotal>
                                  {t('Receiving')}
                                </OfferDataInfoTotal>
                                <OfferDataInfoTotal>
                                  {formatFiatAmount(
                                    Number(offer.amountReceiving),
                                    offer.fiatCurrency,
                                    {
                                      customPrecision: 'minimal',
                                    },
                                  )}
                                </OfferDataInfoTotal>
                              </>
                            ) : null}
                          </OfferExpandibleItem>
                          {modalContext === 'buyCrypto' ? (
                            <BuyCryptoTerms
                              exchangeKey={offer.key}
                              paymentMethod={
                                selectedPaymentMethod as PaymentMethod
                              }
                              country={country}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </BuyCryptoExpandibleCard>
                  ) : null;
                })
            : null}
        </BottomSheetScrollView>
        {showArchaxBanner && <ArchaxFooter />}
      </SafeAreaView>

      <PaymentMethodsModal
        context={modalContext}
        isVisible={paymentMethodModalVisible}
        onPress={paymentMethod => {
          offers = undefined;
          onPaymentMethodSelected(paymentMethod);
          setPaymentMethodModalVisible(false);
          setUpdateView(Math.random());
          dispatch(
            Analytics.track(
              modalContext === 'buyCrypto'
                ? 'Buy - Clicked Payment Method'
                : 'Sell - Clicked Withdrawal Method',
              {
                paymentMethod: paymentMethod?.method || '',
              },
            ),
          );
        }}
        onBackdropPress={() => setPaymentMethodModalVisible(false)}
        selectedPaymentMethod={selectedPaymentMethod}
        coin={selectedWallet?.currencyAbbreviation}
        chain={selectedWallet?.chain}
        currency={fiatCurrency}
        preSetPartner={preSetPartner}
      />
    </>
  );
};

export default OfferSelectorModal;
