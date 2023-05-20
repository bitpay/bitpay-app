import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
import {GetContactName} from '../../store/wallet/effects/transactions/transactions';
import {ContactRowProps} from './ContactRow';

const TransactionContainer = styled.TouchableOpacity`
  flex-direction: row;
  padding: 10px ${ScreenGutter};
  justify-content: center;
  align-items: center;
`;

const IconContainer = styled.View`
  margin-right: 8px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  margin-right: 175px;
  font-size: 16px;
`;

const Creator = styled(ListItemSubText)`
  overflow: hidden;
  margin-right: 175px;
`;

const TailContainer = styled.View`
  margin-left: auto;
`;

const HeadContainer = styled.View``;

const Value = styled(BaseText)`
  text-align: right;
  font-weight: 700;
  font-size: 16px;
`;

interface Props {
  icon?: ReactElement;
  creator?: string;
  value?: string;
  time?: string;
  message?: string;
  onPressTransaction?: () => void;
  hideIcon?: boolean;
  recipientCount?: number;
  toAddress?: string;
  contactList?: ContactRowProps[];
  chain?: string;
}

const TransactionProposalRow = ({
  icon,
  creator,
  value,
  time,
  message,
  onPressTransaction,
  hideIcon,
  recipientCount,
  toAddress,
  contactList,
  chain,
}: Props) => {
  const {t} = useTranslation();
  let label: string = t('Sending');
  let labelLines: number = 1;

  if (recipientCount && recipientCount > 1) {
    label = t('Sending to multiple recipients (recipientCount)', {
      recipientCount,
    });
    labelLines = 2;
  } else if (toAddress && chain && contactList) {
    const contactName = GetContactName(toAddress, chain, contactList);
    if (contactName) {
      label = t('Sending to contactName', {contactName});
      labelLines = 2;
    }
  }

  return (
    <TransactionContainer onPress={onPressTransaction}>
      {icon && !hideIcon && <IconContainer>{icon}</IconContainer>}

      <HeadContainer>
        <Description
          numberOfLines={message ? 2 : labelLines}
          ellipsizeMode={'tail'}>
          {message ? message : label}
        </Description>
        {creator && (
          <Creator numberOfLines={1} ellipsizeMode={'tail'}>
            {t('Created by ', {creator})}
          </Creator>
        )}
      </HeadContainer>

      <TailContainer>
        {value && <Value>{value}</Value>}
        {time && <ListItemSubText textAlign={'right'}>{time}</ListItemSubText>}
      </TailContainer>
    </TransactionContainer>
  );
};

export default memo(TransactionProposalRow);
