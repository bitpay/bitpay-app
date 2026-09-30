import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../../contexts';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 20,
  },
  header: {
    marginTop: 16,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  cardRow: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardTexts: {
    flex: 1,
  },
  cardLabel: {
    fontWeight: '500',
    fontSize: 16,
  },
  cardSubLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  addCardRow: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  addCardText: {
    color: Action,
    fontWeight: '500',
  },
});

// Plain content — rendered inside the checkout screen's single shared
// WebView Modal (see MoonpayBuyEmbeddedCheckout.tsx) rather than owning its
// own Modal/SheetModal. Two react-native-modal instances presented at the
// same time (one for this list, one for the add-card frame) don't reliably
// stack on iOS, so both states share one modal and only swap content.
function MoonpaySelectCardModal({
  cards,
  selectedCardId,
  onSelectCard,
  onAddCard,
}: MoonpaySelectCardModalProps) {
  const {t} = useTranslation();
  const {dark} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: dark ? Black : White}]}>
      <ModalHeaderText style={styles.header}>
        {t('MoonPay linked cards')}
      </ModalHeaderText>
      <ScrollView style={styles.scrollView}>
        {cards.map(card => {
          const disabled = !card.availability?.active;
          const selected = card.id === selectedCardId;
          const unavailableReason = getMoonpayCardUnavailableReason(
            card.availability?.reasons?.[0],
          );
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardRow,
                {
                  borderColor: selected ? Action : dark ? SlateDark : '#e6e8ec',
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              onPress={() => !disabled && onSelectCard(card)}>
              <View
                style={[
                  styles.cardIconCircle,
                  {backgroundColor: dark ? LightBlack : '#f0f0f0'},
                ]}>
                <PaymentMethodIcon
                  paymentMethodId={
                    card.cardType === 'debit' ? 'debitCard' : 'creditCard'
                  }
                  width={20}
                  height={20}
                  iconOnly={true}
                />
              </View>
              <View style={styles.cardTexts}>
                <BaseText
                  style={[styles.cardLabel, {color: dark ? White : Black}]}>
                  {getMoonpayCardBrandLabel(card.brand) + ' •••• ' + card.last4}
                </BaseText>
                <BaseText
                  style={[
                    styles.cardSubLabel,
                    {color: dark ? Slate30 : SlateDark},
                  ]}>
                  {disabled && unavailableReason
                    ? unavailableReason
                    : t('Expires') +
                      ' ' +
                      card.expirationMonth +
                      '/' +
                      card.expirationYear}
                </BaseText>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={[
          styles.addCardRow,
          {borderTopColor: dark ? '#282f37' : '#e6e8ec'},
        ]}
        onPress={onAddCard}>
        <BaseText style={styles.addCardText}>{t('Add a new card')}</BaseText>
      </TouchableOpacity>
    </View>
  );
}

export default MoonpaySelectCardModal;
