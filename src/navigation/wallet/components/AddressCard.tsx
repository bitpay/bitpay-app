import React from 'react';
import styled from 'styled-components/native';
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

interface AddressCardComponentProps {
  recipient: TxDetailsSendingTo;
}

const ListCard = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  margin: 6px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

const RecipientAmount = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
`;

const ContactImageContainer = styled.View`
  height: 20px;
  width: 20px;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
  margin-right: 8px;
`;

const AddressCard: React.FC<AddressCardComponentProps> = ({recipient}) => {
  return (
    <ListCard activeOpacity={ActiveOpacity} style={{height: 59, margin: 0}}>
      <Row style={{alignItems: 'center', justifyContent: 'space-between'}}>
        <Row style={{alignItems: 'center', justifyContent: 'flex-start'}}>
          <ContactImageContainer>
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
          </ContactImageContainer>
          <H7
            style={{marginLeft: 8}}
            numberOfLines={1}
            ellipsizeMode={'middle'}>
            {recipient.recipientAddress}
          </H7>
        </Row>
        <Column style={{alignItems: 'flex-end'}}>
          <RecipientAmount>{recipient.recipientAmountStr}</RecipientAmount>
          {recipient.recipientAltAmountStr ? (
            <H7>{recipient.recipientAltAmountStr}</H7>
          ) : null}
        </Column>
      </Row>
    </ListCard>
  );
};

export default AddressCard;
