import React, {useEffect, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
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
import {TouchableOpacity} from '../../../../components/base/TouchableOpacity';
import {SwapCryptoOffer} from './SwapCryptoOfferSelector';
import {ActivityIndicator} from 'react-native';
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

const SafeAreaView = styled.SafeAreaView`
  flex: 1;
`;

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
  margin-left: 10px;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CloseModalButtonContainer = styled.View`
  position: absolute;
  left: 0;
`;

const CloseModalButton = styled(TouchableOpacity)`
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const SectionContainer = styled.View`
  margin: 10px 16px 10px 16px;
`;

const SectionTitleContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 10px;
`;

const SectionTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  margin-right: 10px;
`;

const SelectorArrowContainer = styled.View`
  margin-left: 10px;
`;

const PartnersText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 13px;
  line-height: 20px;
`;

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const SwapCryptoExpandibleCard = styled(TouchableOpacity)<{selected?: boolean}>`
  border: 1px solid
    ${({theme: {dark}, selected}) =>
      dark ? (selected ? Action : SlateDark) : selected ? Action : '#e6e8ec'};
  background-color: ${({theme: {dark}, selected}) =>
    dark
      ? selected
        ? '#2240C440'
        : 'transparent'
      : selected
      ? '#ECEFFD'
      : 'transparent'};
  border-radius: 8px;
  margin: 20px 15px 0px 15px;
  padding: 18px 14px;
`;

const OfferDataContainer = styled.View`
  display: flex;
  flex-direction: column;
`;

const OfferFeeDataContainer = styled(TouchableOpacity)`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const OfferRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const OfferRowLeft = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
`;

const BestOfferTagContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 5px;
`;

const BestOfferTagText = styled(Small)`
  color: ${({theme: {dark}}) => (dark ? Success25 : '#004D27')};
`;

const FeesInfoTextContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const FeesInfoText = styled(Small)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataCryptoAmount = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const OfferDataInfoContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 10px;
  width: 25px;
  height: 25px;
`;

const OfferDataInfoLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSec = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 10px;
`;

const OfferExpandibleItem = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const OfferDataRightContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

export const SwapCryptoOfferSelectorModalContainer = styled.View`
  margin: 8px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const WalletSelector = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  height: 36px;
  border-radius: 27.5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  min-width: 146px;
`;

export const WalletSelectorLeft = styled.View`
  display: flex;
  justify-content: left;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorRight = styled.View`
  display: flex;
  justify-content: right;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorName = styled.Text`
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 8px;
`;

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
