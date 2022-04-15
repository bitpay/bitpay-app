import React, {memo} from 'react';
import styled from 'styled-components/native';
import {Column, Setting} from '../styled/Containers';
import {H7, Smallest} from '../styled/Text';
import AngleRight from '../../../assets/img/angle-right.svg';
import ContactIcon from '../../navigation/tabs/contacts/components/ContactIcon';
import {SlateDark, White} from '../../styles/colors';
import {ContactRowProps} from './ContactRow';

const ContactColumn = styled(Column)`
  margin-left: 25px;
`;

const ContactImageContainer = styled.View`
  height: 30px;
  width: 30px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

const RowContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

const ContactsSubtext = styled(Smallest)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

interface Props {
  contact: ContactRowProps;
  onPress: () => void;
}

const SettingsContactRow = ({contact, onPress}: Props) => {
  const {coin, name, email, address} = contact;
  return (
    <Setting onPress={onPress}>
      <RowContainer>
        <ContactImageContainer>
          <ContactIcon name={name} coin={coin} size={40} />
        </ContactImageContainer>
        <ContactColumn>
          <H7 medium={true}>{name}</H7>
          <ContactsSubtext>{email ? email : address}</ContactsSubtext>
        </ContactColumn>
        <AngleRight />
      </RowContainer>
    </Setting>
  );
};

export default memo(SettingsContactRow);
