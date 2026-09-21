import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {BaseText, H7} from '../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../styles/colors';
import {
  ActiveOpacity,
  Column,
  Row,
} from '../../../components/styled/Containers';
import {TxDetailsSendingTo} from '../../../store/wallet/wallet.models';
import {CurrencyImage} from '../../../components/currency-image/CurrencyImage';
import ContactIcon from '../../tabs/contacts/components/ContactIcon';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';

interface AddressCardComponentProps {
  recipient: TxDetailsSendingTo;
}

const styles = StyleSheet.create({
  listCard: {
    borderRadius: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    height: 75,
  },
  recipientAmount: {
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
  },
  contactImageContainer: {
    height: 20,
    width: 20,
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
});

const ListCard: React.FC<TouchableOpacityProps> = ({style, ...props}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.listCard,
        {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
        style,
      ]}
      {...props}
    />
  );
};

const AddressCard: React.FC<AddressCardComponentProps> = ({recipient}) => {
  return (
    <ListCard activeOpacity={ActiveOpacity} style={{height: 59, margin: 0}}>
      <Row style={{alignItems: 'center', justifyContent: 'space-between'}}>
        <Row style={{alignItems: 'center', justifyContent: 'flex-start'}}>
          <View style={styles.contactImageContainer}>
            {recipient.recipientType === 'contact' ? (
              <ContactIcon
                name={recipient.recipientName || recipient.recipientAddress}
                coin={recipient.recipientCoin!}
                chain={recipient.recipientChain || ''}
                tokenAddress={recipient.recipientTokenAddress}
                size={30}
              />
            ) : (
              <CurrencyImage img={recipient.img} size={30} />
            )}
          </View>
          <H7
            style={{marginLeft: 8}}
            numberOfLines={1}
            ellipsizeMode={'middle'}>
            {recipient.recipientAddress}
          </H7>
        </Row>
        <Column style={{alignItems: 'flex-end'}}>
          <BaseText style={styles.recipientAmount}>
            {recipient.recipientAmountStr}
          </BaseText>
          {recipient.recipientAltAmountStr ? (
            <H7>{recipient.recipientAltAmountStr}</H7>
          ) : null}
        </Column>
      </Row>
    </ListCard>
  );
};

export default AddressCard;
