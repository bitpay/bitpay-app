import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView as RNSafeAreaView,
  StyleSheet,
  Text,
  View,
  ViewProps,
  TextProps,
} from 'react-native';
import {useTheme} from '../../../../contexts';
import CloseModal from '../../../../../assets/img/close-modal-icon.svg';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  Action,
  White,
  Black,
  LightBlack,
  NeutralSlate,
  SlateDark,
  ProgressBlue,
  Slate30,
  Success25,
} from '../../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '../../../../components/base/TouchableOpacity';
import {SwapCryptoOffer} from './SwapCryptoOfferSelector';
import {ItemDivisor} from '../../buy-crypto/styled/BuyCryptoCard';
import {
  BaseText,
  H4,
  H5,
  H7,
  Small,
  TextAlign,
} from '../../../../components/styled/Text';
import ArrowDownSvg from '../../../../../assets/img/chevron-down.svg';
import ArrowUpSvg from '../../../../../assets/img/chevron-up.svg';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {SwapCryptoExchangeKey} from '../utils/swap-crypto-utils';

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
  swapCryptoExpandibleCard: {
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
  offerDataInfoText: {
    fontSize: 16,
  },
  offerDataInfoTextSec: {
    marginTop: 10,
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
  swapCryptoOfferSelectorModalContainer: {
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

const CloseModalButton: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.closeModalButton, style]} {...rest} />;

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

const SwapCryptoExpandibleCard: React.FC<
  TouchableOpacityProps & {selected?: boolean}
> = ({style, selected, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.swapCryptoExpandibleCard,
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
            ? '#ECEFFD'
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

const OfferFeeDataContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => (
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

const OfferExpandibleItem: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerExpandibleItem, style]} {...rest} />
);

const OfferDataRightContainer: React.FC<ViewProps> = ({style, ...rest}) => (
  <View style={[styles.offerDataRightContainer, style]} {...rest} />
);

export const SwapCryptoOfferSelectorModalContainer: React.FC<ViewProps> = ({
  style,
  ...rest
}) => (
  <View
    style={[styles.swapCryptoOfferSelectorModalContainer, style]}
    {...rest}
  />
);

export const WalletSelector: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => {
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

interface SwapCryptoOfferSelectorModalScreenProps {
  modalTitle?: string;
  offers?: {
    [key in SwapCryptoExchangeKey]: SwapCryptoOffer;
  };
  selectedWalletFrom: Wallet;
  selectedWalletTo: Wallet;
  amountFrom: number;
  showOffersLoading?: boolean;
  selectedOffer?: SwapCryptoOffer;
  country?: string;
  preSetPartner?: SwapCryptoExchangeKey;
  offerSelectorOnDismiss?: (
    selectedOffer?: SwapCryptoOffer | undefined,
  ) => void;
}

const SwapCryptoOfferSelectorModal: React.FC<
  SwapCryptoOfferSelectorModalScreenProps
> = ({
  modalTitle,
  offers,
  selectedWalletFrom,
  selectedWalletTo,
  amountFrom,
  showOffersLoading,
  selectedOffer,
  country,
  preSetPartner,
  offerSelectorOnDismiss,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();

  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>(
    {},
  );
  const [forceRerender, setForceRerender] = useState(0);
  useEffect(() => {
    setForceRerender(f => f + 1);
  }, [amountFrom, selectedOffer?.amountReceiving]);

  const expandCard = (offer: SwapCryptoOffer) => {
    const key = offer.key;
    if (!offer.amountReceiving) {
      return;
    }
    if (!offers?.[key]) {
      return;
    }
    setExpandedByKey(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
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
                .sort(
                  (a, b) =>
                    parseFloat(b.amountReceiving || '0') -
                    parseFloat(a.amountReceiving || '0'),
                )
                .map((offer: SwapCryptoOffer, index: number) => {
                  return offer.showOffer ? (
                    <SwapCryptoExpandibleCard
                      key={offer.key}
                      selected={
                        selectedOffer && selectedOffer.key === offer.key
                      }
                      onPress={() => {
                        if (offerSelectorOnDismiss && offer.amountReceiving) {
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
                              {offer.name}
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
                        {offer.amountReceiving &&
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
                              {selectedWalletTo.currencyAbbreviation.toUpperCase()}
                            </OfferDataCryptoAmount>
                            <FeesInfoTextContainer>
                              <FeesInfoText>
                                {amountFrom ? (
                                  <>
                                    {Number(amountFrom).toFixed(6)}{' '}
                                    {selectedWalletFrom.currencyAbbreviation.toUpperCase()}
                                  </>
                                ) : null}
                              </FeesInfoText>
                              <SelectorArrowContainer>
                                {expandedByKey[offer.key] ? (
                                  <ArrowUpSvg {...{width: 11, height: 11}} />
                                ) : (
                                  <ArrowDownSvg {...{width: 11, height: 11}} />
                                )}
                              </SelectorArrowContainer>
                            </FeesInfoTextContainer>
                          </OfferFeeDataContainer>
                        ) : null}
                      </OfferRow>
                      {!offer.amountReceiving &&
                      !offer.errorMsg &&
                      !offer.outOfLimitMsg ? (
                        <SpinnerContainer>
                          <ActivityIndicator color={ProgressBlue} />
                        </SpinnerContainer>
                      ) : null}
                      {!offer.amountReceiving && offer.outOfLimitMsg ? (
                        <OfferDataContainer>
                          <OfferDataInfoLabel>
                            {offer.outOfLimitMsg}
                          </OfferDataInfoLabel>
                        </OfferDataContainer>
                      ) : null}
                      {!offer.amountReceiving && offer.errorMsg ? (
                        <OfferDataContainer>
                          <OfferDataInfoLabel>
                            {t('Error: ') + offer.errorMsg}
                          </OfferDataInfoLabel>
                        </OfferDataContainer>
                      ) : null}

                      {expandedByKey[offer.key] ? (
                        <>
                          <ItemDivisor style={{marginTop: 20}} />
                          <OfferExpandibleItem>
                            <OfferDataInfoLabel>
                              {t('Estimated\nExchange Rate')}
                            </OfferDataInfoLabel>
                            <OfferDataRightContainer>
                              <OfferDataInfoText>
                                {'1 ' +
                                  selectedWalletFrom.currencyAbbreviation.toUpperCase() +
                                  ' ~ ' +
                                  offer.rate +
                                  ' ' +
                                  selectedWalletTo.currencyAbbreviation.toUpperCase()}
                              </OfferDataInfoText>
                              {offer.rateFiat ? (
                                <OfferDataInfoTextSec>
                                  {'~ ' + offer.rateFiat}
                                </OfferDataInfoTextSec>
                              ) : null}
                            </OfferDataRightContainer>
                          </OfferExpandibleItem>
                        </>
                      ) : null}
                    </SwapCryptoExpandibleCard>
                  ) : null;
                })
            : null}
        </BottomSheetScrollView>
      </SafeAreaView>
    </>
  );
};

export default SwapCryptoOfferSelectorModal;
