import React, {ReactElement, memo} from 'react';
import {BaseText, ListItemSubText} from '../styled/Text';
import styled from 'styled-components/native';
import {ScreenGutter} from '../styled/Containers';
import {useTranslation} from 'react-i18next';
import {GetContactName} from '../../store/wallet/effects/transactions/transactions';
import {ContactRowProps} from './ContactRow';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {Dimensions} from 'react-native';

const {width} = Dimensions.get('window');

const TransactionContainer = styled(TouchableOpacity)<{withCheckBox?: boolean}>`
  flex-direction: row;
  padding: 10px ${ScreenGutter};
  justify-content: space-between;
  width: ${width - 50}px;
  width: ${({withCheckBox}) => (withCheckBox ? `${width - 80}px` : '100%')};
`;

const IconContainer = styled.View`
  margin-right: 8px;
`;

const Description = styled(BaseText)`
  overflow: hidden;
  font-size: 16px;
  max-width: 150px;
`;

const Creator = styled(ListItemSubText)`
  overflow: hidden;
  max-width: 150px;
`;

const TailContainer = styled.View`
  margin-left: auto;
  display: flex;
  justify-content: center;
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
  tokenAddress?: string;
  contactList?: ContactRowProps[];
  chain?: string;
  withCheckBox?: boolean;
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
  tokenAddress,
  contactList,
  chain,
  withCheckBox,
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
    const contactName = GetContactName(
      toAddress,
      tokenAddress,
      chain,
      contactList,
    );
    if (contactName) {
      label = t('Sending to contactName', {contactName});
      labelLines = 2;
    }
  }

  return (
    <TransactionContainer
      withCheckBox={withCheckBox}
      onPress={onPressTransaction}>
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
