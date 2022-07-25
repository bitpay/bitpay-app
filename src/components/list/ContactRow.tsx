import React, {memo} from 'react';
import styled from 'styled-components/native';
import {useTheme} from 'styled-components/native';
import {Column} from '../styled/Containers';
import {H5, SubText} from '../styled/Text';
import AngleRight from '../../../assets/img/angle-right.svg';
import ContactIcon from '../../navigation/tabs/contacts/components/ContactIcon';

const ContactContainer = styled.TouchableHighlight`
  padding: 20px 0;
`;

const ContactColumn = styled(Column)`
  margin-left: 18px;
`;

const ContactImageContainer = styled.View`
  height: 40px;
  width: 40px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
`;

const RowContainer = styled.View`
  flex-direction: row;
  align-items: center;
`;

export interface ContactRowProps {
  address: string;
  coin: string;
  network: string;
  name: string;
  tag?: number;
  email?: string;
}

interface Props {
  contact: ContactRowProps;
  onPress: () => void;
}

const ContactRow = ({contact, onPress}: Props) => {
  const theme = useTheme();
  const underlayColor = theme.dark ? '#121212' : '#fbfbff';
  const {coin, name, email} = contact;
  return (
    <ContactContainer underlayColor={underlayColor} onPress={onPress}>
      <RowContainer>
        <ContactImageContainer>
          <ContactIcon name={name} coin={coin} />
        </ContactImageContainer>
        <ContactColumn>
          <H5>{name}</H5>
          {email ? <SubText>{email}</SubText> : null}
        </ContactColumn>
        <AngleRight />
      </RowContainer>
    </ContactContainer>
  );
};

export default memo(ContactRow);
