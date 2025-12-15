import React, {useEffect, useState} from 'react';
import styled, {useTheme} from 'styled-components/native';
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
import {ActivityIndicator, ScrollView} from 'react-native';
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

const PaymentMethodSelectorContainer = styled(TouchableOpacity)`
  border: 1px solid ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  height: 48px;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const PaymentMethodSelectorContainerLeft = styled(TouchableOpacity)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const PaymentMethodImgContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 48px;
  margin-right: 10px;
`;

const PaymentMethodImg = styled.View`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PaymentMethodSelectorText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 13px;
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

const BuyCryptoExpandibleCard = styled(TouchableOpacity)<{selected?: boolean}>`
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
const BestOfferTag = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? '#2FCFA4' : '#cbf3e8')};
  border-radius: 50px;
  height: 25px;
  padding: 5px 10px;
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

const OfferDataWarningContainer = styled.View`
  max-width: 85%;
  margin-top: 20px;
`;

const OfferDataWarningMsg = styled(BaseText)`
  color: #df5264;
  margin-right: 10px;
  font-size: 12;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSec = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 10px;
`;

const OfferDataInfoTotal = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: bold;
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

export const OfferSelectorModalContainer = styled.View`
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

                      {offer.expanded || showArchaxBanner ? (
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
                      {showArchaxBanner && (
                        <TermsContainerOffer>
                          <TermsText>
                            {t(
                              'The final crypto amount you receive when the transaction is complete may differ because it is based on the exchange rates of the providers.',
                            )}
                          </TermsText>
                        </TermsContainerOffer>
                      )}
                    </BuyCryptoExpandibleCard>
                  ) : null;
                })
            : null}
          {showArchaxBanner && <ArchaxFooter />}
        </BottomSheetScrollView>
      </SafeAreaView>

      <PaymentMethodsModal
        context={modalContext}
        isVisible={paymentMethodModalVisible}
        onPress={paymentMethod => {
          offers = undefined; // TODO: reload offers based on payment method
          onPaymentMethodSelected(paymentMethod);
          setPaymentMethodModalVisible(false);
          setUpdateView(Math.random());
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
