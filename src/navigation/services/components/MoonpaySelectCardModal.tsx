import React from 'react';
import {ScrollView} from 'react-native';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {BaseText} from '../../../components/styled/Text';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import PaymentMethodIcon from '../../../components/icons/payment-methods/payment-methods';
import {ModalHeaderText} from '../buy-crypto/styled/BuyCryptoModals';
import {
  Action,
  Black,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../styles/colors';
import {
  getMoonpayCardBrandLabel,
  getMoonpayCardUnavailableReason,
} from '../buy-crypto/utils/moonpay-utils';
import {MoonpayEmbeddedCardPaymentMethod} from '../../../store/buy-crypto/buy-crypto.models';

interface MoonpaySelectCardModalProps {
  cards: MoonpayEmbeddedCardPaymentMethod[];
  selectedCardId?: string;
  onSelectCard: (card: MoonpayEmbeddedCardPaymentMethod) => void;
  onAddCard: () => void;
}

// Plain content — rendered inside the checkout screen's single shared
// WebView Modal (see MoonpayBuyEmbeddedCheckout.tsx) rather than owning its
// own Modal/SheetModal. Two react-native-modal instances presented at the
// same time (one for this list, one for the add-card frame) don't reliably
// stack on iOS, so both states share one modal and only swap content.
const Container = styled.View`
  flex: 1;
  padding: 0 16px 16px 20px;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const CardRow = styled(TouchableOpacity)<{
  selected?: boolean;
  disabled?: boolean;
}>`
  border: 1px solid
    ${({theme: {dark}, selected}) =>
      selected ? Action : dark ? SlateDark : '#e6e8ec'};
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  opacity: ${({disabled}) => (disabled ? 0.5 : 1)};
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const CardIconCircle = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#f0f0f0')};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
`;

const CardTexts = styled.View`
  flex: 1;
`;

const CardLabel = styled(BaseText)`
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
`;

const CardSubLabel = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 13px;
  margin-top: 4px;
`;

const AddCardRow = styled(TouchableOpacity)`
  padding: 20px 10px;
  margin-bottom: 16px;
  align-items: center;
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) => (dark ? '#282f37' : '#e6e8ec')};
`;

const AddCardText = styled(BaseText)`
  color: ${Action};
  font-weight: 500;
`;

function MoonpaySelectCardModal({
  cards,
  selectedCardId,
  onSelectCard,
  onAddCard,
}: MoonpaySelectCardModalProps) {
  const {t} = useTranslation();

  return (
    <Container>
      <ModalHeaderText style={{marginTop: 16, marginBottom: 12}}>
        {t('MoonPay linked cards')}
      </ModalHeaderText>
      <ScrollView style={{flex: 1}}>
        {cards.map(card => {
          const disabled = !card.availability?.active;
          const unavailableReason = getMoonpayCardUnavailableReason(
            card.availability?.reasons?.[0],
          );
          return (
            <CardRow
              key={card.id}
              selected={card.id === selectedCardId}
              disabled={disabled}
              onPress={() => !disabled && onSelectCard(card)}>
              <CardIconCircle>
                <PaymentMethodIcon
                  paymentMethodId={
                    card.cardType === 'debit' ? 'debitCard' : 'creditCard'
                  }
                  width={20}
                  height={20}
                  iconOnly={true}
                />
              </CardIconCircle>
              <CardTexts>
                <CardLabel>
                  {getMoonpayCardBrandLabel(card.brand) + ' •••• ' + card.last4}
                </CardLabel>
                <CardSubLabel>
                  {disabled && unavailableReason
                    ? unavailableReason
                    : t('Expires') +
                      ' ' +
                      card.expirationMonth +
                      '/' +
                      card.expirationYear}
                </CardSubLabel>
              </CardTexts>
            </CardRow>
          );
        })}
      </ScrollView>
      <AddCardRow onPress={onAddCard}>
        <AddCardText>{t('Add a new card')}</AddCardText>
      </AddCardRow>
    </Container>
  );
}

export default MoonpaySelectCardModal;
